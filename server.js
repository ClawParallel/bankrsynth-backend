require("dotenv").config();

/////////////////////////////////////////////////
// SAFE CRON LOADER
/////////////////////////////////////////////////

try {
require("./cron");
} catch (err) {
console.log("Cron disabled:", err.message);
}

/////////////////////////////////////////////////

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🧠 VALIDATORS
/////////////////////////////////////////////////

const isValidAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);
const isValidSymbol = (symbol) => /^[A-Z]{2,6}$/.test(symbol);

/////////////////////////////////////////////////
// 🚀 CORE DEPLOY FUNCTION (NO DUPLICATION)
/////////////////////////////////////////////////

const deployToken = async (data) => {
const payload = {
tokenName: data.name,
tokenSymbol: isValidSymbol(data.symbol)
? data.symbol
: data.name.slice(0, 4).toUpperCase(),
description: data.description || "",
feeRecipient: {
type: "wallet",
value: data.wallet
}
};

if (data.image) payload.image = data.image;
if (data.tweet) payload.tweetUrl = data.tweet;
if (data.website) payload.websiteUrl = data.website;

console.log("🚀 Deploy payload:", payload);

const res = await axios.post(
"https://api.bankr.bot/token-launches/deploy",
payload,
{
headers: {
"Content-Type": "application/json",
"X-Partner-Key": process.env.BANKR_PARTNER_KEY
}
}
);

return res.data;
};

/////////////////////////////////////////////////
// HEALTH CHECK
/////////////////////////////////////////////////

app.get("/", (req, res) => {
res.send("BankrSynth Backend LIVE 🚀");
});

/////////////////////////////////////////////////
// 🚀 MANUAL TOKEN LAUNCH
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
try {
const { name, symbol, description, wallet, image, tweet, website } = req.body;

if (!name) {
  return res.status(400).json({ error: "Token name required" });
}

if (!wallet || !isValidAddress(wallet)) {
  return res.status(400).json({ error: "Invalid wallet address" });
}

const result = await deployToken({
  name,
  symbol,
  description,
  wallet,
  image,
  tweet,
  website
});

res.json({
  success: true,
  data: result
});

} catch (err) {
console.error("Launch error:", err.response?.data || err.message);

res.status(500).json({
  error: "Launch failed",
  details: err.response?.data || err.message
});

}
});

/////////////////////////////////////////////////
// 🤖 AGENT MODE (AI → DEPLOY)
/////////////////////////////////////////////////

app.post("/agent", async (req, res) => {
try {
const { message } = req.body;

if (!message) {
  return res.status(400).json({ error: "Message required" });
}

//////////////////////////////////////////////////
// 🧠 LLM CALL (CONTROLLED)
//////////////////////////////////////////////////

const ai = await axios.post(
  "https://llm.bankr.bot/v1/chat/completions",
  {
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "Return ONLY JSON. Create a memecoin with fields: name, symbol (2-6 uppercase), description."
      },
      {
        role: "user",
        content: message
      }
    ]
  },
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.BANKR_LLM_KEY}`
    }
  }
);

//////////////////////////////////////////////////
// PARSE SAFE
//////////////////////////////////////////////////

let parsed;

try {
  parsed = JSON.parse(ai.data?.choices?.[0]?.message?.content);
} catch {
  return res.status(400).json({
    error: "Invalid JSON from AI",
    raw: ai.data?.choices?.[0]?.message?.content
  });
}

if (!parsed.name) {
  return res.status(400).json({
    error: "AI returned invalid token"
  });
}

//////////////////////////////////////////////////
// DEPLOY VIA CORE
//////////////////////////////////////////////////

const deploy = await deployToken({
  name: parsed.name,
  symbol: parsed.symbol,
  description: parsed.description,
  wallet: process.env.FEE_WALLET
});

//////////////////////////////////////////////////
// RESPONSE
//////////////////////////////////////////////////

res.json({
  success: true,
  agentIdea: parsed,
  deployResult: deploy
});

} catch (err) {
console.error("Agent error:", err.response?.data || err.message);

res.status(500).json({
  error: "Agent execution failed",
  details: err.response?.data || err.message
});

}
});

/////////////////////////////////////////////////
// 🧩 SKILL EXECUTOR (FOUNDATION)
/////////////////////////////////////////////////

app.post("/execute-skill", async (req, res) => {
try {
const { skill, input } = req.body;

if (skill === "deploy-token") {
  const result = await deployToken({
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    wallet: input.wallet,
    image: input.image,
    tweet: input.tweet,
    website: input.website
  });

  return res.json({
    success: true,
    skill,
    result
  });
}

return res.status(400).json({
  error: "Unknown skill"
});

} catch (err) {
console.error("Skill error:", err.response?.data || err.message);

res.status(500).json({
  error: "Skill execution failed",
  details: err.response?.data || err.message
});

}
});

/////////////////////////////////////////////////
// SERVER START
/////////////////////////////////////////////////

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
console.log("🚀 BankrSynth Backend LIVE on port ${PORT}");
});