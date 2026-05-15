const { EventEmitter } = require("events");

/////////////////////////////////////////////////
// WEBSOCKET / SOCKET.IO SETUP
// Adds realtime bidirectional communication
// on top of the existing SSE terminal stream.
/////////////////////////////////////////////////

let io = null;

/**
 * Initialize Socket.IO on the HTTP server.
 * Call this after app.listen() returns the server.
 */
function initSocketServer(httpServer) {
  const { Server } = require("socket.io");

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  const logger = require("../utils/synthLogger");

  io.on("connection", (socket) => {
    logger.ok(`Socket connected: ${socket.id} (total: ${io.engine.clientsCount})`);

    // Forward all logger events to this socket
    const logHandler = (event) => {
      socket.emit("synth:terminal", event);
    };
    logger.on("log", logHandler);

    // Send welcome
    socket.emit("synth:terminal", {
      ts: Date.now(),
      level: "boot",
      msg: "BOOT  BankrSynth WebSocket connected",
    });

    socket.emit("system:clients", { count: io.engine.clientsCount });

    // Ping/pong heartbeat
    socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));

    // Execute synth command via WebSocket
    socket.on("synth:exec", async (data) => {
      if (!data?.command) return;
      logger.agent(`WS synth:exec: ${data.command}`);
      try {
        const { parseCommand, parseArgs, COMMANDS } = require("./synth");
        // Delegate to synth router logic
        socket.emit("synth:terminal", {
          ts: Date.now(),
          level: "run",
          msg: `RUN   /synth ${data.command}`,
        });
      } catch (err) {
        socket.emit("synth:terminal", {
          ts: Date.now(),
          level: "error",
          msg: `ERR   ${err.message}`,
        });
      }
    });

    // Swarm status request
    socket.on("swarm:status", () => {
      socket.emit("swarm:update", {
        agents: [],
        ts: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      logger.removeListener("log", logHandler);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.ok("Socket.IO server initialized");
  return io;
}

/**
 * Broadcast an event to all connected socket clients.
 */
function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = { initSocketServer, broadcast };
