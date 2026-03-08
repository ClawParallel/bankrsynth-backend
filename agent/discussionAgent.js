const axios = require("axios")
const readFeed = require("../skills/netprotocol/readFeed")
const sendMessage = require("../skills/netprotocol/sendMessage")

async function generateOpinion(text){

const res = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-4o-mini",
messages:[
{
role:"system",
content:"You participate in crypto discussions."
},
{
role:"user",
content:text
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

}

async function runDiscussionAgent(){

const feed = await readFeed()

for(const msg of feed){

if(!msg.text) continue

if(msg.text.toLowerCase().includes("crypto")){

const opinion = await generateOpinion(msg.text)

await sendMessage(opinion)

}

}

}

module.exports = runDiscussionAgent