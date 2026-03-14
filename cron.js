const cron = require("node-cron")

const runAutonomousAgent = require("./agent/autonomousAgent")
const runNetBrain = require("./agent/netBrain")

// =============================
// TOKEN DEPLOY AGENT
// setiap 1 jam
// =============================

cron.schedule("0 * * * *", async () => {

try {

console.log("Running scheduled deploy")

await runAutonomousAgent()

} catch (err) {

console.error("Autonomous Agent error:", err.message)

}

})


// =============================
// NET PROTOCOL COMMUNITY AGENT
// setiap 2 menit
// =============================

cron.schedule("*/2 * * * *", async () => {

try {

console.log("BankrSynth Net Brain scanning feed")

await runNetBrain()

} catch (err) {

console.error("Net Brain error:", err.message)

}

})