const express = require("express");
const router = express.Router();
const axios = require("axios");
const config = require("../utils/envConfig");
const logger = require("../utils/synthLogger");

/////////////////////////////////////////////////
// NARRATIVES ROUTE
// AI-powered crypto narrative scanning.
// Used by the Intel page on the frontend.
/////////////////////////////////////////////////

const FALLBACK_NARRATIVES = [
  { title: "AI x Crypto Convergence", desc: "On-chain AI agents are reshaping DeFi infrastructure", strength: 94 },
  { title: "Base Ecosystem Growth", desc: "Base TVL hitting new highs as builder activity surges", strength: 87 },
  { title: "Autonomous Agent Economy", desc: "Self-executing agents deploy capital without human input", strength: 82 },
  { title: "Memecoin Supercycle", desc: "Cultural tokens outperforming fundamentals-driven assets", strength: 76 },
  { title: "Decentralized Identity", desc: "DID standards gaining traction across web3 protocols", strength: 71 },
  { title: "Synth Infrastructure Layer", desc: "AI-native dev tooling becoming the new primitive", strength: 68 },
];

// GET /narratives — return current AI-scanned crypto narratives
router.get("/", async (req, res) => {
  logger.ai("Scanning narratives...");

  try {
    if (!config.bankrLlmKey) {
      return res.json(FALLBACK_NARRATIVES);
    }

    const aiRes = await axios.post(
      `${config.llmApiUrl}/chat/completions`,
      {
        model: config.llmModel,
        messages: [
          {
            role: "system",
            content: `You are a crypto market analyst. Return ONLY valid JSON array.
Scan for the top 6 trending crypto narratives on Base right now.
Format: [{"title": "...", "desc": "...", "strength": <number 1-100>}]
Order by strength descending. Be specific and current.`,
          },
          {
            role: "user",
            content: "What are the top 6 crypto narratives trending on Base right now?",
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.bankrLlmKey}`,
        },
        timeout: 15000,
      }
    );

    const raw = aiRes.data?.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const narratives = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(narratives) || narratives.length === 0) throw new Error("Empty narratives");

    logger.ok(`Narratives scanned: ${narratives.length} found`);
    res.json(narratives);
  } catch (err) {
    logger.warn(`Narrative scan failed, returning fallback: ${err.message}`);
    res.json(FALLBACK_NARRATIVES);
  }
});

module.exports = router;
