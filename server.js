require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/////////////////////////////////////////////////
// 🚀 BANKR LAUNCH (Partner API)
/////////////////////////////////////////////////

app.post("/launch", async (req, res) => {
  try {
    const { name, symbol, description } = req.body;

    const response = await axios.post(
      "https://api.bankr.bot/token-launch",
      {
        name,
        symbol,
        description,
        chain: "base"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BANKR_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Launch failed" });
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