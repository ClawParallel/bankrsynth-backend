"use client";
import { useState, useCallback, useRef } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export const SYNTH_COMMANDS = [
  { cmd: "/synth status",             desc: "Backend health + uptime" },
  { cmd: "/synth identity",           desc: "Show agent DID identity" },
  { cmd: "/synth skills",             desc: "List available skills" },
  { cmd: "/synth repo list",          desc: "List GitLawb repos" },
  { cmd: "/synth repo create ",       desc: "Create a new repo" },
  { cmd: "/synth repo clone ",        desc: "Clone a repo from URL" },
  { cmd: "/synth history ",           desc: "Show commit history" },
  { cmd: "/synth commit ",            desc: 'Commit changes (add message in quotes)' },
  { cmd: "/synth push ",              desc: "Push to remote" },
  { cmd: "/synth pull ",              desc: "Pull from remote" },
  { cmd: "/synth deploy ",            desc: "Run autonomous coding agent" },
  { cmd: "/synth review ",            desc: "AI code review" },
  { cmd: "/synth narratives",         desc: "Scan crypto narratives" },
  { cmd: "/synth swarm",              desc: "Swarm agent status" },
  { cmd: "/synth agents",             desc: "List active agents" },
  { cmd: "/synth help",               desc: "Show all commands" },
];

export interface CommandResult {
  success: boolean;
  output: string;
  raw?: unknown;
  ts: number;
}

export interface HistoryEntry {
  id: string;
  command: string;
  result: CommandResult;
  ts: number;
}

export function useSynthCommand() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyCommands = useRef<string[]>([]);

  const execute = useCallback(async (rawCommand: string): Promise<CommandResult> => {
    const command = rawCommand.trim();
    if (!command) return { success: false, output: "Empty command", ts: Date.now() };

    setLoading(true);

    // Handle local commands without backend
    if (command === "clear" || command === "/clear") {
      setLoading(false);
      return { success: true, output: "__CLEAR__", ts: Date.now() };
    }

    try {
      // Route /swarm commands to the swarm endpoint
      if (command === "/synth swarm" || command === "swarm") {
        const r = await fetch(`${BACKEND_URL}/swarm/status`, {
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        const output = [
          `SWARM STATUS — ${d.activeCount ?? 0} active / ${d.idleCount ?? 0} idle`,
          `Total executions: ${d.totalExecutions ?? 0}`,
          "",
          ...(d.agents || []).map(
            (a: { glyph: string; name: string; status: string; task?: string; executions: number }) =>
              `${a.glyph} ${a.name.padEnd(16)} ${a.status.toUpperCase().padEnd(8)} execs:${a.executions}${a.task ? ` — ${a.task}` : ""}`
          ),
        ].join("\n");
        const result = { success: true, output, raw: d, ts: Date.now() };
        pushHistory(command, result);
        return result;
      }

      // Route /synth agents to swarm status
      if (command === "/synth agents" || command === "agents") {
        const r = await fetch(`${BACKEND_URL}/swarm/status`, {
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        const active = (d.agents || []).filter((a: { status: string }) => a.status === "active");
        const output = active.length
          ? active.map((a: { glyph: string; name: string; task?: string }) => `${a.glyph} ${a.name} — ${a.task ?? "running"}`).join("\n")
          : "No active agents";
        const result = { success: true, output, raw: d, ts: Date.now() };
        pushHistory(command, result);
        return result;
      }

      // Route /synth narratives directly
      if (command === "/synth narratives" || command === "narratives") {
        const r = await fetch(`${BACKEND_URL}/narratives`, {
          signal: AbortSignal.timeout(10000),
        });
        const d = await r.json();
        const items = Array.isArray(d) ? d : d.narratives ?? [];
        const output = items.map(
          (n: { title: string; strength: number; desc: string }) =>
            `${n.title.padEnd(24)} ${n.strength}% — ${n.desc?.slice(0, 60) ?? ""}`
        ).join("\n");
        const result = { success: true, output: output || "No narratives returned", raw: d, ts: Date.now() };
        pushHistory(command, result);
        return result;
      }

      // Default: send to /synth/exec
      const r = await fetch(`${BACKEND_URL}/synth/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
        signal: AbortSignal.timeout(30000),
      });
      const d = await r.json();

      const output = formatOutput(d);
      const result = { success: d.success !== false, output, raw: d, ts: Date.now() };
      pushHistory(command, result);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      const result = { success: false, output: `Error: ${msg}`, ts: Date.now() };
      pushHistory(command, result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pushHistory(command: string, result: CommandResult) {
    const entry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, command, result, ts: Date.now() };
    setHistory((prev) => [...prev.slice(-99), entry]);
    historyCommands.current = [command, ...historyCommands.current.slice(0, 49)];
    setHistoryIndex(-1);
  }

  const navigateHistory = useCallback(
    (direction: "up" | "down"): string => {
      const cmds = historyCommands.current;
      if (!cmds.length) return "";
      const next = direction === "up"
        ? Math.min(historyIndex + 1, cmds.length - 1)
        : Math.max(historyIndex - 1, -1);
      setHistoryIndex(next);
      return next >= 0 ? cmds[next] : "";
    },
    [historyIndex]
  );

  const autocomplete = useCallback((partial: string): string[] => {
    if (!partial) return [];
    return SYNTH_COMMANDS
      .filter((c) => c.cmd.startsWith(partial))
      .map((c) => c.cmd);
  }, []);

  return { execute, loading, history, navigateHistory, autocomplete };
}

function formatOutput(d: unknown): string {
  if (typeof d !== "object" || d === null) return String(d);
  const obj = d as Record<string, unknown>;

  if (!obj.success && obj.error) return `Error: ${obj.error}`;
  if (obj.output) return String(obj.output);
  if (obj.result) return formatOutput(obj.result);

  // Format specific response shapes
  if (obj.identity && typeof obj.identity === "object") {
    const id = obj.identity as Record<string, unknown>;
    return `DID: ${id.did}\nName: ${id.name ?? "—"}\nCreated: ${id.createdAt ?? "—"}`;
  }
  if (obj.repos && Array.isArray(obj.repos)) {
    return obj.repos.length
      ? obj.repos.map((r: unknown) => {
          if (typeof r === "object" && r !== null) {
            const repo = r as Record<string, unknown>;
            return `◈ ${repo.name ?? repo.id}`;
          }
          return String(r);
        }).join("\n")
      : "No repositories found";
  }
  if (obj.commits && Array.isArray(obj.commits)) {
    return obj.commits
      .slice(0, 10)
      .map((c: unknown) => {
        if (typeof c === "object" && c !== null) {
          const commit = c as Record<string, unknown>;
          return `${String(commit.hash ?? "").slice(0, 8)} ${commit.date ?? ""} ${commit.subject ?? commit.message ?? ""}`;
        }
        return String(c);
      })
      .join("\n");
  }
  if (obj.skills && Array.isArray(obj.skills)) {
    return obj.skills.map((s: unknown) => {
      if (typeof s === "object" && s !== null) {
        const skill = s as Record<string, unknown>;
        return `◈ ${skill.name} — ${skill.description ?? ""}`;
      }
      return String(s);
    }).join("\n");
  }
  if (obj.commands && Array.isArray(obj.commands)) {
    return obj.commands.map((c: unknown) => {
      if (typeof c === "object" && c !== null) {
        const cmd = c as Record<string, unknown>;
        return `${String(cmd.command).padEnd(30)} ${cmd.description ?? ""}`;
      }
      return String(c);
    }).join("\n");
  }
  if (obj.message) return String(obj.message);
  if (obj.summary) return String(obj.summary);

  return JSON.stringify(d, null, 2);
}
