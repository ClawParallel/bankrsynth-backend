"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface Agent {
  id: string;
  name: string;
  type: string;
  glyph: string;
  description: string;
  status: "idle" | "active" | "error";
  task: string | null;
  startedAt: number | null;
  executions: number;
  uptime: number;
}

interface LogEntry {
  ts: number;
  agentId: string;
  agentName: string;
  glyph: string;
  action: string;
  task?: string;
}

interface SwarmStatus {
  agents: Agent[];
  activeCount: number;
  idleCount: number;
  totalExecutions: number;
  log: LogEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  coding:  "var(--green)",
  deploy:  "var(--gold)",
  monitor: "var(--cyan)",
  review:  "#cc88ff",
  intel:   "var(--cyan)",
};

function elapsed(startedAt: number | null) {
  if (!startedAt) return "—";
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export default function SwarmPage() {
  const [swarm, setSwarm] = useState<SwarmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState<Record<string, string>>({});
  const [elapsed_, setElapsed] = useState(0);

  const fetchSwarm = useCallback(async () => {
    try {
      const r = await fetch(`${API}/swarm/status`, { signal: AbortSignal.timeout(6000) });
      if (r.ok) setSwarm(await r.json());
    } catch { /* backend offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSwarm();
    const interval = setInterval(fetchSwarm, 5000);
    // Force re-render every second for elapsed timers
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [fetchSwarm]);

  // Listen for WebSocket swarm updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.agents) setSwarm((prev) => prev ? { ...prev, ...detail } : detail);
    };
    window.addEventListener("synth:swarm:update", handler);
    return () => window.removeEventListener("synth:swarm:update", handler);
  }, []);

  const launchAgent = async (agentId: string) => {
    setLaunching(agentId);
    try {
      const task = taskInput[agentId] || `Task from ${new Date().toLocaleTimeString()}`;
      const r = await fetch(`${API}/swarm/launch/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        setTaskInput((prev) => ({ ...prev, [agentId]: "" }));
        await fetchSwarm();
      }
    } catch { /* noop */ }
    setLaunching(null);
  };

  const stopAgent = async (agentId: string) => {
    try {
      await fetch(`${API}/swarm/stop/${agentId}`, { method: "POST", signal: AbortSignal.timeout(4000) });
      await fetchSwarm();
    } catch { /* noop */ }
  };

  const agents = swarm?.agents ?? [];
  const activeCount = agents.filter((a) => a.status === "active").length;

  // Demo agents when backend offline
  const demoAgents: Agent[] = [
    { id: "coding-agent",  name: "Coding Agent",  type: "coding",  glyph: "⬢", description: "Autonomous code generation",         status: "idle",   task: null, startedAt: null, executions: 0, uptime: Date.now() },
    { id: "deploy-agent",  name: "Deploy Agent",  type: "deploy",  glyph: "⚡", description: "Token and contract deployment",      status: "idle",   task: null, startedAt: null, executions: 0, uptime: Date.now() },
    { id: "monitor-agent", name: "Monitor Agent", type: "monitor", glyph: "◈", description: "Continuous chain monitoring",        status: "active", task: "Watching Base chain events", startedAt: Date.now() - 120000, executions: 47, uptime: Date.now() - 3600000 },
    { id: "review-agent",  name: "Review Agent",  type: "review",  glyph: "◉", description: "AI code review and diff analysis",  status: "idle",   task: null, startedAt: null, executions: 12, uptime: Date.now() - 7200000 },
    { id: "intel-agent",   name: "Intel Agent",   type: "intel",   glyph: "⬟", description: "Crypto narrative intelligence",     status: "active", task: "Scanning Base narratives", startedAt: Date.now() - 60000, executions: 234, uptime: Date.now() - 86400000 },
  ];
  const displayAgents = agents.length > 0 ? agents : demoAgents;

  return (
    <main className="page-wrapper" style={{ padding: "64px 16px 48px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "rgba(0,255,65,0.35)" }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(16px,3vw,22px)", fontWeight: 700, letterSpacing: "0.2em", color: "var(--green)", textShadow: "0 0 20px rgba(0,255,65,0.4)", marginTop: "4px" }}>
            ⬢ AI SWARM — AUTONOMOUS AGENT ORCHESTRATION
          </h1>
        </div>

        {/* Telemetry bar */}
        <div className="glass-panel" style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "20px 32px" }}>
          <div className="corner corner-tl" />
          {[
            { label: "ACTIVE AGENTS",     value: `${activeCount}/${displayAgents.length}`,  color: activeCount > 0 ? "var(--green)" : "rgba(0,255,65,0.4)" },
            { label: "IDLE",              value: displayAgents.filter((a) => a.status === "idle").length, color: "rgba(0,255,65,0.6)" },
            { label: "TOTAL EXECUTIONS",  value: swarm?.totalExecutions ?? displayAgents.reduce((n, a) => n + a.executions, 0), color: "var(--cyan)" },
            { label: "SWARM STATUS",      value: loading ? "CONNECTING" : agents.length ? "LIVE" : "DEMO",  color: loading ? "var(--gold)" : agents.length ? "var(--green)" : "rgba(0,255,65,0.4)" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(0,255,65,0.35)", marginBottom: "2px" }}>{label}</p>
              <p style={{ fontSize: "18px", fontFamily: "var(--font-display)", color, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Agent grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <AnimatePresence>
            {displayAgents.map((agent, i) => {
              const color = TYPE_COLORS[agent.type] ?? "var(--green)";
              const isActive = agent.status === "active";
              const isLaunching = launching === agent.id;

              return (
                <motion.div
                  key={agent.id}
                  className="glass-panel"
                  style={{ border: `1px solid ${isActive ? color : "rgba(0,255,65,0.18)"}`, boxShadow: isActive ? `0 0 16px ${color}22` : "none" }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div className="corner corner-tl" />

                  {/* Agent header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px", color, textShadow: `0 0 10px ${color}` }}>{agent.glyph}</span>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color, fontFamily: "var(--font-display)" }}>{agent.name}</p>
                        <p style={{ fontSize: "9px", color: "rgba(0,255,65,0.35)", letterSpacing: "0.1em" }}>{agent.type.toUpperCase()}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: isActive ? color : "rgba(0,255,65,0.2)",
                        boxShadow: isActive ? `0 0 10px ${color}` : "none",
                        animation: isActive ? "pulse 1s infinite" : "none",
                      }} />
                      <span style={{ fontSize: "9px", color: isActive ? color : "rgba(0,255,65,0.3)", letterSpacing: "0.15em" }}>
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Task / description */}
                  <p style={{ fontSize: "10px", color: isActive ? "rgba(0,255,65,0.7)" : "rgba(0,255,65,0.35)", minHeight: "28px", lineHeight: 1.5, marginBottom: "10px" }}>
                    {isActive && agent.task ? agent.task : agent.description}
                  </p>

                  {/* Metrics */}
                  <div style={{ display: "flex", gap: "16px", fontSize: "9px", color: "rgba(0,255,65,0.35)", marginBottom: "10px" }}>
                    <span>RUNS: <span style={{ color: "var(--green)" }}>{agent.executions}</span></span>
                    {isActive && agent.startedAt && (
                      <span>ELAPSED: <span style={{ color }}>{elapsed(agent.startedAt)}</span></span>
                    )}
                  </div>

                  {/* Active progress bar */}
                  {isActive && (
                    <div className="prog-track" style={{ marginBottom: "10px" }}>
                      <div className="prog-fill" style={{
                        width: "60%",
                        background: `linear-gradient(90deg, ${color}66, ${color})`,
                        animation: "progressPulse 2s ease-in-out infinite alternate",
                      }} />
                    </div>
                  )}

                  {/* Task input + launch/stop */}
                  {!isActive ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        value={taskInput[agent.id] ?? ""}
                        onChange={(e) => setTaskInput((p) => ({ ...p, [agent.id]: e.target.value }))}
                        placeholder="Optional task description"
                        className="terminal-input"
                        style={{ flex: 1, fontSize: "10px", padding: "5px 4px" }}
                        onKeyDown={(e) => e.key === "Enter" && launchAgent(agent.id)}
                      />
                      <button
                        onClick={() => launchAgent(agent.id)}
                        disabled={isLaunching}
                        style={{ fontSize: "9px", padding: "5px 12px", background: "transparent", border: `1px solid ${color}55`, color, cursor: "pointer", letterSpacing: "0.1em", flexShrink: 0 }}>
                        {isLaunching ? "…" : "▶ RUN"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => stopAgent(agent.id)}
                      style={{ width: "100%", fontSize: "9px", padding: "5px", background: "rgba(255,60,60,0.05)", border: "1px solid rgba(255,60,60,0.2)", color: "rgba(255,100,100,0.6)", cursor: "pointer", letterSpacing: "0.15em" }}>
                      ■ STOP
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Execution log */}
        {(swarm?.log?.length ?? 0) > 0 && (
          <div className="glass-panel">
            <div className="corner corner-tl" />
            <div className="panel-title">◈ EXECUTION LOG</div>
            {swarm!.log.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", fontSize: "10px", padding: "3px 0", borderBottom: "1px solid rgba(0,255,65,0.04)", fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "rgba(0,255,65,0.25)", flexShrink: 0 }}>{fmtTime(entry.ts)}</span>
                <span style={{ color: "var(--green)", flexShrink: 0 }}>{entry.glyph}</span>
                <span style={{ color: "rgba(0,255,65,0.6)" }}>{entry.agentName}</span>
                <span style={{ color: "rgba(0,255,65,0.35)" }}>{entry.action}</span>
                {entry.task && <span style={{ color: "rgba(0,200,255,0.5)" }}>— {entry.task}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
