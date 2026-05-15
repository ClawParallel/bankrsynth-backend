/////////////////////////////////////////////////
// ENVIRONMENT CONFIGURATION
// Central config loader with validation.
// Fails fast on missing required variables.
/////////////////////////////////////////////////

function get(key, fallback) {
  const val = process.env[key];
  if (val !== undefined && val !== "") return val;
  if (fallback !== undefined) return fallback;
  return undefined;
}

function require_(key) {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const config = {
  // Server
  port: get("PORT", "3000"),
  nodeEnv: get("NODE_ENV", "development"),

  // Bankr
  bankrPartnerKey: get("BANKR_PARTNER_KEY"),
  bankrLlmKey: get("BANKR_LLM_KEY"),
  feeWallet: get("FEE_WALLET"),
  myWallet: get("MY_WALLET"),

  // Net Protocol
  netPrivateKey: get("NET_PRIVATE_KEY"),

  // GitLawb
  gitlawbDidKey: get("GITLAWB_DID_KEY"),
  gitlawbApiUrl: get("GITLAWB_API_URL", "https://api.gitlawb.com"),
  gitlawbApiKey: get("GITLAWB_API_KEY"),
  gitlawbWorkdir: get("GITLAWB_WORKDIR", "/tmp/gitlawb-repos"),

  // LLM routing
  llmApiUrl: get("LLM_API_URL", "https://llm.bankr.bot/v1"),
  llmModel: get("LLM_MODEL", "gpt-5-mini"),

  // Feature flags
  enableCron: get("ENABLE_CRON", "true") === "true",
  enableGitlawb: get("ENABLE_GITLAWB", "true") === "true",
};

module.exports = config;
