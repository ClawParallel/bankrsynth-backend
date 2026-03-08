const generateTokenIdea = require("./generateTokenIdea")
const generateImage = require("./generateImage")
const deployToken = require("./deployToken")

async function runAutonomousAgent(){

console.log("Running BankrSynth autonomous agent")

try{

const idea = await generateTokenIdea()

console.log("Token idea:", idea)

const image = await generateImage(idea.name)

idea.image = image

const deploy = await deployToken(idea)

console.log("Token deployed:", deploy)

}catch(err){

console.log("Agent error:", err.message)

}

}

module.exports = runAutonomousAgent