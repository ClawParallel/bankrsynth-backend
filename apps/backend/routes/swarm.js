const express = require("express");
const router = express.Router();
const logger = require("../utils/synthLogger");

/////////////////////////////////////////////////
// SWARM AGENT REGISTRY
// In-memory registry of agent definitions.
// Extended by codingAgent.js when tasks run.
/////////////////////////////////////////////////

const AGENTS = {
  "coding-agent": {
    id: "coding-agent",
    name: "Coding Agent",
    type: "coding",
    glyph: "⬢",
    description: "Autonomous code generation and modification",
    status: "idle",
    task: null,
    startedAt: null,
    completedAt: null,
    executions: 0,
    uptime: Date.now(),
  },
  "deploy-agent": {
    id: "deploy-agent",
    name: "Deploy Agent",
    type: "deploy",
    glyph: "⚡",
    description: "Token and contract deployment orchestration",
    status: "idle",
    task: null,
    startedAt: null,
    completedAt: null,
    executions: 0,
    uptime: Date.now(),
  },
  "monitor-agent": {
    id: "monitor-agent",
    name: "Monitor Agent",
    type: "monitor",
    glyph: "◈",
    description: "Continuous chain and system monitoring",
    status: "active",
    task: "Watching Base chain events",
    startedAt: Date.now() - 180000,
    completedAt: null,
    executions: 47,
    uptime: Date.now() - 3600000,
  },
  "review-agent": {
    id: "review-agent",
    name: "Review Agent",
    type: "review",
    glyph: "◉",
    description: "AI code review and diff analysis",
    status: "idle",
    task: null,
    startedAt: null,
    completedAt: null,
    executions: 12,
    uptime: Date.now() - 7200000,
  },
  "intel-agent": {
    id: "intel-agent",
    name: "Intel Agent",
    type: "intel",
    glyph: "⬟",
    description: "Crypto narrative and market intelligence",
    status: "active",
    task: "Scanning Base ecosystem narratives",
    startedAt: Date.now() - 60000,
    completedAt: null,
    executions: 234,
    uptime: Date.now() - 86400000,
  },
};

// Execution log ring buffer (last 50 events)
const executionLog = [];
const MAX_LOG = 50;

function logExecution(agentId, action, meta = {}) {
  const agent = AGENTS[agentId];
  if (!agent) return;
  executionLog.unshift({
    ts: Date.now(),
    agentId,
    agentName: agent.name,
    glyph: agent.glyph,
    action,
    ...meta,
  });
  if (executionLog.length > MAX_LOG) executionLog.length = MAX_LOG;
}

// Export registry so coding agent can update it
module.exports.agentRegistry = AGENTS;
module.exports.logExecution = logExecution;

/**
 * GET /swarm/status
 * Returns all agent states + swarm telemetry.
 */
router.get("/status", (req, res) => {
  const agents = Object.values(AGENTS);
  res.json({
    success: true,
    ts: Date.now(),
    agents,
    activeCount: agents.filter((a) => a.status === "active").length,
    idleCount: agents.filter((a) => a.status === "idle").length,
    totalExecutions: agents.reduce((n, a) => n + a.executions, 0),
    log: executionLog.slice(0, 20),
  });
});

/**
 * POST /swarm/launch/:agentId
 * Activate a specific agent with a task.
 */
router.post("/launch/:agentId", (req, res) => {
  const { agentId } = req.params;
  const { task } = req.body;
  const agent = AGENTS[agentId];

  if (!agent) return res.status(404).json({ error: `Agent '${agentId}' not found` });
  if (agent.status === "active") return res.status(409).json({ error: "Agent already running" });

  agent.status = "active";
  agent.task = task || "Executing task";
  agent.startedAt = Date.now();
  agent.executions += 1;

  logger.agent(`Swarm launch: ${agent.name} — ${agent.task}`);
  logExecution(agentId, "launched", { task: agent.task });

  // Simulate completion after 8-15s for demo
  const duration = 8000 + Math.random() * 7000;
  setTimeout(() => {
    if (AGENTS[agentId] && AGENTS[agentId].status === "active") {
      AGENTS[agentId].status = "idle";
      AGENTS[agentId].completedAt = Date.now();
      AGENTS[agentId].task = null;
      logger.done(`Swarm complete: ${agent.name}`);
      logExecution(agentId, "completed", { duration: Math.round(duration) });
    }
  }, duration);

  res.json({ success: true, agent: { ...agent } });
});

/**
 * POST /swarm/stop/:agentId
 */
router.post("/stop/:agentId", (req, res) => {
  const agent = AGENTS[req.params.agentId];
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  agent.status = "idle";
  agent.task = null;
  logger.warn(`Swarm stopped: ${agent.name}`);
  logExecution(req.params.agentId, "stopped");

  res.json({ success: true, agent });
});

module.exports.router = router;
