const { gl, isGlAvailable } = require("./gitlawbClient");
const config = require("../../utils/envConfig");
const logger = require("../../utils/synthLogger");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

/////////////////////////////////////////////////
// DID IDENTITY MANAGEMENT
// Creates and manages GitLawb DID identities.
// DIDs follow the did:gitlawb: method spec.
/////////////////////////////////////////////////

const IDENTITY_FILE = path.join(process.cwd(), "data", "gitlawb-identity.json");

/**
 * Load saved DID identity from disk.
 */
function loadIdentity() {
  try {
    if (fs.existsSync(IDENTITY_FILE)) {
      return JSON.parse(fs.readFileSync(IDENTITY_FILE, "utf8"));
    }
  } catch (err) {
    logger.warn(`Could not load identity file: ${err.message}`);
  }
  return null;
}

/**
 * Save DID identity to disk.
 */
function saveIdentity(identity) {
  const dir = path.dirname(IDENTITY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2));
  logger.ok(`Identity saved: ${identity.did}`);
}

/**
 * Create a new GitLawb DID identity via CLI or API.
 * @param {object} opts
 * @param {string} [opts.name] - Human-readable agent name
 * @param {boolean} [opts.force] - Overwrite existing identity
 */
async function createIdentity(opts = {}) {
  const existing = loadIdentity();
  if (existing && !opts.force) {
    logger.info(`Using existing identity: ${existing.did}`);
    return existing;
  }

  logger.agent(`Creating DID identity for BankrSynth agent...`);

  const available = await isGlAvailable();

  if (available) {
    const args = ["identity", "create"];
    if (opts.name) args.push("--name", opts.name);
    args.push("--json");

    const { stdout } = await gl(args);
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = { did: stdout.trim(), raw: stdout };
    }
    const identity = {
      did: parsed.did || parsed.id,
      publicKey: parsed.publicKey || parsed.key,
      name: opts.name || "bankrsynth-agent",
      createdAt: new Date().toISOString(),
      raw: parsed,
    };
    saveIdentity(identity);
    return identity;
  }

  // API fallback
  if (config.gitlawbApiKey) {
    logger.info("Creating identity via GitLawb API...");
    const res = await axios.post(
      `${config.gitlawbApiUrl}/v1/identities`,
      { name: opts.name || "bankrsynth-agent" },
      { headers: { Authorization: `Bearer ${config.gitlawbApiKey}` } }
    );
    const identity = {
      did: res.data.did,
      publicKey: res.data.publicKey,
      name: opts.name || "bankrsynth-agent",
      createdAt: new Date().toISOString(),
      raw: res.data,
    };
    saveIdentity(identity);
    return identity;
  }

  // Generate a local deterministic DID from wallet address as last resort
  const walletAddr = config.myWallet || "0x0000000000000000000000000000000000000000";
  const identity = {
    did: `did:gitlawb:${walletAddr.toLowerCase().slice(2)}`,
    publicKey: walletAddr,
    name: opts.name || "bankrsynth-agent",
    createdAt: new Date().toISOString(),
    provisional: true,
  };
  saveIdentity(identity);
  logger.warn("Created provisional local DID — register with GitLawb for full functionality");
  return identity;
}

/**
 * Get current identity, creating one if none exists.
 */
async function getOrCreateIdentity() {
  const existing = loadIdentity();
  if (existing) return existing;
  return createIdentity({ name: "bankrsynth-agent" });
}

/**
 * Resolve a DID document.
 */
async function resolveIdentity(did) {
  logger.info(`Resolving DID: ${did}`);

  const available = await isGlAvailable();
  if (available) {
    const { stdout } = await gl(["identity", "resolve", did, "--json"]);
    try {
      return JSON.parse(stdout);
    } catch {
      return { did, raw: stdout };
    }
  }

  if (config.gitlawbApiKey) {
    const res = await axios.get(
      `${config.gitlawbApiUrl}/v1/identities/${encodeURIComponent(did)}`,
      { headers: { Authorization: `Bearer ${config.gitlawbApiKey}` } }
    );
    return res.data;
  }

  throw new Error("Cannot resolve DID: gl CLI and API key both unavailable");
}

module.exports = {
  createIdentity,
  getOrCreateIdentity,
  loadIdentity,
  resolveIdentity,
};
