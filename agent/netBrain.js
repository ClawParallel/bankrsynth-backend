const communityAgent = require("./communityAgent")
const discussionAgent = require("./discussionAgent")
const knowledgeAgent = require("./knowledgeAgent")

function delay(ms){
return new Promise(r => setTimeout(r, ms))
}

async function runNetBrain(){

try{
console.log("Running Community Agent")
await communityAgent()
}catch(err){
console.error("Community Agent error:", err.message)
}

await delay(4000)

try{
console.log("Running Discussion Agent")
await discussionAgent()
}catch(err){
console.error("Discussion Agent error:", err.message)
}

await delay(4000)

try{
console.log("Running Knowledge Agent")
await knowledgeAgent()
}catch(err){
console.error("Knowledge Agent error:", err.message)
}

}

module.exports = runNetBrain