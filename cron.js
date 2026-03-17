const cron = require("node-cron")

// agents
const runAutonomousAgent = require("./agent/autonomousAgent")
const runNetBrain = require("./agent/netBrain")
const runBotchanAgent = require("./agent/botchan")

/////////////////////////////////////////////////
// 🧠 HELPER: RANDOM DELAY (biar human-like)
/////////////////////////////////////////////////

function delay(ms){
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runWithRandomDelay(){

  try{

    // random delay max 2 menit
    const randomDelay = Math.floor(Math.random() * 120000)

    console.log("Botchan delay:", randomDelay, "ms")

    await delay(randomDelay)

    await runBotchanAgent()

  }catch(err){

    console.log("Botchan delayed error:", err.message)

  }

}

/////////////////////////////////////////////////
// 🚀 Autonomous Token Agent
// deploy setiap 1 jam (tetap)
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
// lebih responsif (10 menit sekali)
/////////////////////////////////////////////////

cron.schedule("*/10 * * * *", async () => {

  console.log("BankrSynth Net Brain scanning feed")

  try{
    await runNetBrain()
  }catch(err){
    console.log("Net brain error:", err.message)
  }

})

/////////////////////////////////////////////////
// 🤖 Botchan AI Agent
// 5x sehari (natural behavior)
/////////////////////////////////////////////////

// pagi
cron.schedule("0 8 * * *", runWithRandomDelay)

// siang
cron.schedule("0 12 * * *", runWithRandomDelay)

// sore
cron.schedule("0 16 * * *", runWithRandomDelay)

// malam
cron.schedule("0 20 * * *", runWithRandomDelay)

// larut
cron.schedule("0 23 * * *", runWithRandomDelay)

/////////////////////////////////////////////////

console.log("BankrSynth cron jobs initialized 🚀")