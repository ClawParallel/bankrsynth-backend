const cron = require("node-cron")
const runAgent = require("./botchanAgent")

cron.schedule("*/5 * * * *", async () => {

  console.log("BankrSynth Botchan agent running")

  runAgent()

})