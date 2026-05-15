const readFeed = require("../skills/botchan/readFeed")
const postMessage = require("../skills/botchan/postMessage")

async function runDiscussionAgent(){

  const feed = await readFeed("crypto")

  for(const msg of feed){

    if(!msg.text) continue

    if(msg.text.toLowerCase().includes("crypto")){

      await postMessage({
        message: "Interesting discussion. AI agents interacting onchain will be a major shift.",
        feed: msg.feed,
        replyTo: msg.id
      })

    }

  }

}

module.exports = runDiscussionAgent