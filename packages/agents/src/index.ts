// ══════════════════════════════════════════════════════════════
// BANKRSYNTH AGENT ORCHESTRATOR
// Multi-agent swarm runtime. Manages agent lifecycle,
// task queuing, status tracking, and event broadcasting.
// ══════════════════════════════════════════════════════════════

import { EventEmitter } from "events";
import { terminalBus } from "@bankrsynth/terminal";
import type { AgentStatus, AgentStep } from "@bankrsynth/shared";
import { EVENTS } from "@bankrsynth/shared";

// ─── Agent Registry ───────────────────────────────────────────

export interface AgentRecord {
  id: string;
  name: string;
  status: AgentStatus;
  task?: string;
  startedAt?: number;
  completedAt?: number;
  steps: AgentStep[];
  error?: string;
}

class AgentOrchestrator extends EventEmitter {
  private agents = new Map<string, AgentRecord>();
  private counter = 0;

  register(name: string): string {
    const id = `agent-${++this.counter}-${Date.now()}`;
    const record: AgentRecord = {
      id,
      name,
      status: "idle",
      steps: [],
    };
    this.agents.set(id, record);
    terminalBus.agent(`Registered: ${name} (${id})`);
    return id;
  }

  start(id: string, task: string) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);

    agent.status = "running";
    agent.task = task;
    agent.startedAt = Date.now();
    agent.steps = [];

    terminalBus.agent(`[${agent.name}] STARTED — ${task}`);
    this.emit(EVENTS.AGENT_STARTED, { agentId: id, task });
    this.broadcastSwarm();
  }

  step(id: string, msg: string, data?: Record<string, unknown>) {
    const agent = this.agents.get(id);
    if (!agent) return;

    const step: AgentStep = { msg, data, ts: Date.now() };
    agent.steps.push(step);
    agent.status = "running";

    terminalBus.agent(`[${agent.name}] ${msg}`);
    this.emit(EVENTS.AGENT_STEP, { agentId: id, msg, ts: step.ts });
  }

  done(id: string, result?: unknown) {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.status = "done";
    agent.completedAt = Date.now();

    terminalBus.done(`[${agent.name}] Task complete`);
    this.emit(EVENTS.AGENT_DONE, { agentId: id, result });
    this.broadcastSwarm();
  }

  error(id: string, err: string) {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.status = "error";
    agent.error = err;
    agent.completedAt = Date.now();

    terminalBus.error(`[${agent.name}] ${err}`);
    this.emit(EVENTS.AGENT_ERROR, { agentId: id, error: err });
    this.broadcastSwarm();
  }

  getAgent(id: string) {
    return this.agents.get(id);
  }

  listAgents(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  getSwarmStatus() {
    const agents = this.listAgents();
    return {
      total: agents.length,
      idle: agents.filter((a) => a.status === "idle").length,
      running: agents.filter((a) => a.status === "running").length,
      done: agents.filter((a) => a.status === "done").length,
      error: agents.filter((a) => a.status === "error").length,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        task: a.task,
      })),
    };
  }

  private broadcastSwarm() {
    this.emit(EVENTS.SWARM_UPDATE, {
      agents: this.listAgents().map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        task: a.task,
      })),
      ts: Date.now(),
    });
  }
}

export const orchestrator = new AgentOrchestrator();

// ─── Runnable Agent Base Class ────────────────────────────────

export abstract class RunnableAgent {
  readonly id: string;
  abstract readonly name: string;

  constructor() {
    this.id = orchestrator.register(this.constructor.name);
  }

  protected step(msg: string, data?: Record<string, unknown>) {
    orchestrator.step(this.id, msg, data);
  }

  protected log = {
    info: (msg: string) => this.step(msg),
    warn: (msg: string) => { terminalBus.warn(`[${this.name}] ${msg}`); },
    error: (msg: string) => { terminalBus.error(`[${this.name}] ${msg}`); },
  };

  async run(task: string, input: unknown): Promise<unknown> {
    orchestrator.start(this.id, task);
    try {
      const result = await this.execute(task, input);
      orchestrator.done(this.id, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      orchestrator.error(this.id, msg);
      throw err;
    }
  }

  protected abstract execute(task: string, input: unknown): Promise<unknown>;
}

export { EVENTS };
export type { AgentStatus, AgentStep };
