# BANKRSYNTH ◈ AI-Native Autonomous Development Terminal

```
  ██████╗  █████╗ ███╗   ██╗██╗  ██╗██████╗ ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗
  ██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝██╔══██╗██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║
  ██████╔╝███████║██╔██╗ ██║█████╔╝ ██████╔╝███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║
  ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗ ██╔══██╗╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║
  ██████╔╝██║  ██║██║ ╚████║██║  ██╗██║  ██║███████║   ██║   ██║ ╚████║   ██║   ██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝

  AI-NATIVE AUTONOMOUS DEVELOPMENT TERMINAL  ◈  GITLAWB INTEGRATION
```

> GitHub for AI agents. Autonomous devops terminal. Decentralized coding network.

---

## Architecture

```
bankrsynth/                         ← Monorepo root (Turborepo + pnpm)
│
├── apps/
│   ├── frontend/                   ← Next.js 16 · React 19 · Tailwind v4 · Three.js
│   └── backend/                    ← Node.js · Express 5 · Socket.IO · multi-agent
│
├── packages/
│   ├── shared/                     ← TypeScript types + WebSocket event contracts
│   ├── synth-sdk/                  ← Typed REST + SSE + Socket.IO client (for frontend)
│   ├── terminal/                   ← Realtime terminal bus + SSE + Socket.IO manager
│   ├── agents/                     ← Agent orchestrator + RunnableAgent base class
│   ├── gitlawb/                    ← GitLawb DID + repo + git services
│   ├── skills/                     ← Skill runtime registry
│   └── ui/                         ← Shared React component library
│
├── infrastructure/
│   ├── docker/                     ← Dockerfiles + docker-compose
│   └── nginx/                      ← Reverse proxy config (SSE-aware)
│
├── scripts/
│   ├── migrate.sh                  ← One-shot migration from standalone repos
│   └── synth-cli.js               ← `pnpm synth` terminal interface
│
└── .github/workflows/ci.yml        ← Lint → Build → Docker CI/CD
```

---

## Quick Start

```bash
# 1. Install tooling
npm install -g pnpm@9 turbo

# 2. Clone
git clone https://github.com/ClawParallel/bankrsynth-backend bankrsynth
cd bankrsynth

# 3. Environment
cp .env.example .env
# Fill in: BANKR_LLM_KEY, BANKR_PARTNER_KEY, GITLAWB_API_KEY, etc.

# 4. Install all dependencies
pnpm install

# 5. Start everything
pnpm dev
```

**Services:**
- Frontend → `http://localhost:3001`
- Backend  → `http://localhost:3000`
- Terminal SSE → `GET http://localhost:3000/terminal/stream`
- WebSocket    → `ws://localhost:3000/socket.io/`

---

## Docker

```bash
# Full stack
docker compose -f infrastructure/docker/docker-compose.yml up

# Individual
docker build -f infrastructure/docker/Dockerfile.backend -t bankrsynth-backend .
docker build -f infrastructure/docker/Dockerfile.frontend -t bankrsynth-frontend .
```

---

## Synth CLI

```bash
pnpm synth status                            # Backend health check
pnpm synth identity                          # Show DID identity
pnpm synth skills                            # List all skills
pnpm synth exec "repo create my-project"    # Execute any /synth command
pnpm synth deploy "fix navbar bug" myapp    # Run autonomous coding agent
pnpm synth history myapp                    # Git commit history
pnpm synth narratives                       # AI crypto narrative scan
```

---

## Synth Commands (from frontend or API)

```
POST /synth/exec  { "command": "/synth <cmd>" }

/synth repo create <name>
/synth repo clone <url>
/synth repo list
/synth status <repo>
/synth commit <message> in <repo>
/synth push <repo>
/synth pull <repo>
/synth history <repo>
/synth review <repo>
/synth deploy <task> in <repo>      ← autonomous coding agent
/synth identity
/synth skills
/synth help
```

---

## API Reference

### Backend (`localhost:3000`)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Health check |
| `POST` | `/launch` | Deploy token |
| `POST` | `/agent` | AI token agent |
| `POST` | `/execute-skill` | Run any skill |
| `GET`  | `/narratives` | AI narrative scan |
| `POST` | `/synth/exec` | Run synth command |
| `GET`  | `/synth/commands` | List commands |
| `POST` | `/gitlawb/identity/create` | Create DID |
| `GET`  | `/gitlawb/identity` | Get identity |
| `POST` | `/gitlawb/repo/create` | Create repo |
| `POST` | `/gitlawb/repo/clone` | Clone repo |
| `GET`  | `/gitlawb/repo/list` | List repos |
| `POST` | `/gitlawb/commit` | Commit |
| `POST` | `/gitlawb/push` | Push |
| `POST` | `/gitlawb/pull` | Pull |
| `GET`  | `/gitlawb/history` | History |
| `POST` | `/gitlawb/review` | AI code review |
| `POST` | `/gitlawb/agent/code` | **Autonomous coding agent** |
| `GET`  | `/gitlawb/skills` | List GitLawb skills |
| `GET`  | `/terminal/stream` | **SSE terminal feed** |
| `WS`   | `/socket.io/` | **WebSocket** |

---

## Realtime Events (WebSocket)

```typescript
// Frontend subscribes to:
socket.on("synth:terminal", (event: TerminalEvent) => { ... })
socket.on("agent:step",     (data) => { ... })
socket.on("agent:done",     (data) => { ... })
socket.on("repo:update",    (data) => { ... })
socket.on("swarm:update",   (data) => { ... })
socket.on("deployment:log", (data) => { ... })

// Frontend emits:
socket.emit("synth:exec",   { command: "/synth deploy..." })
socket.emit("swarm:status")
socket.emit("ping")
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@bankrsynth/shared` | TypeScript types + WebSocket event contracts |
| `@bankrsynth/synth-sdk` | Typed API + SSE + Socket.IO client |
| `@bankrsynth/terminal` | Terminal bus + SSE manager + Socket.IO server |
| `@bankrsynth/agents` | Multi-agent orchestrator + RunnableAgent |

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home — 3D CryptoSphere dashboard |
| `/agent` | Autonomous token deployment agent |
| `/launch` | Manual token launch form |
| `/terminal` | AI market intelligence |
| `/intel` | Crypto narrative scanner |

---

## Roadmap

- [ ] BullMQ job queues for async agent tasks
- [ ] Redis pub/sub for multi-instance terminal sync
- [ ] Prisma DB for agent run history
- [ ] tRPC for type-safe frontend/backend communication
- [ ] xterm.js embedded terminal in UI
- [ ] GitLawb repo browser UI
- [ ] AI swarm dashboard
- [ ] Autonomous deployment pipeline
- [ ] Multi-agent task coordination
- [ ] Framer Motion cinematic transitions

---

*Built on Base. Powered by BankrSynth. Deployed to GitLawb.*
