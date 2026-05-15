const express = require("express");
const router = express.Router();
const logger = require("../utils/synthLogger");

/////////////////////////////////////////////////
// TERMINAL SSE STREAM
// Broadcasts real-time terminal log events to
// frontend clients over Server-Sent Events.
// Frontend connects once and receives all agent
// activity as a live cyberterminal feed.
/////////////////////////////////////////////////

const clients = new Set();

// Attach SSE listener to the global logger
logger.on("log", (event) => {
  const data = JSON.stringify(event);
  for (const client of clients) {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
});

/**
 * GET /terminal/stream
 * Establish SSE connection for real-time terminal output.
 *
 * Query params:
 *   ?since=<timestamp>  (optional) replay recent events since timestamp
 */
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering

  // CORS for SSE
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.flushHeaders();

  // Send boot message
  const bootEvent = {
    ts: Date.now(),
    level: "boot",
    glyph: "⬡",
    msg: "BOOT  BankrSynth terminal stream connected",
    meta: { clientCount: clients.size + 1 },
  };
  res.write(`data: ${JSON.stringify(bootEvent)}\n\n`);

  const client = { res, connectedAt: Date.now() };
  clients.add(client);

  logger.info(`Terminal client connected (total: ${clients.size})`);

  // Heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
    logger.info(`Terminal client disconnected (remaining: ${clients.size})`);
  });
});

/**
 * GET /terminal/clients
 * Returns the number of active SSE connections.
 */
router.get("/clients", (req, res) => {
  res.json({ count: clients.size });
});

/**
 * POST /terminal/broadcast
 * Manually broadcast a message to all terminal clients.
 * Useful for custom notifications from cron jobs.
 */
router.post("/broadcast", (req, res) => {
  const { msg, level } = req.body;
  if (!msg) return res.status(400).json({ error: "msg required" });

  const event = {
    ts: Date.now(),
    level: level || "info",
    glyph: "◈",
    msg: `INFO  ${msg}`,
  };

  logger.emit("log", event);
  res.json({ success: true, sent: clients.size });
});

module.exports = router;
