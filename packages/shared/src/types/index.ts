// ══════════════════════════════════════════════════════════════
// BANKRSYNTH SHARED TYPES
// Contracts shared between frontend and backend
// ══════════════════════════════════════════════════════════════

// ─── Agent ────────────────────────────────────────────────────

export interface AgentIdentity {
  did: string;
  publicKey?: string;
  name: string;
  createdAt: string;
  provisional?: boolean;
}

export interface AgentStep {
  msg: string;
  data?: Record<string, unknown>;
  ts: number;
}

export type AgentStatus = "idle" | "running" | "done" | "error";

// ─── GitLawb ──────────────────────────────────────────────────

export interface GitLawbRepo {
  name: string;
  url?: string;
  path?: string;
  description?: string;
  private?: boolean;
  local?: boolean;
  identity?: AgentIdentity;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
}

export interface GitStatus {
  branch: string;
  clean: boolean;
  changes: Array<{ status: string; file: string }>;
}

export interface CodeChange {
  file: string;
  action: "modify" | "create" | "delete";
}

export interface CodingAgentResult {
  success: boolean;
  task: string;
  identity?: string;
  plan?: string;
  changes: CodeChange[];
  commitMessage?: string;
  commit?: { success: boolean; hash?: string | null; raw?: string };
  push?: { success: boolean; raw?: string } | null;
  summary: string;
}

// ─── Token / Bankr ────────────────────────────────────────────

export interface TokenIdea {
  name: string;
  symbol: string;
  description: string;
  image?: string | null;
}

export interface DeployResult {
  success: boolean;
  contractAddress?: string;
  txHash?: string;
  [key: string]: unknown;
}

// ─── Skill ────────────────────────────────────────────────────

export interface SkillSchema {
  name: string;
  description: string;
  input: Record<string, {
    type: string;
    required?: boolean;
    default?: unknown;
    description?: string;
  }>;
}

export interface SkillResult {
  success: boolean;
  skill: string;
  result: unknown;
}

// ─── Terminal / Logs ──────────────────────────────────────────

export type LogLevel =
  | "boot" | "ok" | "info" | "warn" | "error"
  | "run" | "done" | "agent" | "git" | "ai" | "deploy" | "raw";

export interface TerminalEvent {
  ts: number;
  level: LogLevel;
  glyph?: string;
  msg: string;
  meta?: Record<string, unknown> | null;
}

// ─── API Responses ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  details?: unknown;
}

// ─── Synth Commands ───────────────────────────────────────────

export interface SynthCommand {
  command: string;
  description: string;
  skill?: string | null;
}

export interface SynthExecRequest {
  command: string;
}

export interface SynthExecResponse {
  success: boolean;
  command?: string;
  result?: unknown;
  steps?: AgentStep[];
  error?: string;
}
