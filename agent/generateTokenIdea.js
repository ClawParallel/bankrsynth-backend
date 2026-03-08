const axios = require("axios")

async function generateTokenIdea() {

const response = await axios.post(
"https://llm.bankr.bot/v1/chat/completions",
{
model:"gpt-5-mini",
messages:[
{
role:"system",
content:"Generate a memecoin idea. Return JSON with name, symbol, description."
},
{
role:"user",
content:"Create a viral Base memecoin idea."
}
]
},
{
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${process.env.BANKR_LLM_KEY}`
}
}
)

const content = response.data.choices[0].message.content

return JSON.parse(content)

}

module.exports = generateTokenIdea