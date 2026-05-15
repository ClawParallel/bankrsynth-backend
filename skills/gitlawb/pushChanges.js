const { pushChanges } = require("../../services/gitlawb/gitService");
const logger = require("../../utils/synthLogger");

const schema = {
  name: "gitlawb-push",
  description: "Push committed changes to GitLawb remote",
  input: {
    repoName: { type: "string", required: false },
    repoDir: { type: "string", required: false },
    remote: { type: "string", required: false, default: "origin" },
    branch: { type: "string", required: false },
  },
};

async function execute(input, opts = {}) {
  if (!input.repoName && !input.repoDir) throw new Error("repoName or repoDir required");

  logger.agent(`[push] ${input.repoName || input.repoDir} → ${input.remote || "origin"}`);

  const result = await pushChanges({
    repoName: input.repoName,
    repoDir: input.repoDir,
    remote: input.remote,
    branch: input.branch,
    onData: opts.onData,
  });

  return { success: true, skill: schema.name, result };
}

module.exports = { schema, execute };
