const axios = require("axios")
const postMessage = require("../skills/botchan/postMessage")
const { canPost } = require("./activityTracker")

/////////////////////////////////////////////////
// 🧠 GENERATE SMART IDEA
/////////////////////////////////////////////////

async function generateIdea(){

  const res = await axios.post(
    "https://llm.bankr.bot/v1/chat/completions",
    {
      model:"gpt-5-mini",
      messages:[
        {
          role:"system",
          content:`
You are BankrSynth.

Only generate a post IF you have a strong insight about:
- AI agents
- crypto
- Base ecosystem
- token mechanics

If no strong idea → respond with: SKIP
Keep it sharp, alpha, non-generic.
          `
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
// 🚀 MAIN
/////////////////////////////////////////////////

async function runBotchanAgent(){

  try{

    // ❌ limit check
    if(!canPost(10)){
      console.log("Daily limit reached")
      return
    }

    const idea = await generateIdea()

    // ❌ kalau gak ada ide → skip
    if(!idea || idea.includes("SKIP")){
      console.log("No strong idea, skipping")
      return
    }

    console.log("Posting insight:", idea)

    await postMessage({
      message: idea,
      feed: "general"
    })

  }catch(err){
    console.log("BotchanAgent error:", err.message)
  }

}

module.exports = runBotchanAgent