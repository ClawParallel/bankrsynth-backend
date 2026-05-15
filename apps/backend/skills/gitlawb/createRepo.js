const { createRepo } = require("../../services/gitlawb/repoService");
const logger = require("../../utils/synthLogger");

/////////////////////////////////////////////////
// SKILL: createRepo
// Creates a new GitLawb repository.
/////////////////////////////////////////////////

const schema = {
  name: "gitlawb-create-repo",
  description: "Create a new GitLawb repository for the agent",
  input: {
    name: { type: "string", required: true, description: "Repository name (alphanumeric, hyphens)" },
    description: { type: "string", required: false },
    private: { type: "boolean", required: false, default: false },
    initReadme: { type: "boolean", required: false, default: true },
  },
};

async function execute(input) {
  if (!input.name) throw new Error("Repo name is required");
  if (!/^[a-zA-Z0-9_\-]+$/.test(input.name)) {
    throw new Error("Repo name must be alphanumeric (hyphens and underscores allowed)");
  }

  logger.agent(`[createRepo] ${input.name}`);

  const result = await createRepo({
    name: input.name,
    description: input.description,
    private: input.private || false,
    initReadme: input.initReadme !== false,
  });

  return {
    success: true,
    skill: schema.name,
    result,
  };
}

module.exports = { schema, execute };
