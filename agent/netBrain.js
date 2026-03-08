const communityAgent = require("./communityAgent")
const discussionAgent = require("./discussionAgent")
const knowledgeAgent = require("./knowledgeAgent")

async function runNetBrain(){

await communityAgent()
await discussionAgent()
await knowledgeAgent()

}

module.exports = runNetBrain