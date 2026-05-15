/////////////////////////////////////////////////
// GITLAWB SKILL REGISTRY
// Single import point for all GitLawb skills.
// Each skill exports: { schema, execute }
/////////////////////////////////////////////////

const createRepo = require("./createRepo");
const cloneRepo = require("./cloneRepo");
const commitChanges = require("./commitChanges");
const pushChanges = require("./pushChanges");
const pullChanges = require("./pullChanges");
const repoStatus = require("./repoStatus");
const commitHistory = require("./commitHistory");
const reviewChanges = require("./reviewChanges");

const skills = {
  "gitlawb-create-repo": createRepo,
  "gitlawb-clone-repo": cloneRepo,
  "gitlawb-commit": commitChanges,
  "gitlawb-push": pushChanges,
  "gitlawb-pull": pullChanges,
  "gitlawb-status": repoStatus,
  "gitlawb-history": commitHistory,
  "gitlawb-review": reviewChanges,
};

/**
 * Execute a GitLawb skill by name.
 */
async function executeSkill(skillName, input, opts = {}) {
  const skill = skills[skillName];
  if (!skill) {
    const available = Object.keys(skills).join(", ");
    throw new Error(`Unknown GitLawb skill: '${skillName}'. Available: ${available}`);
  }
  return skill.execute(input, opts);
}

/**
 * List all available skill schemas.
 */
function listSkills() {
  return Object.values(skills).map((s) => s.schema);
}

module.exports = { skills, executeSkill, listSkills };
