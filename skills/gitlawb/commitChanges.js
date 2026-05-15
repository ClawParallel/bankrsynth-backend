const { commitChanges } = require("../../services/gitlawb/gitService");
const logger = require("../../utils/synthLogger");

/////////////////////////////////////////////////
// SKILL: commitChanges
// Stage and commit changes in a repo.
/////////////////////////////////////////////////

const schema = {
  name: "gitlawb-commit",
  description: "Stage and commit changes in a GitLawb repository",
  input: {
    repoName: { type: "string", required: false, description: "Repo name (resolved from workdir)" },
    repoDir: { type: "string", required: false, description: "Explicit repo directory path" },
    message: { type: "string", required: true, description: "Commit message" },
    files: { type: "array", required: false, description: "Files to stage (default: all)" },
  },
};

async function execute(input) {
  if (!input.message) throw new Error("Commit message is required");
  if (!input.repoName && !input.repoDir) throw new Error("repoName or repoDir required");

  logger.agent(`[commit] "${input.message}" in ${input.repoName || input.repoDir}`);

  const result = await commitChanges({
    repoName: input.repoName,
    repoDir: input.repoDir,
    message: input.message,
    files: input.files,
  });

  return {
    success: true,
    skill: schema.name,
    result,
  };
}

module.exports = { schema, execute };
