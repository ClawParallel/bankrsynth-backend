const { EventEmitter } = require("events");

/////////////////////////////////////////////////
// SYNTH TERMINAL LOGGER
// Cyberterminal aesthetic: neon green on black
// Also broadcasts to SSE clients for frontend
/////////////////////////////////////////////////

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  cyan: "\x1b[36m",
  brightCyan: "\x1b[96m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  dim: "\x1b[2m",
  white: "\x1b[97m",
};

const GLYPHS = {
  boot: "⬡",
  ok: "✦",
  info: "◈",
  warn: "◉",
  error: "✗",
  run: "▶",
  done: "◆",
  agent: "⬢",
  git: "⌥",
  push: "↑",
  pull: "↓",
  commit: "◎",
  repo: "⬡",
  id: "◈",
  ai: "⬟",
  deploy: "⚡",
  stream: "~",
};

class SynthLogger extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  _stamp() {
    const now = new Date();
    return (
      ANSI.dim +
      ANSI.green +
      `[${now.toISOString().replace("T", " ").slice(0, 19)}]` +
      ANSI.reset
    );
  }

  _emit(level, glyph, color, msg, meta) {
    const line = `${this._stamp()} ${color}${ANSI.bold}${glyph}${ANSI.reset} ${color}${msg}${ANSI.reset}`;
    console.log(line);

    // Broadcast to SSE subscribers
    this.emit("log", {
      ts: Date.now(),
      level,
      glyph,
      msg,
      meta: meta || null,
    });
  }

  boot(msg, meta) {
    this._emit("boot", GLYPHS.boot, ANSI.brightGreen, `BOOT  ${msg}`, meta);
  }

  ok(msg, meta) {
    this._emit("ok", GLYPHS.ok, ANSI.brightGreen, `OK    ${msg}`, meta);
  }

  info(msg, meta) {
    this._emit("info", GLYPHS.info, ANSI.cyan, `INFO  ${msg}`, meta);
  }

  warn(msg, meta) {
    this._emit("warn", GLYPHS.warn, ANSI.yellow, `WARN  ${msg}`, meta);
  }

  error(msg, meta) {
    this._emit("error", GLYPHS.error, ANSI.red, `ERR   ${msg}`, meta);
  }

  run(msg, meta) {
    this._emit("run", GLYPHS.run, ANSI.brightCyan, `RUN   ${msg}`, meta);
  }

  done(msg, meta) {
    this._emit("done", GLYPHS.done, ANSI.brightGreen, `DONE  ${msg}`, meta);
  }

  agent(msg, meta) {
    this._emit("agent", GLYPHS.agent, ANSI.magenta, `AGENT ${msg}`, meta);
  }

  git(msg, meta) {
    this._emit("git", GLYPHS.git, ANSI.cyan, `GIT   ${msg}`, meta);
  }

  ai(msg, meta) {
    this._emit("ai", GLYPHS.ai, ANSI.brightCyan, `AI    ${msg}`, meta);
  }

  deploy(msg, meta) {
    this._emit("deploy", GLYPHS.deploy, ANSI.yellow, `DEPLOY ${msg}`, meta);
  }

  raw(msg) {
    console.log(`${ANSI.dim}${ANSI.green}${GLYPHS.stream} ${msg}${ANSI.reset}`);
    this.emit("log", { ts: Date.now(), level: "raw", msg });
  }

  banner() {
    const lines = [
      "",
      `${ANSI.brightGreen}${ANSI.bold}  ██████╗  █████╗ ███╗   ██╗██╗  ██╗██████╗ ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗`,
      `  ██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝██╔══██╗██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║`,
      `  ██████╔╝███████║██╔██╗ ██║█████╔╝ ██████╔╝███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║`,
      `  ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗ ██╔══██╗╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║`,
      `  ██████╔╝██║  ██║██║ ╚████║██║  ██╗██║  ██║███████║   ██║   ██║ ╚████║   ██║   ██║  ██║`,
      `  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝`,
      `${ANSI.reset}`,
      `${ANSI.green}  AI-NATIVE AUTONOMOUS DEVELOPMENT TERMINAL  ◈  GITLAWB INTEGRATION${ANSI.reset}`,
      "",
    ];
    lines.forEach((l) => console.log(l));
  }
}

module.exports = new SynthLogger();
