require("dotenv").config();

/////////////////////////////////////////////////
// SAFE CRON LOADER (prevents backend crash)
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
// HEALTH CHECK
/////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("BankrSynth Backend LIVE 🚀");
});

/////////////////////////////////////////////////
// 🚀 MANUAL TOKEN LAUNCH (UNCHANGED)
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const { name, symbol, description, wallet, image, tweet, website } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Token name required" });
    }

    if (!wallet) {
      return res.status(400).json({ error: "Creator wallet required" });
    }

    const payload = {
      tokenName: name,
      tokenSymbol: symbol || name.slice(0, 4),
      description: description || "",
      feeRecipient: {
        type: "wallet",
        value: wallet
      }
    };

    if (image) payload.image = image;
    if (tweet) payload.tweetUrl = tweet;
    if (website) payload.websiteUrl = website;

    const response = await axios.post(
      "https://api.bankr.bot/token-launches/deploy",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Partner-Key": process.env.BANKR_PARTNER_KEY
        }
      }
    );

    res.json(response.data);

  } catch (err) {

    console.error("Launch error:", err.response?.data || err.message);

    res.status(500).json({
      error: "Launch failed",
      details: err.response?.data || err.message
    });

  }
});

/////////////////////////////////////////////////
// 🤖 AGENT MODE (CHAT + DEPLOY)
/////////////////////////////////////////////////

app.post("/agent", async (req, res) => {

  try {

    const { message } = req.body;

    //////////////////////////////////////////////////
    // LLM REQUEST
    //////////////////////////////////////////////////

    const ai = await axios.post(
      "https://llm.bankr.bot/v1/chat/completions",
      {
        model: "gpt-5-mini",
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `
You are BankrSynth AI agent running on Base.

You can:

1) Chat with users about crypto, AI agents, Base ecosystem
2) Deploy tokens using Bankr

You MUST reply in JSON.

If user wants to deploy a token:

{
 "action":"deploy",
 "name":"token name",
 "symbol":"symbol",
 "description":"token description"
}

If user is chatting:

{
 "action":"chat",
 "reply":"your message"
}
`
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
          "X-API-Key": process.env.BANKR_LLM_KEY
        }
      }
    );

    //////////////////////////////////////////////////
    // PARSE AI RESPONSE
    //////////////////////////////////////////////////

    let parsed;

    try {

      const content = ai.data.choices[0].message.content;

      parsed = JSON.parse(content);

    } catch (err) {

      return res.json({
        type: "chat",
        reply: ai.data.choices[0].message.content
      });

    }

    //////////////////////////////////////////////////
    // CHAT RESPONSE
    //////////////////////////////////////////////////

    if (parsed.action === "chat") {

      return res.json({
        type: "chat",
        reply: parsed.reply
      });

    }

    //////////////////////////////////////////////////
    // DEPLOY TOKEN
    //////////////////////////////////////////////////

    if (parsed.action === "deploy") {

      const deploy = await axios.post(
        "https://api.bankr.bot/token-launches/deploy",
        {
          tokenName: parsed.name,
          tokenSymbol: parsed.symbol || parsed.name.slice(0, 4),
          description: parsed.description,
          feeRecipient: {
            type: "wallet",
            value: process.env.FEE_WALLET
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Partner-Key": process.env.BANKR_PARTNER_KEY
          }
        }
      );

      return res.json({
        type: "deploy",
        token: parsed,
        result: deploy.data
      });

    }

    //////////////////////////////////////////////////
    // FALLBACK
    //////////////////////////////////////////////////

    return res.json({
      type: "chat",
      reply: "I'm not sure what you want to do."
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
// SERVER START
/////////////////////////////////////////////////

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BankrSynth Backend LIVE 🚀 on port ${PORT}`);
});