const { NetClient } = require("@net-protocol/core")

const net = new NetClient({
  rpc: "https://rpc.netprotocol.app"
})

module.exports = net