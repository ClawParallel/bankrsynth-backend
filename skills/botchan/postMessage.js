const { execSync } = require("child_process")

async function postMessage(message){

try{

console.log("Posting to Botchan:", message)

execSync(`botchan post general "${message}"`, {
stdio:"inherit"
})

return true

}catch(err){

console.log("Botchan post error:", err.message)

return null

}

}

module.exports = postMessage