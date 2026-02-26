require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🚀 BANKRSYNTH DEPLOY — FINAL VERSION
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const {
      name,
      symbol,
      description,
      wallet,
      image,
      tweet,
      website
    } = req.body;

    //////////////////////////////////////////////////
    // REQUIRED VALIDATION
    //////////////////////////////////////////////////

    if (!name) {
      return res.status(400).json({
        error: "Token name required"
      });
    }

    if (!wallet) {
      return res.status(400).json({
        error: "Creator wallet required"
      });
    }

    //////////////////////////////////////////////////
    // BUILD REQUEST BODY (OPTIONAL SAFE)
    //////////////////////////////////////////////////

    const payload = {
      tokenName: name,
      tokenSymbol: symbol || name.slice(0, 4),
      description: description || "",
      feeRecipient: {
        type: "wallet",
        value: wallet
      }
    };

    // Optional metadata
    if (image) payload.image = image;
    if (tweet) payload.tweetUrl = tweet;
    if (website) payload.websiteUrl = website;

    //////////////////////////////////////////////////
    // CALL BANKR PARTNER API
    //////////////////////////////////////////////////

    const response = await axios.post(
      "https://api.bankr.bot/token-launches/deploy",
      payload,
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

app.get("/", (req, res) => {
  res.send("BankrSynth Backend LIVE 🚀");
});

/////////////////////////////////////////////////

app.listen(process.env.PORT || 3000, () => {
  console.log("BankrSynth Backend LIVE 🚀");
});