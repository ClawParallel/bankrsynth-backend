const axios = require("axios")
const readFeed = require("../skills/netprotocol/readFeed")
const sendMessage = require("../skills/netprotocol/sendMessage")

async function answerQuestion(question){

const res = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-4o-mini",
messages:[
{
role:"system",
content:"You explain crypto tools clearly."
},
{
role:"user",
content:question
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

async function runKnowledgeAgent(){

const messages = await readFeed()

for(const msg of messages){

if(!msg.text) continue

if(msg.text.includes("?")){

const answer = await answerQuestion(msg.text)

await sendMessage(answer)

}

}

}

module.exports = runKnowledgeAgent