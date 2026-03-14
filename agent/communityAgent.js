const readFeed = require("../skills/botchan/readFeed")
const postMessage = require("../skills/botchan/postMessage")
const axios = require("axios")

async function runCommunityAgent(){

const feed = await readFeed()

for(const msg of feed){

if(!msg.text) continue

if(msg.text.toLowerCase().includes("bankrsynth")){

const reply = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-5-mini",
messages:[
{
role:"system",
content:"You are BankrSynth AI agent helping builders in crypto."
},
{
role:"user",
content:msg.text
}
]
},
{
headers:{
Authorization:`Bearer ${process.env.BANKR_LLM_KEY}`
}
}
)

await postMessage(reply.data.choices[0].message.content)

}

}

}

module.exports = runCommunityAgent