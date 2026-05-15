const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../utils/envConfig");
const logger = require("../utils/synthLogger");
const { repoStatus, reviewChanges, commitChanges, pushChanges } = require("../services/gitlawb/gitService");
const { cloneRepo } = require("../services/gitlawb/repoService");
const { getOrCreateIdentity } = require("../services/gitlawb/identity");

/////////////////////////////////////////////////
// AUTONOMOUS CODING AGENT
//
// Given a natural language task, this agent:
// 1. Analyzes the target repository
// 2. Identifies relevant files
// 3. Plans changes via LLM
// 4. Applies file edits
// 5. Commits and pushes to GitLawb
// 6. Summarizes what changed
//
// This is the core of the AI-native dev workflow.
/////////////////////////////////////////////////

const MAX_FILE_SIZE = 32 * 1024; // 32KB per file for LLM context
const MAX_FILES_IN_CONTEXT = 8;

/**
 * Read files from a repo directory for LLM context.
 */
function gatherContext(repoDir, targetFiles = []) {
  const files = [];

  function walk(dir, depth = 0) {
    if (depth > 3) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".css", ".html", ".json", ".md"].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  // If specific files requested, prioritize those
  if (targetFiles.length > 0) {
    for (const f of targetFiles) {
      const abs = path.isAbsolute(f) ? f : path.join(repoDir, f);
      if (fs.existsSync(abs)) files.unshift(abs);
    }
  }

  walk(repoDir);

  // Deduplicate and limit
  const seen = new Set();
  const unique = files.filter((f) => {
    if (seen.has(f)) return false;
    seen.add(f);
    return true;
  });

  return unique.slice(0, MAX_FILES_IN_CONTEXT).map((filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const relative = path.relative(repoDir, filePath);
      return {
        path: relative,
        content: content.slice(0, MAX_FILE_SIZE),
        truncated: content.length > MAX_FILE_SIZE,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Call the LLM to plan and generate code changes.
 */
async function planChanges(task, repoContext) {
  logger.ai(`Planning changes for task: "${task}"`);

  const fileList = repoContext.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");

  const systemPrompt = `You are an expert autonomous software engineer called BankrSynth Agent.
You will receive:
1. A task description
2. The relevant source files

Your job is to generate the exact file changes needed to complete the task.

IMPORTANT — respond with ONLY valid JSON in this exact format:
{
  "plan": "Brief description of what you'll do",
  "changes": [
    {
      "file": "relative/path/to/file.js",
      "action": "modify",
      "content": "the complete new file content here"
    }
  ],
  "commitMessage": "fix: short description of what was changed",
  "summary": "Human-readable summary of all changes made"
}

Rules:
- action can be: "modify", "create", "delete"
- For "modify" and "create", include the COMPLETE file content (not diffs)
- For "delete", content is null
- Keep changes minimal and focused on the task
- commitMessage must follow conventional commits format`;

  const userPrompt = `Task: ${task}\n\nRepository files:\n\n${fileList}`;

  const res = await axios.post(
    `${config.llmApiUrl}/chat/completions`,
    {
      model: config.llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.bankrLlmKey}`,
      },
      timeout: 60000,
    }
  );

  const raw = res.data?.choices?.[0]?.message?.content || "";

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/({[\s\S]*})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 500)}`);
  }
}

/**
 * Apply file changes to the repository.
 */
function applyChanges(repoDir, changes) {
  const applied = [];
  for (const change of changes) {
    // Prevent path traversal
    const safePath = path.join(repoDir, change.file.replace(/\.\.\//g, ""));
    const dir = path.dirname(safePath);

    if (change.action === "delete") {
      if (fs.existsSync(safePath)) {
        fs.unlinkSync(safePath);
        applied.push({ action: "deleted", file: change.file });
        logger.git(`Deleted: ${change.file}`);
      }
    } else {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(safePath, change.content, "utf8");
      applied.push({ action: change.action, file: change.file });
      logger.git(`${change.action === "create" ? "Created" : "Modified"}: ${change.file}`);
    }
  }
  return applied;
}

/**
 * Main coding agent entry point.
 * @param {object} opts
 * @param {string} opts.task - Natural language task description
 * @param {string} opts.repoDir - Absolute path to the local repository
 * @param {string} [opts.repoName] - Repo name (used for repoDir resolution if no repoDir)
 * @param {string[]} [opts.targetFiles] - Hint: specific files to focus on
 * @param {boolean} [opts.autoPush] - Auto-push after commit (default: false)
 * @param {function} [opts.onStep] - Callback for step-by-step progress events
 * @returns {Promise<object>} - Full result with changes, commit, summary
 */
async function runCodingAgent(opts) {
  if (!opts.task) throw new Error("Task description is required");
  if (!opts.repoDir && !opts.repoName) throw new Error("repoDir or repoName is required");

  const repoDir = opts.repoDir || require("../services/gitlawb/gitlawbClient").repoPath(opts.repoName);

  if (!fs.existsSync(repoDir)) {
    throw new Error(`Repository directory not found: ${repoDir}`);
  }

  const step = (msg, data) => {
    logger.agent(msg);
    if (opts.onStep) opts.onStep({ msg, data, ts: Date.now() });
  };

  step("Initializing coding agent", { task: opts.task, repoDir });

  // Step 1: Get identity
  const identity = await getOrCreateIdentity();
  step(`Identity: ${identity.did}`);

  // Step 2: Analyze repo
  step("Analyzing repository...");
  const status = await repoStatus({ repoDir }).catch(() => ({ branch: "main", clean: true, changes: [] }));
  step(`Branch: ${status.branch}, Clean: ${status.clean}`);

  // Step 3: Gather file context
  step("Gathering code context...");
  const context = gatherContext(repoDir, opts.targetFiles || []);
  step(`Context: ${context.length} files loaded`);

  if (context.length === 0) {
    throw new Error("No source files found in repository");
  }

  // Step 4: Plan changes with LLM
  step("Consulting AI for change plan...");
  const plan = await planChanges(opts.task, context);
  step(`Plan: ${plan.plan}`, { changes: plan.changes.length });

  if (!plan.changes || plan.changes.length === 0) {
    return {
      success: true,
      task: opts.task,
      plan: plan.plan,
      changes: [],
      committed: false,
      summary: plan.summary || "No changes required for this task.",
    };
  }

  // Step 5: Apply changes
  step(`Applying ${plan.changes.length} file change(s)...`);
  const applied = applyChanges(repoDir, plan.changes);
  step(`Applied: ${applied.map((c) => c.file).join(", ")}`);

  // Step 6: Commit
  const commitMsg = plan.commitMessage || `agent: ${opts.task.slice(0, 72)}`;
  step(`Committing: "${commitMsg}"`);

  let commitResult;
  try {
    commitResult = await commitChanges({
      repoDir,
      message: commitMsg,
      authorName: "BankrSynth Agent",
      authorEmail: "agent@bankrsynth.ai",
    });
    step(`Committed: ${commitResult.hash || "ok"}`);
  } catch (err) {
    logger.warn(`Commit failed (possibly nothing staged): ${err.message}`);
    commitResult = { success: false, error: err.message };
  }

  // Step 7: Optionally push
  let pushResult = null;
  if (opts.autoPush && commitResult.success) {
    step("Pushing to GitLawb...");
    try {
      pushResult = await pushChanges({ repoDir, onData: opts.onStep ? (l) => opts.onStep({ msg: l }) : undefined });
      step("Push complete");
    } catch (err) {
      logger.warn(`Push failed: ${err.message}`);
      pushResult = { success: false, error: err.message };
    }
  }

  const result = {
    success: true,
    task: opts.task,
    identity: identity.did,
    plan: plan.plan,
    changes: applied,
    commitMessage: commitMsg,
    commit: commitResult,
    push: pushResult,
    summary: plan.summary || `Applied ${applied.length} change(s) and committed.`,
  };

  step("Coding agent complete", result);
  return result;
}

module.exports = { runCodingAgent, gatherContext, planChanges, applyChanges };
