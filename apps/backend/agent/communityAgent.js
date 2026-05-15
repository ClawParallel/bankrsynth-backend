const readFeed = require("../skills/botchan/readFeed")
const postMessage = require("../skills/botchan/postMessage")
const axios = require("axios")

/////////////////////////////////////////////////
// 🎯 NARRATIVE KEYWORDS
/////////////////////////////////////////////////

const KEYWORDS = [
  "ai",
  "agent",
  "crypto",
  "token",
  "base",
  "defi",
  "onchain",
  "bankr",
  "net",
  "botchan"
]

/////////////////////////////////////////////////
// 🧠 SCORING SYSTEM
/////////////////////////////////////////////////

function scoreMessage(text){

  let score = 0
  const lower = text.toLowerCase()

  for(const keyword of KEYWORDS){
    if(lower.includes(keyword)) score += 1
  }

  // boost kalau mention langsung
  if(lower.includes("bankrsynth")) score += 5

  return score

}

/////////////////////////////////////////////////
// 🧠 GENERATE REPLY
/////////////////////////////////////////////////

async function generateReply(message){

  const res = await axios.post(
    "https://llm.bankr.bot/v1/chat/completions",
    {
      model:"gpt-5-mini",
      messages:[
        {
          role:"system",
          content:
            "You are BankrSynth, an advanced crypto AI agent. Reply sharp, insightful, and relevant. Keep it concise and alpha."
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

  return res.data.choices[0].message.content
}

/////////////////////////////////////////////////
// 🚀 MAIN AGENT
/////////////////////////////////////////////////

async function runCommunityAgent(){

  const feeds = ["general", "ai", "crypto"]

  let candidates = []

  for(const feedName of feeds){

    const feed = await readFeed(feedName)

    for(const msg of feed){

      if(!msg.text) continue
      if(msg.author === process.env.MY_WALLET) continue

      const score = scoreMessage(msg.text)

      if(score > 0){

        candidates.push({
          ...msg,
          score
        })

      }

    }

  }

  //////////////////////////////////////////////////
  // 🔥 SORT BY BEST TARGET
  //////////////////////////////////////////////////

  candidates.sort((a,b) => b.score - a.score)

  // ambil top 3 aja (biar gak spam)
  const targets = candidates.slice(0,3)

  if(targets.length === 0){
    console.log("No good targets found")
    return
  }

  //////////////////////////////////////////////////
  // 🎯 EXECUTE
  //////////////////////////////////////////////////

  for(const target of targets){

    try{

      console.log("Sniping:", target.text)

      const reply = await generateReply(target.text)

      await postMessage({
        message: reply,
        feed: target.feed,
        replyTo: target.id
      })

    }catch(err){
      console.log("Sniper error:", err.message)
    }

  }

}

module.exports = runCommunityAgent