#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// SYNTH CLI — BankrSynth terminal interface
// Run: pnpm synth <command>
// ══════════════════════════════════════════════════════════════

const https = require("https");
const http = require("http");

const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
const args = process.argv.slice(2);

const G = "\x1b[92m";
const C = "\x1b[96m";
const Y = "\x1b[33m";
const R = "\x1b[31m";
const D = "\x1b[2m";
const RESET = "\x1b[0m";

function log(msg, color = G) { console.log(`${color}◈ ${msg}${RESET}`); }
function err(msg) { console.error(`${R}✗ ${msg}${RESET}`); }
function dim(msg) { console.log(`${D}  ${msg}${RESET}`); }

async function post(path, body) {
  const url = new URL(path, BACKEND);
  const lib = url.protocol === "https:" ? https : http;
  const data = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let out = "";
      res.on("data", (c) => out += c);
      res.on("end", () => {
        try { resolve(JSON.parse(out)); }
        catch { resolve(out); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function get(path) {
  const url = new URL(path, BACKEND);
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      let out = "";
      res.on("data", (c) => out += c);
      res.on("end", () => {
        try { resolve(JSON.parse(out)); }
        catch { resolve(out); }
      });
    }).on("error", reject);
  });
}

function printHelp() {
  console.log(`
${G}  ◈ BANKRSYNTH SYNTH CLI${RESET}

  ${C}Usage:${RESET}
    pnpm synth <command> [args]

  ${C}Commands:${RESET}
    ${G}help${RESET}              Show this help
    ${G}status${RESET}            Backend health check
    ${G}exec <command>${RESET}    Execute a /synth command
    ${G}repo create <n>${RESET}   Create a GitLawb repo
    ${G}commit <repo> <msg>${RESET}  Commit changes
    ${G}push <repo>${RESET}       Push to remote
    ${G}history <repo>${RESET}    Show commit history
    ${G}deploy <task> <repo>${RESET}  Run autonomous coding agent
    ${G}identity${RESET}          Show agent DID identity
    ${G}skills${RESET}            List available skills
    ${G}narratives${RESET}        Scan crypto narratives

  ${C}Examples:${RESET}
    pnpm synth status
    pnpm synth exec "repo create my-project"
    pnpm synth deploy "fix the navbar bug" my-project
    pnpm synth history my-project
`);
}

async function main() {
  const cmd = args[0];

  if (!cmd || cmd === "help") return printHelp();

  if (cmd === "status") {
    try {
      const res = await get("/");
      log(`Backend LIVE — ${res.name} v${res.version}`);
      dim(`Features: ${res.features?.join(", ")}`);
    } catch (e) {
      err(`Backend offline at ${BACKEND}`);
    }
    return;
  }

  if (cmd === "exec") {
    const command = args.slice(1).join(" ");
    if (!command) return err("Usage: pnpm synth exec <command>");
    log(`Executing: /synth ${command}`);
    const res = await post("/synth/exec", { command });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === "identity") {
    const res = await get("/gitlawb/identity");
    if (res.identity) {
      log(`DID: ${res.identity.did}`);
      dim(`Name: ${res.identity.name}`);
      dim(`Created: ${res.identity.createdAt}`);
    } else {
      err(res.error || "No identity found");
    }
    return;
  }

  if (cmd === "skills") {
    const res = await get("/gitlawb/skills");
    if (res.skills) {
      log("Available skills:");
      res.skills.forEach((s) => dim(`  ${s.name} — ${s.description}`));
    }
    return;
  }

  if (cmd === "narratives") {
    log("Scanning narratives...");
    const res = await get("/narratives");
    if (Array.isArray(res)) {
      res.forEach((n) => {
        console.log(`  ${G}${n.strength}%${RESET} ${C}${n.title}${RESET} — ${D}${n.desc}${RESET}`);
      });
    }
    return;
  }

  if (cmd === "deploy") {
    const task = args[1];
    const repoName = args[2];
    if (!task || !repoName) return err("Usage: pnpm synth deploy <task> <repoName>");
    log(`Deploying coding agent: "${task}" on ${repoName}`);
    const res = await post("/gitlawb/agent/code", { task, repoName, autoPush: false });
    if (res.result) {
      log(`Done: ${res.result.summary}`);
      res.steps?.forEach((s) => dim(s.msg));
    } else {
      err(res.error);
    }
    return;
  }

  if (cmd === "history") {
    const repo = args[1];
    if (!repo) return err("Usage: pnpm synth history <repoName>");
    const res = await get(`/gitlawb/history?repoName=${encodeURIComponent(repo)}`);
    if (res.result?.commits) {
      res.result.commits.forEach((c) => {
        console.log(`  ${G}${c.hash?.slice(0,8)}${RESET} ${D}${c.date}${RESET} ${c.subject}`);
      });
    }
    return;
  }

  // Default: treat as synth exec
  const synthCmd = args.join(" ");
  log(`Executing: /synth ${synthCmd}`);
  const res = await post("/synth/exec", { command: synthCmd });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => err(e.message));
