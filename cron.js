const cron = require("node-cron")

// agents
const runAutonomousAgent = require("./agent/autonomousAgent")
const runNetBrain = require("./agent/netBrain")
const runBotchanAgent = require("./agent/botchan")

/////////////////////////////////////////////////
// 🚀 Autonomous Token Agent
// deploy ide token setiap 1 jam
/////////////////////////////////////////////////

cron.schedule("0 * * * *", async () => {

console.log("Running BankrSynth autonomous deploy agent")

try{
await runAutonomousAgent()
}catch(err){
console.log("Autonomous agent error:", err.message)
}

})

/////////////////////////////////////////////////
// 🧠 Net Brain
// community / discussion / knowledge agents
/////////////////////////////////////////////////

cron.schedule("*/25 * * * *", async () => {

console.log("BankrSynth Net Brain scanning feed")

try{
await runNetBrain()
}catch(err){
console.log("Net brain error:", err.message)
}

})

/////////////////////////////////////////////////
// 🤖 Botchan AI Agent
// posting AI discussion di Botchan
/////////////////////////////////////////////////

cron.schedule("*/30 * * * *", async () => {

console.log("BankrSynth Botchan agent running")

try{
await runBotchanAgent()
}catch(err){
console.log("Botchan agent error:", err.message)
}

})

console.log("BankrSynth cron jobs initialized 🚀")