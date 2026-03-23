const generateTokenIdea = require("./generateTokenIdea")
const generateImage = require("./generateImage")
const deployToken = require("./deployToken")

async function runAutonomousAgent(){

console.log("🤖 Running BankrSynth autonomous agent...\n")

try{

/////////////////////////////////////////////////
// STEP 1: IDEA
/////////////////////////////////////////////////

const idea = await generateTokenIdea()
console.log("🧠 Idea generated:", idea)

/////////////////////////////////////////////////
// STEP 2: IMAGE
/////////////////////////////////////////////////

let image = null

try{
image = await generateImage(idea.name)
console.log("🎨 Image generated:", image)
}catch(err){
console.log("⚠️ Image generation failed, skipping:", err.message)
}

idea.image = image

/////////////////////////////////////////////////
// STEP 3: DEPLOY
/////////////////////////////////////////////////

const deploy = await deployToken(idea)

console.log("🚀 Token deployed successfully:")
console.log(deploy)

return {
idea,
deploy
}

}catch(err){

console.error("💥 Agent failed:", err.message)

return {
success:false,
error:err.message
}

}

}

module.exports = runAutonomousAgent