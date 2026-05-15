const { cloneRepo } = require("../../services/gitlawb/repoService");
const logger = require("../../utils/synthLogger");

/////////////////////////////////////////////////
// SKILL: cloneRepo
// Clones a GitLawb repository locally.
/////////////////////////////////////////////////

const schema = {
  name: "gitlawb-clone-repo",
  description: "Clone a GitLawb repository to the local working directory",
  input: {
    url: { type: "string", required: true, description: "GitLawb repo URL or DID reference" },
    name: { type: "string", required: false, description: "Local directory name override" },
  },
};

async function execute(input, opts = {}) {
  if (!input.url) throw new Error("Repo URL is required");

  logger.agent(`[cloneRepo] ${input.url}`);

  const result = await cloneRepo({
    url: input.url,
    name: input.name,
    onData: opts.onData,
  });

  return {
    success: true,
    skill: schema.name,
    result,
  };
}

module.exports = { schema, execute };
