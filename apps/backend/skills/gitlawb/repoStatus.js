const { repoStatus } = require("../../services/gitlawb/gitService");
const logger = require("../../utils/synthLogger");

const schema = {
  name: "gitlawb-status",
  description: "Get the current status of a GitLawb repository",
  input: {
    repoName: { type: "string", required: false },
    repoDir: { type: "string", required: false },
  },
};

async function execute(input) {
  if (!input.repoName && !input.repoDir) throw new Error("repoName or repoDir required");

  logger.agent(`[status] ${input.repoName || input.repoDir}`);

  const result = await repoStatus({
    repoName: input.repoName,
    repoDir: input.repoDir,
  });

  return { success: true, skill: schema.name, result };
}

module.exports = { schema, execute };
