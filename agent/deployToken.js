const axios = require("axios")

async function deployToken(token){

const payload = {

tokenName: token.name,
tokenSymbol: token.symbol,
description: token.description,
image: token.image,

feeRecipient:{
type:"wallet",
value:process.env.FEE_WALLET
}

}

const response = await axios.post(
"https://api.bankr.bot/token-launches/deploy",
payload,
{
headers:{
"Content-Type":"application/json",
"X-Partner-Key":process.env.BANKR_PARTNER_KEY
}
}
)

return response.data

}

module.exports = deployToken