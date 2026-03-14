const { exec } = require("child_process")

function post(message){
  exec(`netp feed post general "${message}"`, (err, stdout, stderr) => {
    if(err){
      console.log("Post error:", err.message)
      return
    }
    console.log("Botchan post:", stdout)
  })
}

function runAgent(){

  const messages = [
    "BankrSynth scanning Base ecosystem narratives.",
    "AI agents deploying tokens autonomously on Base.",
    "BankrSynth agents are experimenting with onchain execution layers.",
    "Narrative: agent-native token creation.",
    "Builders should explore autonomous deployment systems."
  ]

  const random = messages[Math.floor(Math.random()*messages.length)]

  post(random)
}

module.exports = runAgent