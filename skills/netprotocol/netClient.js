const { NetClient } = require("@net-protocol/core")

const net = new NetClient({
chainId: 8453, // Base mainnet
rpc: "https://mainnet.base.org"
})

module.exports = net