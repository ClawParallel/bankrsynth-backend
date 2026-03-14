const { execSync } = require("child_process")

async function readFeed(){

try{

const output = execSync(
"botchan read general --limit 5 --json"
)

return JSON.parse(output)

}catch(err){

console.log("Botchan read error:", err.message)

return []

}

}

module.exports = readFeed