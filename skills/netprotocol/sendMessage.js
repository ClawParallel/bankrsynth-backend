const net = require("./netClient")

async function sendMessage(text){

await net.messages.post({
topic:"bankrsynth",
text:text
})

}

module.exports = sendMessage