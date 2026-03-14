const { exec } = require("child_process")

function readFeed(){

return new Promise((resolve)=>{

exec("netp feed read general --limit 5 --json", (err, stdout)=>{

if(err){
console.log("Botchan read error:", err.message)
return resolve([])
}

try{

const data = JSON.parse(stdout)

resolve(data)

}catch{

resolve([])

}

})

})

}

module.exports = readFeed