const { run, checkInstalled } = require("../../utils/shellRunner");
const logger = require("../../utils/synthLogger");
const config = require("../../utils/envConfig");
const fs = require("fs");
const path = require("path");

/////////////////////////////////////////////////
// GITLAWB CLIENT
// Core wrapper around the `gl` CLI.
// Provides a Node.js API over all GL commands.
// Falls back to git+API where gl is unavailable.
/////////////////////////////////////////////////

let _glAvailable = null;

async function isGlAvailable() {
  if (_glAvailable !== null) return _glAvailable;
  _glAvailable = await checkInstalled("gl");
  if (_glAvailable) {
    logger.ok("GitLawb CLI (gl) detected");
  } else {
    logger.warn("GitLawb CLI (gl) not found — using git+API fallback");
  }
  return _glAvailable;
}

/**
 * Ensure the GitLawb working directory exists.
 */
function ensureWorkdir() {
  const dir = config.gitlawbWorkdir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created GitLawb workdir: ${dir}`);
  }
  return dir;
}

/**
 * Resolve absolute path for a named repo.
 * Prevents path traversal by validating repo name.
 */
function repoPath(name) {
  if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
    throw new Error(`Invalid repo name: ${name}`);
  }
  const workdir = ensureWorkdir();
  return path.join(workdir, name);
}

/**
 * Execute a `gl` command.
 */
async function gl(args, opts = {}) {
  const available = await isGlAvailable();
  if (!available) throw new Error("GitLawb CLI (gl) not installed. Run: npm install -g gitlawb-cli");
  return run("gl", args, opts);
}

/**
 * Execute a `git` command in a specific repo directory.
 */
async function git(repoDir, args, opts = {}) {
  if (!fs.existsSync(repoDir)) {
    throw new Error(`Repo directory not found: ${repoDir}`);
  }
  return run("git", args, { ...opts, cwd: repoDir });
}

module.exports = {
  gl,
  git,
  isGlAvailable,
  repoPath,
  ensureWorkdir,
};
