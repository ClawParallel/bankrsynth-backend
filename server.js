require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🟢 HEALTHCHECK (WAJIB BUAT RAILWAY)
/////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("BankrSynth Backend LIVE 🚀");
});

/////////////////////////////////////////////////
// 🚀 MANUAL LAUNCH MODULE
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const { name, symbol, description, wallet, image, tweet, website } = req.body;

    if (!name) return res.status(400).json({ error: "Token name required" });
    if (!wallet) return res.status(400).json({ error: "Creator wallet required" });

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
    console.error("LAUNCH ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "Launch failed",
      details: err.response?.data || err.message
    });
  }
});

/////////////////////////////////////////////////
// 🤖 TRUE AGENT MODE — THINK → DEPLOY
/////////////////////////////////////////////////

app.post("/agent", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    //////////////////////////////////////////////////
    // 🧠 STEP 1 — AGENT THINKING VIA LLM
    //////////////////////////////////////////////////

    const ai = await axios.post(
      "https://llm.bankr.bot/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an autonomous onchain launch agent. If user asks for a token idea or deployment, invent one and respond ONLY in JSON format with fields: name, symbol, description."
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

    const content = ai.data.choices[0].message.content;

    //////////////////////////////////////////////////
    // 🧠 STEP 2 — PARSE JSON FROM AGENT
    //////////////////////////////////////////////////

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(400).json({
        error: "Agent did not return valid JSON",
        raw: content
      });
    }

    //////////////////////////////////////////////////
    // 🚀 STEP 3 — DEPLOY TOKEN IDEA
    //////////////////////////////////////////////////

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

    //////////////////////////////////////////////////
    // 📤 RETURN RESULT
    //////////////////////////////////////////////////

    res.json({
      agentIdea: parsed,
      deployResult: deploy.data
    });

  } catch (err) {
    console.error("AGENT ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "Agent execution failed",
      details: err.response?.data || err.message
    });
  }
});

/////////////////////////////////////////////////
// 🌐 START SERVER (RAILWAY SAFE)
/////////////////////////////////////////////////

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BankrSynth Backend LIVE 🚀 on port ${PORT}`);
});