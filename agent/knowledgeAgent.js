const axios = require("axios")

const readFeed = require("../skills/botchan/readFeed")
const sendMessage = require("../skills/botchan/postMessage")

async function answerQuestion(question){

try{

const res = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-5-mini",
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

}catch(err){

console.error("Knowledge error:", err.message)
return null

}

}

async function runKnowledgeAgent(){

const messages = await readFeed()

if(!messages || messages.length === 0){
console.log("KnowledgeAgent: no questions")
return
}

for(const msg of messages){

if(!msg.text) continue

if(msg.text.includes("?")){

const answer = await answerQuestion(msg.text)

if(answer){
await sendMessage(answer)
}

}

}

}

module.exports = runKnowledgeAgent