const axios = require("axios")
const postMessage = require("../skills/botchan/postMessage")

async function runBotchanAgent(){

  try{

    const res = await axios.post(
      "https://llm.bankr.bot/v1/chat/completions",
      {
        model:"gpt-5-mini",
        messages:[
          {
            role:"system",
            content:"Write a short crypto insight about AI agents or onchain execution."
          }
        ]
      },
      {
        headers:{
          Authorization:`Bearer ${process.env.BANKR_LLM_KEY}`
        }
      }
    )

    const message = res.data.choices[0].message.content

    await postMessage({
      message,
      feed:"general"
    })

  }catch(err){
    console.log("BotchanAgent error:", err.message)
  }

}

module.exports = runBotchanAgent