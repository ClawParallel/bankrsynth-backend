const readFeed = require("../skills/botchan/readFeed")
const postMessage = require("../skills/botchan/postMessage")

async function runDiscussionAgent(){

const feed = await readFeed()

for(const msg of feed){

if(!msg.text) continue

if(msg.text.toLowerCase().includes("crypto")){

await postMessage(
"Interesting discussion about crypto. Autonomous agents and onchain infrastructure will dominate the next cycle."
)

}

}

}

module.exports = runDiscussionAgent