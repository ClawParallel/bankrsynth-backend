const { NetClient } = require("@net-protocol/core")
const feeds = require("@net-protocol/feeds")

if (!process.env.NET_PRIVATE_KEY) {
  throw new Error("NET_PRIVATE_KEY missing in .env")
}

const client = new NetClient({
  chainId: 8453, // Base
  privateKey: process.env.NET_PRIVATE_KEY
})

/* attach feeds module correctly */
client.feeds = feeds(client)

module.exports = client