const { reviewChanges } = require("../../services/gitlawb/gitService");
const axios = require("axios");
const config = require("../../utils/envConfig");
const logger = require("../../utils/synthLogger");

/////////////////////////////////////////////////
// SKILL: reviewChanges
// Diffs the repo and sends to LLM for AI review.
/////////////////////////////////////////////////

const schema = {
  name: "gitlawb-review",
  description: "Review code changes using AI — diff + LLM analysis",
  input: {
    repoName: { type: "string", required: false },
    repoDir: { type: "string", required: false },
    base: { type: "string", required: false },
    files: { type: "array", required: false },
    aiReview: { type: "boolean", required: false, default: true },
  },
};

async function execute(input) {
  if (!input.repoName && !input.repoDir) throw new Error("repoName or repoDir required");

  logger.agent(`[review] ${input.repoName || input.repoDir}`);

  const diff = await reviewChanges({
    repoName: input.repoName,
    repoDir: input.repoDir,
    base: input.base,
    files: input.files,
  });

  if (!diff.hasChanges) {
    return {
      success: true,
      skill: schema.name,
      result: { diff, aiReview: null, summary: "No changes to review." },
    };
  }

  let aiReview = null;

  if (input.aiReview !== false && config.bankrLlmKey && diff.patch) {
    logger.ai("Analyzing diff with AI...");
    try {
      const patch = diff.patch.slice(0, 8000); // limit context
      const res = await axios.post(
        `${config.llmApiUrl}/chat/completions`,
        {
          model: config.llmModel,
          messages: [
            {
              role: "system",
              content:
                "You are a senior code reviewer. Analyze the git diff and provide: 1) Summary of changes 2) Potential issues or bugs 3) Suggestions for improvement 4) Security concerns if any. Be concise and technical.",
            },
            {
              role: "user",
              content: `Review this diff:\n\n\`\`\`diff\n${patch}\n\`\`\``,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.bankrLlmKey}`,
          },
        }
      );
      aiReview = res.data?.choices?.[0]?.message?.content || null;
    } catch (err) {
      logger.warn(`AI review failed: ${err.message}`);
    }
  }

  return {
    success: true,
    skill: schema.name,
    result: { diff, aiReview },
  };
}

module.exports = { schema, execute };
