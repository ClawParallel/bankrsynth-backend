const { spawn } = require("child_process");
const logger = require("./synthLogger");

/////////////////////////////////////////////////
// SAFE SHELL RUNNER
// Executes CLI commands with streaming output,
// timeout support, and injection protection.
/////////////////////////////////////////////////

const SAFE_CMD_PATTERN = /^[a-zA-Z0-9 \-_./:=@"']+$/;

function sanitize(arg) {
  // Strip shell metacharacters from individual arguments
  return String(arg).replace(/[;&|`$(){}[\]<>\\!]/g, "");
}

/**
 * Run a shell command safely.
 * @param {string} cmd - The base command (e.g. "gl", "git")
 * @param {string[]} args - Array of arguments (sanitized)
 * @param {object} opts
 * @param {string} [opts.cwd] - Working directory
 * @param {object} [opts.env] - Additional env vars
 * @param {number} [opts.timeout=30000] - Timeout in ms
 * @param {function} [opts.onData] - Callback for streaming stdout lines
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const safeArgs = args.map(sanitize);
    const cwd = opts.cwd || process.cwd();
    const timeout = opts.timeout || 30000;
    const env = { ...process.env, ...(opts.env || {}) };

    logger.run(`${cmd} ${safeArgs.join(" ")}`, { cwd });

    const child = spawn(cmd, safeArgs, {
      cwd,
      env,
      shell: false, // Never use shell to prevent injection
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      reject(new Error(`Command timed out after ${timeout}ms: ${cmd} ${safeArgs.join(" ")}`));
    }, timeout);

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      chunk.split("\n").forEach((line) => {
        if (line.trim()) {
          logger.raw(line);
          if (opts.onData) opts.onData(line);
        }
      });
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      chunk.split("\n").forEach((line) => {
        if (line.trim()) logger.warn(line);
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        const err = new Error(`Command exited ${code}: ${cmd} ${safeArgs.join(" ")}\n${stderr}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }

      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn '${cmd}': ${err.message}`));
    });
  });
}

/**
 * Check whether a CLI tool is installed.
 */
async function checkInstalled(cmd) {
  try {
    await run("which", [cmd], { timeout: 5000 });
    return true;
  } catch {
    try {
      await run("command", ["-v", cmd], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { run, checkInstalled };
