const communityAgent = require("./communityAgent")
const discussionAgent = require("./discussionAgent")
const knowledgeAgent = require("./knowledgeAgent")

function delay(ms){
  return new Promise(r => setTimeout(r, ms))
}

async function runNetBrain(){

  console.log("Running Community Agent")
  await communityAgent()

  await delay(3000)

  console.log("Running Discussion Agent")
  await discussionAgent()

  await delay(3000)

  console.log("Running Knowledge Agent")
  await knowledgeAgent()

}

module.exports = runNetBrain