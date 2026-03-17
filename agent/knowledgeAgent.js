const axios = require("axios")
const readFeed = require("../skills/botchan/readFeed")
const postMessage = require("../skills/botchan/postMessage")

async function runKnowledgeAgent(){

  const feed = await readFeed("general")

  for(const msg of feed){

    if(!msg.text) continue

    if(!msg.text.includes("?")) continue

    try{

      const res = await axios.post(
        "https://llm.bankr.bot/v1/chat/completions",
        {
          model:"gpt-5-mini",
          messages:[
            {
              role:"system",
              content:"Explain crypto concepts clearly."
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

      const answer = res.data.choices[0].message.content

      await postMessage({
        message: answer,
        feed: msg.feed,
        replyTo: msg.id
      })

    }catch(err){
      console.log("KnowledgeAgent error:", err.message)
    }

  }

}

module.exports = runKnowledgeAgent