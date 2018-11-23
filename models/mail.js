const mongoose = require("mongoose")
const cuid = require("cuid")

const config = require("../config")[process.env.NODE_ENV || "development"]

const MailSchema = new mongoose.Schema({
  mgMsgId: { type: String, required: true, default: null },
  from: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String },
  html: { type: String, required: true },
  replyToMsgId: { type: String, default: null },
  threadId: { type: String, default: cuid },
  isQueuedWithMg: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  isOpened: { type: Boolean },
  openedAt: { type: Date }
})

MailSchema.set("toJSON", { virtuals: true })
MailSchema.set("toObject", { virtuals: true })


module.exports = mongoose.model("Mail", MailSchema)
