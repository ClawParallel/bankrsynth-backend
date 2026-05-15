const { gl, git, repoPath, isGlAvailable } = require("./gitlawbClient");
const { getOrCreateIdentity } = require("./identity");
const config = require("../../utils/envConfig");
const logger = require("../../utils/synthLogger");
const axios = require("axios");
const fs = require("fs");

/////////////////////////////////////////////////
// GITLAWB REPO SERVICE
// Create, clone, list repos on GitLawb.
/////////////////////////////////////////////////

/**
 * Create a new GitLawb repository.
 * @param {object} opts
 * @param {string} opts.name - Repo name
 * @param {string} [opts.description] - Repo description
 * @param {boolean} [opts.private] - Private repo
 * @param {boolean} [opts.initReadme] - Initialize with README
 */
async function createRepo(opts) {
  if (!opts.name) throw new Error("Repo name required");
  logger.git(`Creating GitLawb repo: ${opts.name}`);

  const identity = await getOrCreateIdentity();
  const available = await isGlAvailable();

  if (available) {
    const args = ["repo", "create", opts.name];
    if (opts.description) args.push("--description", opts.description);
    if (opts.private) args.push("--private");
    if (opts.initReadme) args.push("--init");
    args.push("--json");

    const { stdout } = await gl(args);
    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      result = { name: opts.name, raw: stdout };
    }
    logger.ok(`Repo created: ${result.url || opts.name}`);
    return { ...result, identity };
  }

  if (config.gitlawbApiKey) {
    const res = await axios.post(
      `${config.gitlawbApiUrl}/v1/repos`,
      {
        name: opts.name,
        description: opts.description || "",
        private: opts.private || false,
        initReadme: opts.initReadme || false,
        did: identity.did,
      },
      { headers: { Authorization: `Bearer ${config.gitlawbApiKey}` } }
    );
    logger.ok(`Repo created via API: ${res.data.url}`);
    return { ...res.data, identity };
  }

  // Local git repo fallback
  const localPath = repoPath(opts.name);
  if (fs.existsSync(localPath)) {
    throw new Error(`Repo already exists locally: ${localPath}`);
  }
  fs.mkdirSync(localPath, { recursive: true });
  await git(localPath.replace(/\/[^/]+$/, ""), ["init", opts.name]);
  if (opts.initReadme) {
    fs.writeFileSync(`${localPath}/README.md`, `# ${opts.name}\n\n${opts.description || ""}\n`);
    await git(localPath, ["add", "."]);
    await git(localPath, ["commit", "-m", "init: initial commit by BankrSynth"]);
  }
  logger.warn(`Created local-only repo (GitLawb CLI and API unavailable): ${localPath}`);
  return {
    name: opts.name,
    path: localPath,
    local: true,
    identity,
  };
}

/**
 * Clone a GitLawb repository.
 * @param {object} opts
 * @param {string} opts.url - GitLawb repo URL or DID reference
 * @param {string} [opts.name] - Local directory name
 * @param {function} [opts.onData] - Streaming output callback
 */
async function cloneRepo(opts) {
  if (!opts.url) throw new Error("Repo URL required");
  logger.git(`Cloning repo: ${opts.url}`);

  const name = opts.name || opts.url.split("/").pop().replace(/\.git$/, "");
  const destPath = repoPath(name);

  if (fs.existsSync(destPath)) {
    logger.warn(`Repo already exists at ${destPath}, skipping clone`);
    return { name, path: destPath, alreadyExists: true };
  }

  const available = await isGlAvailable();

  if (available) {
    const args = ["repo", "clone", opts.url];
    if (opts.name) args.push("--name", opts.name);
    await gl(args, {
      cwd: config.gitlawbWorkdir,
      onData: opts.onData,
      timeout: 120000,
    });
  } else {
    await git(config.gitlawbWorkdir, ["clone", opts.url, name], {
      onData: opts.onData,
      timeout: 120000,
    });
  }

  logger.ok(`Repo cloned to: ${destPath}`);
  return { name, path: destPath, url: opts.url };
}

/**
 * List GitLawb repositories for the current identity.
 */
async function listRepos() {
  logger.git("Listing GitLawb repos...");
  const identity = await getOrCreateIdentity();
  const available = await isGlAvailable();

  if (available) {
    const { stdout } = await gl(["repo", "list", "--json"]);
    try {
      return JSON.parse(stdout);
    } catch {
      return { raw: stdout };
    }
  }

  if (config.gitlawbApiKey) {
    const res = await axios.get(`${config.gitlawbApiUrl}/v1/repos`, {
      headers: { Authorization: `Bearer ${config.gitlawbApiKey}` },
      params: { did: identity.did },
    });
    return res.data;
  }

  // Return local repos
  const workdir = config.gitlawbWorkdir;
  if (!fs.existsSync(workdir)) return { repos: [], local: true };
  const entries = fs.readdirSync(workdir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: `${workdir}/${e.name}`, local: true }));
  return { repos: entries, local: true };
}

module.exports = { createRepo, cloneRepo, listRepos };
