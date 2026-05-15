const { gl, git, repoPath, isGlAvailable } = require("./gitlawbClient");
const logger = require("../../utils/synthLogger");
const fs = require("fs");

/////////////////////////////////////////////////
// GIT OPERATIONS SERVICE
// commit / push / pull / status / log
// Works in any local GitLawb repo directory.
/////////////////////////////////////////////////

/**
 * Get the status of a repository.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name (resolves to workdir path)
 * @param {string} [opts.repoDir] - Explicit directory path
 */
async function repoStatus(opts) {
  const dir = opts.repoDir || repoPath(opts.repoName);
  logger.git(`Status: ${dir}`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const { stdout } = await gl(["status", "--json"], { cwd: dir });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git
    }
  }

  const [statusRes, branchRes] = await Promise.all([
    git(dir, ["status", "--porcelain"]),
    git(dir, ["branch", "--show-current"]),
  ]);

  const lines = statusRes.stdout.split("\n").filter(Boolean);
  return {
    branch: branchRes.stdout.trim(),
    clean: lines.length === 0,
    changes: lines.map((l) => ({
      status: l.slice(0, 2).trim(),
      file: l.slice(3),
    })),
  };
}

/**
 * Stage files and create a commit.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name
 * @param {string} [opts.repoDir] - Explicit directory path
 * @param {string} opts.message - Commit message
 * @param {string[]} [opts.files] - Files to stage (default: all)
 * @param {string} [opts.authorName] - Git author name
 * @param {string} [opts.authorEmail] - Git author email
 */
async function commitChanges(opts) {
  if (!opts.message) throw new Error("Commit message required");
  const dir = opts.repoDir || repoPath(opts.repoName);
  logger.git(`Committing in ${dir}: "${opts.message}"`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const args = ["commit", "-m", opts.message];
      if (opts.files && opts.files.length > 0) {
        args.push("--files", ...opts.files);
      }
      args.push("--json");
      const { stdout } = await gl(args, { cwd: dir });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git
    }
  }

  const filesToStage = opts.files && opts.files.length > 0 ? opts.files : ["."];
  const env = {};
  if (opts.authorName) env.GIT_AUTHOR_NAME = opts.authorName;
  if (opts.authorEmail) env.GIT_AUTHOR_EMAIL = opts.authorEmail;
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "BankrSynth Agent";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "agent@bankrsynth.ai";
  env.GIT_COMMITTER_NAME = env.GIT_AUTHOR_NAME;
  env.GIT_COMMITTER_EMAIL = env.GIT_AUTHOR_EMAIL;

  await git(dir, ["add", ...filesToStage], { env });
  const { stdout } = await git(dir, ["commit", "-m", opts.message], { env });

  // Extract commit hash from output
  const hashMatch = stdout.match(/\[[\w\s]+\s+([a-f0-9]+)\]/);
  return {
    success: true,
    hash: hashMatch ? hashMatch[1] : null,
    message: opts.message,
    raw: stdout,
  };
}

/**
 * Push changes to GitLawb remote.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name
 * @param {string} [opts.repoDir] - Explicit directory path
 * @param {string} [opts.remote] - Remote name (default: origin)
 * @param {string} [opts.branch] - Branch name (default: current)
 * @param {function} [opts.onData] - Streaming output callback
 */
async function pushChanges(opts) {
  const dir = opts.repoDir || repoPath(opts.repoName);
  const remote = opts.remote || "origin";
  logger.git(`Pushing ${dir} → ${remote}`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const args = ["push"];
      if (opts.remote) args.push("--remote", opts.remote);
      if (opts.branch) args.push("--branch", opts.branch);
      args.push("--json");
      const { stdout } = await gl(args, { cwd: dir, onData: opts.onData, timeout: 60000 });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git
    }
  }

  const branch = opts.branch || (await git(dir, ["branch", "--show-current"])).stdout.trim();
  const { stdout } = await git(dir, ["push", remote, branch], {
    onData: opts.onData,
    timeout: 60000,
  });

  return { success: true, remote, branch, raw: stdout };
}

/**
 * Pull changes from GitLawb remote.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name
 * @param {string} [opts.repoDir] - Explicit directory path
 * @param {string} [opts.remote] - Remote name (default: origin)
 * @param {string} [opts.branch] - Branch name
 * @param {function} [opts.onData] - Streaming output callback
 */
async function pullChanges(opts) {
  const dir = opts.repoDir || repoPath(opts.repoName);
  const remote = opts.remote || "origin";
  logger.git(`Pulling ${remote} → ${dir}`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const args = ["pull"];
      if (opts.remote) args.push("--remote", opts.remote);
      if (opts.branch) args.push("--branch", opts.branch);
      args.push("--json");
      const { stdout } = await gl(args, { cwd: dir, onData: opts.onData, timeout: 60000 });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git
    }
  }

  const pullArgs = ["pull", remote];
  if (opts.branch) pullArgs.push(opts.branch);
  const { stdout } = await git(dir, pullArgs, {
    onData: opts.onData,
    timeout: 60000,
  });

  return { success: true, remote, raw: stdout };
}

/**
 * Get commit history for a repository.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name
 * @param {string} [opts.repoDir] - Explicit directory path
 * @param {number} [opts.limit] - Max commits to return (default: 20)
 * @param {string} [opts.branch] - Branch (default: HEAD)
 */
async function commitHistory(opts) {
  const dir = opts.repoDir || repoPath(opts.repoName);
  const limit = opts.limit || 20;
  logger.git(`History: ${dir} (last ${limit})`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const args = ["log", "--limit", String(limit), "--json"];
      if (opts.branch) args.push("--branch", opts.branch);
      const { stdout } = await gl(args, { cwd: dir });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git
    }
  }

  const format = "%H|%an|%ae|%ai|%s";
  const gitArgs = [
    "log",
    `--max-count=${limit}`,
    `--pretty=format:${format}`,
  ];
  if (opts.branch) gitArgs.push(opts.branch);

  const { stdout } = await git(dir, gitArgs);
  const commits = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, email, date, ...subjectParts] = line.split("|");
      return { hash, author, email, date, subject: subjectParts.join("|") };
    });

  return { commits, total: commits.length };
}

/**
 * Review changes (diff) in a repository.
 * @param {object} opts
 * @param {string} opts.repoName - Repo name
 * @param {string} [opts.repoDir] - Explicit directory path
 * @param {string} [opts.base] - Base ref (default: HEAD)
 * @param {string} [opts.compare] - Compare ref (default: working tree)
 * @param {string[]} [opts.files] - Specific files
 */
async function reviewChanges(opts) {
  const dir = opts.repoDir || repoPath(opts.repoName);
  logger.git(`Reviewing diff: ${dir}`);

  const available = await isGlAvailable();

  if (available) {
    try {
      const args = ["review", "--json"];
      if (opts.base) args.push("--base", opts.base);
      const { stdout } = await gl(args, { cwd: dir });
      try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
    } catch {
      // fallback to git diff
    }
  }

  const diffArgs = ["diff", "--stat"];
  if (opts.base) diffArgs.push(opts.base);
  if (opts.compare) diffArgs.push(opts.compare);
  if (opts.files && opts.files.length) diffArgs.push("--", ...opts.files);

  const [statRes, patchRes] = await Promise.all([
    git(dir, diffArgs),
    git(dir, ["diff", ...(opts.base ? [opts.base] : []), ...(opts.files || [])]),
  ]);

  return {
    stat: statRes.stdout,
    patch: patchRes.stdout,
    hasChanges: patchRes.stdout.length > 0,
  };
}

module.exports = {
  repoStatus,
  commitChanges,
  pushChanges,
  pullChanges,
  commitHistory,
  reviewChanges,
};
