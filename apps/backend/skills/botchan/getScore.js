const client = require("./netClient")

async function getScore(address){

try{

const score = await client.score.get(address)

return score

}catch(err){

console.error("Score error:", err.message)
return 0

}

}

module.exports = getScore