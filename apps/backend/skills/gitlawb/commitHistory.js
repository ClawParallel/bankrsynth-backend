const { commitHistory } = require("../../services/gitlawb/gitService");
const logger = require("../../utils/synthLogger");

const schema = {
  name: "gitlawb-history",
  description: "Retrieve the commit history of a GitLawb repository",
  input: {
    repoName: { type: "string", required: false },
    repoDir: { type: "string", required: false },
    limit: { type: "number", required: false, default: 20 },
    branch: { type: "string", required: false },
  },
};

async function execute(input) {
  if (!input.repoName && !input.repoDir) throw new Error("repoName or repoDir required");

  logger.agent(`[history] ${input.repoName || input.repoDir} limit=${input.limit || 20}`);

  const result = await commitHistory({
    repoName: input.repoName,
    repoDir: input.repoDir,
    limit: input.limit || 20,
    branch: input.branch,
  });

  return { success: true, skill: schema.name, result };
}

module.exports = { schema, execute };
