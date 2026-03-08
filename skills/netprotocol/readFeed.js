const net = require("./netClient")

async function readFeed(topic="bankrsynth"){

const messages = await net.messages.query({
topic: topic,
limit: 20
})

return messages

}

module.exports = readFeed