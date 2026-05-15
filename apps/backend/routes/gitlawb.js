const express = require("express");
const router = express.Router();
const logger = require("../utils/synthLogger");

const { createIdentity, getOrCreateIdentity, resolveIdentity } = require("../services/gitlawb/identity");
const { createRepo, cloneRepo, listRepos } = require("../services/gitlawb/repoService");
const {
  repoStatus,
  commitChanges,
  pushChanges,
  pullChanges,
  commitHistory,
  reviewChanges,
} = require("../services/gitlawb/gitService");
const { runCodingAgent } = require("../agent/codingAgent");
const { executeSkill, listSkills } = require("../skills/gitlawb/index");

/////////////////////////////////////////////////
// GITLAWB REST ROUTES
// Mounted at /gitlawb
/////////////////////////////////////////////////

// ─── IDENTITY ───────────────────────────────

router.post("/identity/create", async (req, res) => {
  try {
    const { name, force } = req.body;
    const identity = await createIdentity({ name, force });
    res.json({ success: true, identity });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/identity", async (req, res) => {
  try {
    const identity = await getOrCreateIdentity();
    res.json({ success: true, identity });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/identity/resolve/:did", async (req, res) => {
  try {
    const doc = await resolveIdentity(req.params.did);
    res.json({ success: true, doc });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── REPO ────────────────────────────────────

router.post("/repo/create", async (req, res) => {
  try {
    const { name, description, private: priv, initReadme } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const result = await createRepo({ name, description, private: priv, initReadme });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/repo/clone", async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });

    const result = await cloneRepo({ url, name });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/repo/list", async (req, res) => {
  try {
    const result = await listRepos();
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/repo/status", async (req, res) => {
  try {
    const { repoName, repoDir } = req.query;
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await repoStatus({ repoName, repoDir });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GIT OPERATIONS ──────────────────────────

router.post("/commit", async (req, res) => {
  try {
    const { repoName, repoDir, message, files } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await commitChanges({ repoName, repoDir, message, files });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/push", async (req, res) => {
  try {
    const { repoName, repoDir, remote, branch } = req.body;
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await pushChanges({ repoName, repoDir, remote, branch });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/pull", async (req, res) => {
  try {
    const { repoName, repoDir, remote, branch } = req.body;
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await pullChanges({ repoName, repoDir, remote, branch });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const { repoName, repoDir, limit, branch } = req.query;
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await commitHistory({
      repoName,
      repoDir,
      limit: limit ? parseInt(limit) : 20,
      branch,
    });
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/review", async (req, res) => {
  try {
    const { repoName, repoDir, base, files, aiReview } = req.body;
    if (!repoName && !repoDir) return res.status(400).json({ error: "repoName or repoDir required" });

    const result = await reviewChanges({ repoName, repoDir, base, files });

    // If AI review requested, delegate to skill
    if (aiReview !== false) {
      const skillResult = await executeSkill("gitlawb-review", { repoName, repoDir, base, files, aiReview: true });
      return res.json({ success: true, result: skillResult.result });
    }

    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTONOMOUS CODING AGENT ──────────────────

router.post("/agent/code", async (req, res) => {
  try {
    const { task, repoDir, repoName, targetFiles, autoPush } = req.body;
    if (!task) return res.status(400).json({ error: "task required" });
    if (!repoDir && !repoName) return res.status(400).json({ error: "repoDir or repoName required" });

    const steps = [];

    const result = await runCodingAgent({
      task,
      repoDir,
      repoName,
      targetFiles,
      autoPush: autoPush || false,
      onStep: (step) => steps.push(step),
    });

    res.json({ success: true, result, steps });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── SKILL EXECUTOR ───────────────────────────

router.post("/skill/:skillName", async (req, res) => {
  try {
    const { skillName } = req.params;
    const input = req.body;

    const result = await executeSkill(skillName, input);
    res.json({ success: true, result });
  } catch (err) {
    logger.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

router.get("/skills", (req, res) => {
  res.json({ success: true, skills: listSkills() });
});

module.exports = router;
