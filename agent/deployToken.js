const axios = require("axios")

const isValidSymbol = (symbol) => /^[A-Z]{2,6}$/.test(symbol)

async function deployToken(token){

try{

if(!token.name){
throw new Error("Token name missing")
}

const symbol = isValidSymbol(token.symbol)
? token.symbol
: token.name.slice(0,4).toUpperCase()

const payload = {

tokenName: token.name,
tokenSymbol: symbol,
description: token.description || "",
image: token.image,

feeRecipient:{
type:"wallet",
value:process.env.FEE_WALLET
}

}

console.log("🚀 Deploying token:", payload)

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

}catch(err){

console.error("❌ Deploy error:", err.response?.data || err.message)
throw err

}

}

module.exports = deployToken