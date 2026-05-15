const axios = require("axios")

/////////////////////////////////////////////////
// SAFE PARSE
/////////////////////////////////////////////////

function safeParse(content){
try{
return JSON.parse(content)
}catch(err){
console.error("JSON parse error:", content)
return null
}
}

/////////////////////////////////////////////////
// GENERATE TOKEN IDEA
/////////////////////////////////////////////////

async function generateTokenIdea(){

try{

const systemPrompt = [
  "You are a memecoin generator.",
  "",
  "Rules:",
  "- Return ONLY valid JSON",
  "- No explanation",
  "- Symbol must be 2-6 uppercase letters",
  "",
  "Format:",
  "{",
  '"name":"...",',
  '"symbol":"...",',
  '"description":"..."',
  "}"
].join("\\n")

const response = await axios.post(
  "https://llm.bankr.bot/v1/chat/completions",
  {
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: "Create a viral Base memecoin idea."
      }
    ]
  },
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.BANKR_LLM_KEY
    }
  }
)

const content = response.data && response.data.choices && response.data.choices[0].message.content

if(!content){
  throw new Error("Empty AI response")
}

const parsed = safeParse(content)

if(!parsed){
  throw new Error("Invalid JSON from AI")
}

if(!parsed.name){
  throw new Error("Invalid name from AI")
}

if(!parsed.symbol || parsed.symbol.length < 2){
  parsed.symbol = parsed.name.slice(0,4).toUpperCase()
}

return parsed

}catch(err){

console.error("generateTokenIdea error:", err.message)
throw err

}

}

module.exports = generateTokenIdea