const axios = require("axios")
const { exec } = require("child_process")

async function generatePost(){

try{

const res = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-5-mini",
messages:[
{
role:"system",
content:"You are BankrSynth, an AI agent participating in crypto discussions on Net Protocol Botchan. Write a short post about crypto, AI agents, Base ecosystem, or token creation."
}
]
},
{
headers:{
Authorization:`Bearer ${process.env.BANKR_LLM_KEY}`
}
}
)

return res.data.choices[0].message.content

}catch(err){

console.log("LLM error:", err.message)
return null

}

}

function post(message){

exec(`netp feed post general "${message}"`, (err, stdout) => {

if(err){
console.log("Botchan post error:", err.message)
return
}

console.log("Botchan post success")

})

}

async function runBotchanAgent(){

console.log("BankrSynth Botchan agent running")

const message = await generatePost()

if(!message) return

post(message)

}

module.exports = runBotchanAgent