const cron = require("node-cron")

// ===== EXISTING AGENT =====
const runAutonomousAgent = require("./agent/autonomousAgent")

// ===== NEW NET AGENT =====
const runNetBrain = require("./agent/netBrain")

//////////////////////////////////////////////////
// AUTONOMOUS DEPLOY (1 HOUR)
//////////////////////////////////////////////////

cron.schedule("0 * * * *", async () => {

console.log("Running scheduled deploy")

try{

await runAutonomousAgent()

}catch(err){

console.error("Autonomous deploy error:", err)

}

})

//////////////////////////////////////////////////
// NET COMMUNITY AGENT (EVERY 2 MINUTES)
//////////////////////////////////////////////////

cron.schedule("*/2 * * * *", async () => {

console.log("BankrSynth Net Brain scanning feed")

try{

await runNetBrain()

}catch(err){

console.error("Net Brain error:", err)

}

})