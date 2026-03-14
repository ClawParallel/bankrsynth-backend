const { exec } = require("child_process")

function postMessage(message){

return new Promise((resolve)=>{

exec(`netp feed post general "${message}"`, (err)=>{

if(err){
console.log("Botchan post error:", err.message)
return resolve(false)
}

console.log("Botchan reply sent")

resolve(true)

})

})

}

module.exports = postMessage