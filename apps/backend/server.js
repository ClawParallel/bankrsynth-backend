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
const logger = require("./utils/synthLogger");

// ─── ROUTES ──────────────────────────────────
const gitlawbRoutes = require("./routes/gitlawb");
const terminalRoutes = require("./routes/terminal");
const synthRoutes = require("./routes/synth");
const narrativesRoutes = require("./routes/narratives");
const { initSocketServer } = require("./routes/websocket");

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

/////////////////////////////////////////////////
// ALL ROUTES
/////////////////////////////////////////////////

app.use("/gitlawb", gitlawbRoutes);
app.use("/terminal", terminalRoutes);
app.use("/synth", synthRoutes);
app.use("/narratives", narrativesRoutes);

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
res.json({
  name: "BankrSynth",
  status: "LIVE",
  version: "2.0.0",
  features: ["token-launch", "gitlawb", "coding-agent", "terminal-stream"],
  endpoints: {
    health: "GET /",
    launch: "POST /launch",
    agent: "POST /agent",
    skill: "POST /execute-skill",
    gitlawb: "GET /gitlawb/*",
    synth: "POST /synth/exec",
    terminal: "GET /terminal/stream (SSE)",
  },
});
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

// ─── Existing Skills ───────────────────────
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
  return res.json({ success: true, skill, result });
}

// ─── GitLawb Skills ────────────────────────
if (skill && skill.startsWith("gitlawb-")) {
  const { executeSkill } = require("./skills/gitlawb/index");
  const result = await executeSkill(skill, input || {});
  return res.json({ success: true, skill, result });
}

// ─── List Skills ───────────────────────────
if (skill === "list") {
  const { listSkills } = require("./skills/gitlawb/index");
  return res.json({
    success: true,
    skills: [
      { name: "deploy-token", description: "Deploy a memecoin token on Base" },
      ...listSkills(),
    ],
  });
}

return res.status(400).json({
  error: "Unknown skill",
  hint: "Use skill='list' to see available skills",
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

const PORT = process.env.PORT || process.env.BACKEND_PORT || 3000;
const http = require("http");
const server = http.createServer(app);

// Initialize WebSocket / Socket.IO
initSocketServer(server);

server.listen(PORT, "0.0.0.0", () => {
logger.banner();
logger.boot(`BankrSynth Backend LIVE on port ${PORT}`);
logger.ok("GitLawb integration loaded");
logger.ok("Socket.IO realtime layer active");
logger.ok("Synth terminal routes active");
logger.info(`REST API:        http://localhost:${PORT}/`);
logger.info(`Terminal SSE:    GET http://localhost:${PORT}/terminal/stream`);
logger.info(`WebSocket:       ws://localhost:${PORT}/`);
logger.info(`GitLawb API:     POST http://localhost:${PORT}/gitlawb/*`);
logger.info(`Synth commands:  POST http://localhost:${PORT}/synth/exec`);
logger.info(`Narratives:      GET http://localhost:${PORT}/narratives`);
});