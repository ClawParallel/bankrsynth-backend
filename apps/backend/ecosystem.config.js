// ══════════════════════════════════════════════════════════════
// PM2 ECOSYSTEM — BankrSynth Backend
// Usage:
//   pm2 start ecosystem.config.js               # start production
//   pm2 start ecosystem.config.js --env staging # start staging
//   pm2 reload ecosystem.config.js              # zero-downtime reload
//   pm2 save && pm2 startup                     # auto-start on reboot
// ══════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: "bankrsynth-backend",
      script: "server.js",
      cwd: "/opt/bankrsynth/apps/backend",

      // Cluster mode — one worker per CPU core
      instances: "max",
      exec_mode: "cluster",

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,

      // Memory threshold — restart if exceeds 512MB per worker
      max_memory_restart: "512M",

      // Log output
      out_file: "/var/log/bankrsynth/backend-out.log",
      error_file: "/var/log/bankrsynth/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      log_type: "json",

      // Node.js flags
      node_args: "--max-old-space-size=512",

      // Watch — disabled in production, only in dev
      watch: false,
      ignore_watch: ["node_modules", "data", "memory", "*.log"],

      // Environment — production
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Environment — staging (pm2 start ... --env staging)
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3001,
      },

      // Environment — development (pm2 start ... --env development)
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        watch: true,
      },

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Source maps for better stack traces
      source_map_support: true,
    },
  ],

  deploy: {
    production: {
      user: "bankrsynth",
      host: ["YOUR_VPS_IP"],
      ref: "origin/main",
      repo: "https://github.com/ClawParallel/bankrsynth-backend.git",
      path: "/opt/bankrsynth",
      "pre-deploy": "git fetch --all",
      "post-deploy":
        "pnpm install --frozen-lockfile && pm2 reload ecosystem.config.js --env production && pm2 save",
      "pre-deploy-local": "",
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
