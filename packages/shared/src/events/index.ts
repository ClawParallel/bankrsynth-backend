// ══════════════════════════════════════════════════════════════
// BANKRSYNTH REALTIME EVENTS
// WebSocket event contracts shared between frontend and backend
// ══════════════════════════════════════════════════════════════

import type { TerminalEvent, AgentStatus, GitCommit, CodingAgentResult } from "../types";

// ─── Event Names ──────────────────────────────────────────────

export const EVENTS = {
  // Terminal
  TERMINAL_LOG: "synth:terminal",
  TERMINAL_CLEAR: "synth:terminal:clear",

  // Agent lifecycle
  AGENT_STARTED: "agent:started",
  AGENT_THINKING: "agent:thinking",
  AGENT_STEP: "agent:step",
  AGENT_DONE: "agent:done",
  AGENT_ERROR: "agent:error",
  AGENT_STATUS: "agent:status",

  // Repo
  REPO_CREATED: "repo:created",
  REPO_CLONED: "repo:cloned",
  REPO_UPDATE: "repo:update",

  // Git
  GIT_COMMITTED: "git:committed",
  GIT_PUSHED: "git:pushed",
  GIT_PULLED: "git:pulled",

  // Deployment
  DEPLOYMENT_STARTED: "deployment:started",
  DEPLOYMENT_LOG: "deployment:log",
  DEPLOYMENT_FINISHED: "deployment:finished",
  DEPLOYMENT_FAILED: "deployment:failed",

  // Swarm
  SWARM_UPDATE: "swarm:update",
  SWARM_AGENT_JOINED: "swarm:agent:joined",
  SWARM_AGENT_LEFT: "swarm:agent:left",

  // Token
  TOKEN_DEPLOYING: "token:deploying",
  TOKEN_DEPLOYED: "token:deployed",

  // System
  PING: "ping",
  PONG: "pong",
  CLIENT_COUNT: "system:clients",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// ─── Event Payloads ───────────────────────────────────────────

export interface TerminalLogEvent {
  event: typeof EVENTS.TERMINAL_LOG;
  data: TerminalEvent;
}

export interface AgentStepEvent {
  event: typeof EVENTS.AGENT_STEP;
  data: {
    agentId: string;
    msg: string;
    ts: number;
  };
}

export interface AgentStatusEvent {
  event: typeof EVENTS.AGENT_STATUS;
  data: {
    agentId: string;
    status: AgentStatus;
    result?: CodingAgentResult;
    error?: string;
  };
}

export interface RepoUpdateEvent {
  event: typeof EVENTS.REPO_UPDATE;
  data: {
    repoName: string;
    action: "created" | "cloned" | "committed" | "pushed" | "pulled";
    commit?: GitCommit;
    ts: number;
  };
}

export interface DeploymentEvent {
  event:
    | typeof EVENTS.DEPLOYMENT_STARTED
    | typeof EVENTS.DEPLOYMENT_LOG
    | typeof EVENTS.DEPLOYMENT_FINISHED
    | typeof EVENTS.DEPLOYMENT_FAILED;
  data: {
    deploymentId: string;
    log?: string;
    status?: string;
    ts: number;
  };
}

export interface SwarmUpdateEvent {
  event: typeof EVENTS.SWARM_UPDATE;
  data: {
    agents: Array<{
      id: string;
      name: string;
      status: AgentStatus;
      task?: string;
    }>;
    ts: number;
  };
}

// ─── Union type of all events ─────────────────────────────────

export type SynthEvent =
  | TerminalLogEvent
  | AgentStepEvent
  | AgentStatusEvent
  | RepoUpdateEvent
  | DeploymentEvent
  | SwarmUpdateEvent;
