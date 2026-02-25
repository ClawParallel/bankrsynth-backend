require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🟢 HEALTH CHECK ROUTE (PENTING DI RAILWAY)
/////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("BankrSynth Backend Running 🚀");
});

/////////////////////////////////////////////////
// 🚀 BANKRSYNTH DEPLOY — WALLET ONLY MODE
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const { name, symbol, description, wallet } = req.body;

    //////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////

    if (!name) {
      return res.status(400).json({ error: "Token name required" });
    }

    if (!wallet) {
      return res.status(400).json({
        error: "Creator wallet address required"
      });
    }

    //////////////////////////////////////////////////
    // DEPLOY TOKEN VIA BANKR
    //////////////////////////////////////////////////

    const response = await axios.post(
      "https://api.bankr.bot/token-launches/deploy",
      {
        tokenName: name,
        tokenSymbol: symbol || name.slice(0, 4),
        description: description || "",

        feeRecipient: {
          type: "wallet",
          value: wallet
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Partner-Key": process.env.BANKR_API_KEY
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error("BANKR ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "Launch failed",
      details: err.response?.data || err.message
    });
  }
});

/////////////////////////////////////////////////
// 🚀 START SERVER — RAILWAY SAFE
/////////////////////////////////////////////////

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BankrSynth Backend LIVE 🚀 on port ${PORT}`);
});