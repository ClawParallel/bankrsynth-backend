const express = require("express");
const router = express.Router();
const logger = require("../utils/synthLogger");
const config = require("../utils/envConfig");
const { executeSkill, listSkills } = require("../skills/gitlawb/index");
const { runCodingAgent } = require("../agent/codingAgent");

/////////////////////////////////////////////////
// SYNTH COMMAND INTERPRETER
// Parses and routes /synth slash commands.
// This is the natural-language terminal interface.
//
// Commands:
//   /synth repo create <name>
//   /synth commit "<message>"
//   /synth push [repoName]
//   /synth pull [repoName]
//   /synth history [repoName]
//   /synth review [repoName]
//   /synth deploy <task> in <repoName>
//   /synth status [repoName]
//   /synth identity
//   /synth skills
/////////////////////////////////////////////////

const COMMANDS = {
  "repo create": { skill: "gitlawb-create-repo", desc: "Create a new GitLawb repository" },
  "repo clone": { skill: "gitlawb-clone-repo", desc: "Clone a repository" },
  "repo list": { skill: null, action: "listRepos", desc: "List all repositories" },
  "commit": { skill: "gitlawb-commit", desc: "Commit changes" },
  "push": { skill: "gitlawb-push", desc: "Push changes to remote" },
  "pull": { skill: "gitlawb-pull", desc: "Pull changes from remote" },
  "history": { skill: "gitlawb-history", desc: "Show commit history" },
  "review": { skill: "gitlawb-review", desc: "AI-powered code review" },
  "status": { skill: "gitlawb-status", desc: "Show repo status" },
  "deploy": { skill: null, action: "codingAgent", desc: "Run autonomous coding agent" },
  "identity": { skill: null, action: "identity", desc: "Show agent identity" },
  "skills": { skill: null, action: "skills", desc: "List available skills" },
  "help": { skill: null, action: "help", desc: "Show available commands" },
};

/**
 * Parse a /synth command string into { command, args }
 * Input can be: "/synth repo create myapp" or just "repo create myapp"
 */
function parseCommand(input) {
  const trimmed = input.replace(/^\/synth\s+/i, "").trim();

  // Try two-word commands first
  for (const cmd of Object.keys(COMMANDS).sort((a, b) => b.length - a.length)) {
    if (trimmed.toLowerCase().startsWith(cmd)) {
      const rest = trimmed.slice(cmd.length).trim();
      return { command: cmd, raw: rest };
    }
  }

  return { command: null, raw: trimmed };
}

/**
 * Parse the "raw" arguments portion of a command into a structured input object.
 * Handles patterns like:
 *   "myrepo"              → { repoName: "myrepo" }
 *   "--message 'fix bug'" → { message: "fix bug" }
 *   "fix navbar bug in myapp" → { task: "fix navbar bug", repoName: "myapp" }
 */
function parseArgs(command, raw) {
  const input = {};

  switch (command) {
    case "repo create": {
      // "myrepo --description 'desc'"
      const nameMatch = raw.match(/^([a-zA-Z0-9_\-]+)/);
      if (nameMatch) input.name = nameMatch[1];
      const descMatch = raw.match(/--description\s+["']?([^"']+)["']?/);
      if (descMatch) input.description = descMatch[1].trim();
      break;
    }
    case "repo clone": {
      const parts = raw.split(/\s+/);
      if (parts[0]) input.url = parts[0];
      if (parts[1]) input.name = parts[1];
      break;
    }
    case "commit": {
      // "fix bug in myapp" or "--message 'fix bug'" or just "fix bug"
      const msgFlag = raw.match(/(?:-m|--message)\s+["']?([^"']+)["']?/i);
      if (msgFlag) {
        input.message = msgFlag[1].trim();
      } else {
        const repoMatch = raw.match(/\s+in\s+([a-zA-Z0-9_\-]+)$/i);
        if (repoMatch) {
          input.repoName = repoMatch[1];
          input.message = raw.replace(repoMatch[0], "").trim();
        } else {
          input.message = raw;
        }
      }
      const repoFlag = raw.match(/--repo\s+([a-zA-Z0-9_\-]+)/i);
      if (repoFlag) input.repoName = repoFlag[1];
      break;
    }
    case "deploy": {
      // "fix navbar bug in myapp" → task="fix navbar bug", repoName="myapp"
      const inMatch = raw.match(/^(.+?)\s+in\s+([a-zA-Z0-9_\-\/]+)$/i);
      if (inMatch) {
        input.task = inMatch[1].trim();
        input.repoName = inMatch[2].trim();
      } else {
        input.task = raw;
      }
      break;
    }
    default: {
      // Generic: first word is repoName
      const parts = raw.split(/\s+/);
      if (parts[0] && /^[a-zA-Z0-9_\-]+$/.test(parts[0])) {
        input.repoName = parts[0];
      }
      break;
    }
  }

  return input;
}

// ─── ROUTE ────────────────────────────────────

/**
 * POST /synth/exec
 * Execute a synth command.
 * Body: { command: "/synth repo create myapp" }
 *   or: { command: "deploy fix navbar bug in myapp" }
 */
router.post("/exec", async (req, res) => {
  const { command } = req.body;

  if (!command) return res.status(400).json({ error: "command required" });

  const { command: cmd, raw } = parseCommand(command);

  if (!cmd) {
    return res.status(400).json({
      error: `Unknown command: "${command}"`,
      hint: "Try: /synth help",
    });
  }

  const entry = COMMANDS[cmd];
  const input = parseArgs(cmd, raw);

  logger.agent(`/synth ${cmd} ${raw}`);

  try {
    // Special actions
    if (entry.action === "help") {
      return res.json({
        success: true,
        commands: Object.entries(COMMANDS).map(([c, e]) => ({
          command: `/synth ${c}`,
          description: e.desc,
        })),
      });
    }

    if (entry.action === "skills") {
      return res.json({ success: true, skills: listSkills() });
    }

    if (entry.action === "identity") {
      const { getOrCreateIdentity } = require("../services/gitlawb/identity");
      const identity = await getOrCreateIdentity();
      return res.json({ success: true, identity });
    }

    if (entry.action === "listRepos") {
      const { listRepos } = require("../services/gitlawb/repoService");
      const result = await listRepos();
      return res.json({ success: true, result });
    }

    if (entry.action === "codingAgent") {
      if (!input.task) return res.status(400).json({ error: "task required. Usage: /synth deploy <task> in <repoName>" });
      if (!input.repoName) return res.status(400).json({ error: "repoName required. Usage: /synth deploy <task> in <repoName>" });

      const steps = [];
      const result = await runCodingAgent({
        task: input.task,
        repoName: input.repoName,
        autoPush: false,
        onStep: (step) => steps.push(step),
      });
      return res.json({ success: true, result, steps });
    }

    // Skill-based commands
    if (entry.skill) {
      const result = await executeSkill(entry.skill, input);
      return res.json({ success: true, command: cmd, result });
    }

    return res.status(400).json({ error: `No handler for command: ${cmd}` });

  } catch (err) {
    logger.error(`Synth command failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /synth/commands
 * List all available /synth commands.
 */
router.get("/commands", (req, res) => {
  res.json({
    success: true,
    commands: Object.entries(COMMANDS).map(([c, e]) => ({
      command: `/synth ${c}`,
      description: e.desc,
      skill: e.skill || null,
    })),
  });
});

module.exports = router;
