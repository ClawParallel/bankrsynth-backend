const cron = require("node-cron")
const runAutonomousAgent = require("./agent/autonomousAgent")

cron.schedule("0 * * * *", async () => {

console.log("Running scheduled deploy")

await runAutonomousAgent()

})