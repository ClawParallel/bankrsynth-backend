require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🚀 BANKR PARTNER TOKEN DEPLOY
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const { name, symbol, description } = req.body;

    const response = await axios.post(
      "https://api.bankr.bot/token-launches/deploy",
      {
        tokenName: name,
        tokenSymbol: symbol,
        description: description,

        // 🔥 WAJIB untuk partner deploy
        feeRecipient: {
          type: "wallet",
          value: process.env.FEE_WALLET
        }
      },
      {
        headers: {
          "Content-Type": "application/json",

          // 🔥 HEADER WAJIB DARI DOCS
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
// 🧠 ARKHAM INTEL
/////////////////////////////////////////////////

app.post("/intel", async (req, res) => {
  try {
    const { address } = req.body;

    const response = await axios.get(
      `https://api.arkm.com/entity/${address}`,
      {
        headers: {
          "API-Key": process.env.ARKHAM_API_KEY
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Intel failed" });
  }
});

/////////////////////////////////////////////////

app.listen(process.env.PORT || 3000, () => {
  console.log("BankrSynth Backend LIVE 🚀");
});