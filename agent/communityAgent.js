const axios = require("axios")
const readFeed = require("../skills/netprotocol/readFeed")
const sendMessage = require("../skills/netprotocol/sendMessage")

const { saveMessage } = require("../memory/chatMemory")
const { updateUser } = require("../memory/userMemory")

async function generateReply(message){

const response = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-4o-mini",
messages:[
{
role:"system",
content:"You are BankrSynth, a friendly AI agent helping builders."
},
{
role:"user",
content:message
}
]
},
{
headers:{
Authorization:`Bearer ${process.env.BANKR_LLM_KEY}`
}
}
)

return response.data.choices[0].message.content

}

async function runCommunityAgent(){

const messages = await readFeed()

for(const msg of messages){

if(!msg.text) continue

if(msg.text.toLowerCase().includes("bankrsynth")){

saveMessage(msg.user,msg.text)
updateUser(msg.user,msg.text)

const reply = await generateReply(msg.text)

await sendMessage(reply)

}

}

}

module.exports = runCommunityAgent