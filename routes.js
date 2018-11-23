const express = require("express")
// const mongoose = require("mongoose")
// const cuid = require("cuid")
const Redis = require("ioredis")
const router = express.Router()

const Mail = require("./models/mail")

const config = require("./config.js")[process.env.NODE_ENV || "development"]

// eslint-disable-next-line import/order
const mailgun = require("mailgun-js")({ apiKey: config.email.apiKey, domain: config.email.domain })
const pub = new Redis(config.redisConnString)

router.post("/sendmail", async (req, res) => {
  const data = {}
  try {
    data.from = `Recruitech LS<${config.email.from}>`
    data.to = req.body.to
    data.subject = req.body.subject // might be overriden below (in case of replying)
    data.html = req.body.html || req.body.text || req.body.content || req.body.body
    data.isOpened = false
    if (req.body.replyToMsgId !== undefined) { // exisiting thread (replying)
      // eslint-disable-next-line newline-per-chained-call
      const { threadId, subject } = await Mail.findOne({ mgMsgId: req.body.replyToMsgId }).select("threadId subject").lean().exec()
      data.replyToMsgId = req.body.replyToMsgId
      data.subject = (subject.startsWith("Re:"))
        ? subject
        : `Re: ${subject}`
      data["h:In-Reply-To"] = req.body.replyToMsgId // for mailing only
      data.threadId = threadId // for DB only
    }
    try {
      data["h:Reply-To"] = config.email.from // for mailing only
      data["o:tracking-opens"] = "yes" // for mailing only
      const sentMail = await mailgun.messages().send(data)
      data.isQueuedWithMg = true
      data.mgMsgId = sentMail.id
    } catch (mgErr) {
      console.log("====> MailGun err:", mgErr)
      data.isQueuedWithMg = false
      data.mgMsgId = null
    }
    await Mail.create(data)
    return res.json({ error: false })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: true, reason: error.message })
  }
})

router.post("/replyreceived", async (req, res) => {
  const { headers, body } = req
  // console.log("***********", headers, body);
  if (!mailgun.validateWebhook(body.timestamp, body.token, body.signature)) {
    console.error("ERR: Request came, but not from Mailgun")
    return res.status(406).send({ error: { message: "Invalid signature. Are you even Mailgun?" } })
  }
  const data = {}
  data.replyToMsgId = body["In-Reply-To"]
  if (data.replyToMsgId === undefined) return res.status(406).send({ error: { message: "Not a Reply!" } })
  data.mgMsgId = body["Message-Id"]
  data.from = body.from
  data.subject = body.subject
  data.html = body["body-html"]
  try {
    // eslint-disable-next-line newline-per-chained-call
    const { threadId, from } = await Mail.findOne({ mgMsgId: data.replyToMsgId }).select("threadId from").lean().exec()
    data.to = from
    data.threadId = threadId
    await Mail.create(data)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: true, reason: error.message })
  }
  return res.json({ headers, body })
})

router.post("/webhook/opened", async (req, res) => {
  const { headers, body } = req
  // console.log("***********", headers, body);
  if (!mailgun.validateWebhook(body.signature.timestamp, body.signature.token, body.signature.signature)) {
    console.error("ERR: Request came, but not from Mailgun")
    return res.status(406).send({ error: { message: "Invalid signature. Are you even Mailgun?" } })
  }
  try {
    const data = body["event-data"]
    const mgMsgId = `<${data.message.headers["message-id"]}>`
    await Mail.updateOne(
      { mgMsgId },
      { isOpened: true, openedAt: Math.ceil(body.signature.timestamp) * 1000 }
    )
    pub.publish("mail-opened", JSON.stringify({
      mgMsgId,
      openedAt: Math.ceil(body.signature.timestamp) * 1000
    }))
    return res.send("OK")
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: true, reason: error.message })
  }
})


router.get("/messages", async (req, res) => {
  const threads = await Mail.aggregate([
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$threadId",
        messages: { $push: "$$ROOT" },
        messagesCount: { $sum: 1 }
      }
    }
  ]).exec()
  return res.json({ error: false, threads })
})

module.exports = router
