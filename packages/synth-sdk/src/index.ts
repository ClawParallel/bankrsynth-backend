// ══════════════════════════════════════════════════════════════
// BANKRSYNTH SYNTH SDK
// Typed REST + realtime WebSocket client for frontend apps.
// Zero config: reads NEXT_PUBLIC_BACKEND_URL automatically.
// ══════════════════════════════════════════════════════════════

import type {
  ApiResponse,
  SynthExecRequest,
  SynthExecResponse,
  AgentIdentity,
  GitLawbRepo,
  GitStatus,
  CodingAgentResult,
  TerminalEvent,
  SkillSchema,
  SkillResult,
  TokenIdea,
  DeployResult,
  GitCommit,
} from "@bankrsynth/shared";

import { EVENTS } from "@bankrsynth/shared";

// ─── Config ───────────────────────────────────────────────────

const DEFAULT_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000"
    : "http://localhost:3000";

export interface SynthSDKConfig {
  baseUrl?: string;
  wsUrl?: string;
  timeout?: number;
}

// ─── REST Client ──────────────────────────────────────────────

class SynthRestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeout = timeout;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  // ─── Health ─────────────────────────────────────────────────

  health() {
    return this.get<{ name: string; status: string; version: string }>("/");
  }

  // ─── Token / Agent ──────────────────────────────────────────

  launch(data: {
    name: string;
    wallet: string;
    symbol?: string;
    description?: string;
    image?: string;
    tweet?: string;
    website?: string;
  }) {
    return this.post<ApiResponse<DeployResult>>("/launch", data);
  }

  agent(message: string) {
    return this.post<{
      success: boolean;
      agentIdea: TokenIdea;
      deployResult: DeployResult;
    }>("/agent", { message });
  }

  executeSkill(skill: string, input: Record<string, unknown>) {
    return this.post<SkillResult>("/execute-skill", { skill, input });
  }

  listSkills() {
    return this.executeSkill("list", {});
  }

  // ─── GitLawb Identity ───────────────────────────────────────

  getIdentity() {
    return this.get<ApiResponse<AgentIdentity>>("/gitlawb/identity");
  }

  createIdentity(opts?: { name?: string; force?: boolean }) {
    return this.post<ApiResponse<AgentIdentity>>("/gitlawb/identity/create", opts);
  }

  // ─── GitLawb Repos ──────────────────────────────────────────

  createRepo(opts: {
    name: string;
    description?: string;
    private?: boolean;
    initReadme?: boolean;
  }) {
    return this.post<ApiResponse<GitLawbRepo>>("/gitlawb/repo/create", opts);
  }

  cloneRepo(opts: { url: string; name?: string }) {
    return this.post<ApiResponse<GitLawbRepo>>("/gitlawb/repo/clone", opts);
  }

  listRepos() {
    return this.get<ApiResponse<{ repos: GitLawbRepo[] }>>("/gitlawb/repo/list");
  }

  repoStatus(repoName: string) {
    return this.get<ApiResponse<GitStatus>>(
      `/gitlawb/repo/status?repoName=${encodeURIComponent(repoName)}`
    );
  }

  // ─── GitLawb Git Ops ────────────────────────────────────────

  commit(opts: {
    repoName?: string;
    repoDir?: string;
    message: string;
    files?: string[];
  }) {
    return this.post<ApiResponse>("/gitlawb/commit", opts);
  }

  push(opts: { repoName?: string; repoDir?: string; branch?: string }) {
    return this.post<ApiResponse>("/gitlawb/push", opts);
  }

  pull(opts: { repoName?: string; repoDir?: string; branch?: string }) {
    return this.post<ApiResponse>("/gitlawb/pull", opts);
  }

  history(repoName: string, limit = 20) {
    return this.get<ApiResponse<{ commits: GitCommit[] }>>(
      `/gitlawb/history?repoName=${encodeURIComponent(repoName)}&limit=${limit}`
    );
  }

  review(opts: {
    repoName?: string;
    repoDir?: string;
    base?: string;
    aiReview?: boolean;
  }) {
    return this.post<ApiResponse>("/gitlawb/review", opts);
  }

  // ─── Coding Agent ───────────────────────────────────────────

  runCodingAgent(opts: {
    task: string;
    repoName?: string;
    repoDir?: string;
    targetFiles?: string[];
    autoPush?: boolean;
  }) {
    return this.post<{
      success: boolean;
      result: CodingAgentResult;
      steps: Array<{ msg: string; ts: number }>;
    }>("/gitlawb/agent/code", opts);
  }

  // ─── Synth Commands ─────────────────────────────────────────

  synthExec(command: string) {
    return this.post<SynthExecResponse>("/synth/exec", {
      command,
    } satisfies SynthExecRequest);
  }

  synthCommands() {
    return this.get<{ success: boolean; commands: Array<{ command: string; description: string }> }>(
      "/synth/commands"
    );
  }

  // ─── GitLawb Skills ─────────────────────────────────────────

  gitlawbSkill(skillName: string, input: Record<string, unknown>) {
    return this.post<ApiResponse>(`/gitlawb/skill/${skillName}`, input);
  }

  gitlawbSkills() {
    return this.get<ApiResponse<SkillSchema[]>>("/gitlawb/skills");
  }

  // ─── Narratives (Intel page) ─────────────────────────────────

  narratives() {
    return this.get<Array<{ title: string; desc: string; strength: number }>>(
      "/narratives"
    );
  }
}

// ─── SSE Terminal Client ─────────────────────────────────────

export class SynthTerminalStream {
  private url: string;
  private eventSource: EventSource | null = null;
  private handlers: Map<string, Array<(event: TerminalEvent) => void>> = new Map();

  constructor(baseUrl: string) {
    this.url = `${baseUrl.replace(/\/$/, "")}/terminal/stream`;
  }

  connect(onEvent: (event: TerminalEvent) => void): () => void {
    if (typeof EventSource === "undefined") {
      console.warn("SSE not supported in this environment");
      return () => {};
    }

    this.eventSource = new EventSource(this.url);

    this.eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as TerminalEvent;
        onEvent(event);
      } catch {
        // ignore malformed events
      }
    };

    this.eventSource.onerror = () => {
      // SSE auto-reconnects; no manual action needed
    };

    return () => this.disconnect();
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }

  get connected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// ─── WebSocket Client (Socket.IO) ────────────────────────────

export class SynthSocketClient {
  private socket: ReturnType<typeof import("socket.io-client").io> | null = null;
  private url: string;

  constructor(wsUrl: string) {
    this.url = wsUrl;
  }

  async connect() {
    const { io } = await import("socket.io-client");
    this.socket = io(this.url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    return new Promise<void>((resolve, reject) => {
      this.socket!.on("connect", () => resolve());
      this.socket!.on("connect_error", reject);
    });
  }

  on<T = unknown>(event: string, handler: (data: T) => void) {
    this.socket?.on(event, handler);
    return this;
  }

  off(event: string) {
    this.socket?.off(event);
    return this;
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
    return this;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected() {
    return this.socket?.connected ?? false;
  }
}

// ─── Main SDK Factory ────────────────────────────────────────

export class SynthSDK {
  readonly rest: SynthRestClient;
  readonly terminal: SynthTerminalStream;
  readonly socket: SynthSocketClient;

  constructor(config: SynthSDKConfig = {}) {
    const baseUrl = config.baseUrl || DEFAULT_URL;
    const wsUrl =
      config.wsUrl ||
      (typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL || baseUrl
        : baseUrl);

    this.rest = new SynthRestClient(baseUrl, config.timeout);
    this.terminal = new SynthTerminalStream(baseUrl);
    this.socket = new SynthSocketClient(wsUrl);
  }
}

// ─── Singleton for easy import ───────────────────────────────

let _sdk: SynthSDK | null = null;

export function getSynthSDK(config?: SynthSDKConfig): SynthSDK {
  if (!_sdk) {
    _sdk = new SynthSDK(config);
  }
  return _sdk;
}

export { EVENTS };
export type {
  ApiResponse,
  SynthExecRequest,
  SynthExecResponse,
  AgentIdentity,
  GitLawbRepo,
  GitStatus,
  CodingAgentResult,
  TerminalEvent,
  SkillSchema,
  TokenIdea,
};
