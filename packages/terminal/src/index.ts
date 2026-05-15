// ══════════════════════════════════════════════════════════════
// BANKRSYNTH TERMINAL ENGINE
// Realtime terminal broadcast layer.
// Bridges the synthLogger → SSE clients + Socket.IO rooms.
// ══════════════════════════════════════════════════════════════

import { EventEmitter } from "events";
import type { Server as HttpServer } from "http";
import type { TerminalEvent, LogLevel } from "@bankrsynth/shared";
import { EVENTS } from "@bankrsynth/shared";

// ─── Terminal Bus ─────────────────────────────────────────────
// A singleton EventEmitter that all agents/services write to.
// The SSE router and Socket.IO server both subscribe to it.

class TerminalBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500);
  }

  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  publish(logEvent: TerminalEvent) {
    super.emit("log", logEvent);
    return this;
  }

  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    this.publish({ ts: Date.now(), level, msg, meta: meta ?? null });
    return this;
  }

  boot(msg: string) { return this.log("boot", `BOOT  ${msg}`); }
  ok(msg: string) { return this.log("ok", `OK    ${msg}`); }
  info(msg: string) { return this.log("info", `INFO  ${msg}`); }
  warn(msg: string) { return this.log("warn", `WARN  ${msg}`); }
  error(msg: string) { return this.log("error", `ERR   ${msg}`); }
  run(msg: string) { return this.log("run", `RUN   ${msg}`); }
  done(msg: string) { return this.log("done", `DONE  ${msg}`); }
  agent(msg: string) { return this.log("agent", `AGENT ${msg}`); }
  git(msg: string) { return this.log("git", `GIT   ${msg}`); }
  ai(msg: string) { return this.log("ai", `AI    ${msg}`); }
  deploy(msg: string) { return this.log("deploy", `DEPLOY ${msg}`); }
  raw(msg: string) { return this.log("raw", msg); }
}

export const terminalBus = new TerminalBus();

// ─── SSE Manager ─────────────────────────────────────────────

interface SseClient {
  id: string;
  res: {
    write: (data: string) => void;
    end: () => void;
  };
  connectedAt: number;
}

class SseManager {
  private clients = new Map<string, SseClient>();
  private clientIdCounter = 0;

  constructor() {
    // Forward all terminal bus events to SSE clients
    terminalBus.on("log", (event: TerminalEvent) => {
      this.broadcast(event);
    });
  }

  addClient(res: SseClient["res"]): () => void {
    const id = `sse-${++this.clientIdCounter}`;
    const client: SseClient = { id, res, connectedAt: Date.now() };
    this.clients.set(id, client);

    // Send connect event
    this.sendToClient(client, {
      ts: Date.now(),
      level: "boot",
      msg: "BOOT  BankrSynth terminal stream connected",
      meta: { clientCount: this.clients.size },
    });

    return () => {
      this.clients.delete(id);
    };
  }

  private sendToClient(client: SseClient, event: TerminalEvent) {
    try {
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.clients.delete(client.id);
    }
  }

  broadcast(event: TerminalEvent) {
    for (const client of this.clients.values()) {
      this.sendToClient(client, event);
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}

export const sseManager = new SseManager();

// ─── Socket.IO Manager ───────────────────────────────────────

export function createSocketServer(httpServer: HttpServer) {
  // Dynamic import so packages that don't need WS don't require socket.io
  const { Server } = require("socket.io");

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: {
    id: string;
    emit: (event: string, data?: unknown) => void;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    disconnect: () => void;
  }) => {
    terminalBus.info(`Socket connected: ${socket.id}`);

    // Forward terminal bus events to socket clients
    const handler = (event: TerminalEvent) => {
      socket.emit(EVENTS.TERMINAL_LOG, event);
    };
    terminalBus.on("log", handler);

    socket.emit(EVENTS.CLIENT_COUNT, { count: io.engine.clientsCount });

    socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));

    socket.on("synth:exec", async (data: { command: string }) => {
      terminalBus.agent(`Socket synth:exec — ${data?.command}`);
    });

    socket.on("disconnect", () => {
      terminalBus.on("log", handler); // remove listener
      terminalBus.removeListener("log", handler);
      terminalBus.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Forward terminal bus events to all socket clients
  terminalBus.on("log", (event: TerminalEvent) => {
    io.emit(EVENTS.TERMINAL_LOG, event);
  });

  return io;
}

export type { TerminalEvent, LogLevel };
