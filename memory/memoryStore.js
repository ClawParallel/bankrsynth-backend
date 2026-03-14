const fs = require("fs")

const FILE = "./memory.json"

function loadMemory(){
try{
return JSON.parse(fs.readFileSync(FILE))
}catch{
return {}
}
}

function saveMemory(data){
fs.writeFileSync(FILE, JSON.stringify(data,null,2))
}

module.exports = { loadMemory, saveMemory }