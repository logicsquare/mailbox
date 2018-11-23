const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const logger = require("morgan")
// const helmet = require('helmet');
const cors = require("cors")

const config = require("./config.js")[process.env.NODE_ENV || "development"]

const routes = require("./routes.js")

const app = express()

// For Prod usage (SECURITY)
// app.use(helmet())
// app.use(cors())

mongoose.Promise = global.Promise
mongoose.connect(config.database, { useNewUrlParser: true })

if (process.env.NODE_ENV === undefined || !process.env.NODE_ENV.startsWith("test")) {
  app.use(logger("dev"))
}
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))

app.use("/api/v1", routes)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found")
  err.status = 404
  next(err)
})

// log errors in development
app.use((err, req, res, next) => {
  if (req.app.get("env") === "development") console.error(err.stack)
  next(err)
})

// main error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.send(err.stack)
})


const port = process.env.PORT || "3000"
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
