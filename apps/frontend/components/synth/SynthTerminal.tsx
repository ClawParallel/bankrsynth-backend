"use client";
import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import { useSynthSocket, type SynthEvent } from "@/lib/synth/useSynthSocket";
import { useSynthTerminal } from "@/lib/synth/useSynthTerminal";
import { useSynthCommand, SYNTH_COMMANDS } from "@/lib/synth/useSynthCommand";

const LEVEL_COLORS: Record<string, string> = {
  boot:   "#00ff41",
  ok:     "#00ff41",
  done:   "#00ff41",
  info:   "#00e5ff",
  warn:   "#ffd700",
  error:  "#ff4466",
  run:    "#00e5ff",
  agent:  "#cc88ff",
  git:    "#00e5ff",
  ai:     "#00e5ff",
  deploy: "#ffd700",
  raw:    "rgba(0,255,65,0.4)",
  user:   "#00ff41",
  result: "rgba(0,255,65,0.75)",
};

interface LogLine {
  id: string;
  ts: number;
  level: string;
  glyph?: string;
  msg: string;
  source: "sse" | "ws" | "cmd" | "result";
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

interface Props {
  showCommandInput?: boolean;
  maxLines?: number;
  height?: string;
  className?: string;
}

export default function SynthTerminal({
  showCommandInput = true,
  maxLines = 300,
  height = "100%",
  className = "",
}: Props) {
  const { connected: wsConnected, events: wsEvents, clear: clearWs } = useSynthSocket(maxLines);
  const { lines: sseLines, connected: sseConnected } = useSynthTerminal();
  const { execute, loading, history, navigateHistory, autocomplete } = useSynthCommand();

  const [lines, setLines] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsSeenRef = useRef<Set<string>>(new Set());
  const sseSeenRef = useRef<Set<string>>(new Set());

  // Merge SSE lines into unified log
  useEffect(() => {
    sseLines.forEach((line) => {
      const id = `sse-${line.ts}-${line.msg?.slice(0, 40)}`;
      if (sseSeenRef.current.has(id)) return;
      sseSeenRef.current.add(id);
      const logLine: LogLine = {
        id: `${id}-${Math.random()}`,
        ts: line.ts,
        level: line.level,
        glyph: line.glyph,
        msg: line.msg,
        source: "sse",
      };
      setLines((prev) => {
        const next = [...prev, logLine];
        return next.length > maxLines ? next.slice(-maxLines) : next;
      });
    });
  }, [sseLines, maxLines]);

  // Merge WebSocket events
  useEffect(() => {
    wsEvents.forEach((evt: SynthEvent) => {
      const id = `ws-${evt.ts}-${evt.msg?.slice(0, 40)}`;
      if (wsSeenRef.current.has(id)) return;
      wsSeenRef.current.add(id);
      const logLine: LogLine = {
        id: `${id}-${Math.random()}`,
        ts: evt.ts,
        level: evt.level,
        glyph: evt.glyph,
        msg: evt.msg,
        source: "ws",
      };
      setLines((prev) => {
        const next = [...prev, logLine];
        return next.length > maxLines ? next.slice(-maxLines) : next;
      });
    });
  }, [wsEvents, maxLines]);

  // Inject command results
  useEffect(() => {
    if (!history.length) return;
    const last = history[history.length - 1];
    const cmdId = `cmd-${last.ts}`;
    const resId = `result-${last.ts}`;

    setLines((prev) => {
      const ids = new Set(prev.map((l) => l.id));
      const additions: LogLine[] = [];

      if (!ids.has(cmdId)) {
        additions.push({
          id: cmdId,
          ts: last.ts,
          level: "user",
          glyph: "▶",
          msg: `CMD   ${last.command}`,
          source: "cmd",
        });
      }

      if (last.result.output === "__CLEAR__") return [];

      if (!ids.has(resId) && last.result.output) {
        last.result.output.split("\n").forEach((line, i) => {
          additions.push({
            id: `${resId}-${i}`,
            ts: last.ts + i,
            level: last.result.success ? "result" : "error",
            glyph: last.result.success ? "◈" : "✗",
            msg: `      ${line}`,
            source: "result",
          });
        });
      }

      const next = [...prev, ...additions];
      return next.length > maxLines ? next.slice(-maxLines) : next;
    });
  }, [history, maxLines]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleSubmit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || loading) return;
    setInput("");
    setSuggestions([]);
    await execute(cmd);
  }, [input, loading, execute]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setInput(navigateHistory("up"));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setInput(navigateHistory("down"));
      } else if (e.key === "Tab") {
        e.preventDefault();
        const sugs = autocomplete(input);
        if (sugs.length === 1) { setInput(sugs[0]); setSuggestions([]); }
        else setSuggestions(sugs.slice(0, 5));
      } else if (e.key === "Escape") {
        setSuggestions([]);
      }
    },
    [handleSubmit, navigateHistory, autocomplete, input]
  );

  const handleChange = useCallback((val: string) => {
    setInput(val);
    setSuggestions(val.length > 2 ? autocomplete(val).slice(0, 4) : []);
  }, [autocomplete]);

  const clearAll = () => {
    setLines([]);
    clearWs();
    wsSeenRef.current.clear();
    sseSeenRef.current.clear();
  };

  const filtered = filter ? lines.filter((l) => l.level === filter) : lines;
  const connected = sseConnected || wsConnected;

  return (
    <div className={`synth-terminal-wrap ${className}`} style={{ height, display: "flex", flexDirection: "column", fontFamily: "var(--font-mono)" }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", borderBottom: "1px solid rgba(0,255,65,0.12)", flexShrink: 0, flexWrap: "wrap", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "var(--green)" : "rgba(255,100,100,0.7)", boxShadow: connected ? "0 0 8px var(--green)" : "none", animation: connected ? "pulse 1.5s infinite" : "none" }} />
            <span style={{ fontSize: "9px", letterSpacing: "0.2em", color: connected ? "var(--green)" : "rgba(255,100,100,0.7)" }}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <span style={{ fontSize: "9px", color: sseConnected ? "var(--green)" : "rgba(255,100,100,0.5)", letterSpacing: "0.1em" }}>SSE:{sseConnected ? "●" : "○"}</span>
          <span style={{ fontSize: "9px", color: wsConnected ? "var(--cyan)" : "rgba(255,100,100,0.5)", letterSpacing: "0.1em" }}>WS:{wsConnected ? "●" : "○"}</span>
          <span style={{ fontSize: "9px", color: "rgba(0,255,65,0.35)" }}>{lines.length} events</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["warn", "error", "agent"].map((lvl) => (
            <button key={lvl} onClick={() => setFilter(filter === lvl ? null : lvl)}
              style={{ fontSize: "8px", padding: "2px 6px", background: filter === lvl ? "rgba(0,255,65,0.1)" : "transparent", border: `1px solid ${filter === lvl ? "var(--green)" : "rgba(0,255,65,0.15)"}`, color: filter === lvl ? "var(--green)" : "rgba(0,255,65,0.4)", cursor: "pointer", letterSpacing: "0.1em" }}>
              {lvl}
            </button>
          ))}
          <button onClick={clearAll} style={{ fontSize: "8px", padding: "2px 6px", background: "transparent", border: "1px solid rgba(0,255,65,0.15)", color: "rgba(0,255,65,0.4)", cursor: "pointer" }}>CLR</button>
        </div>
      </div>

      {/* Log stream */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", cursor: "text" }} onClick={() => inputRef.current?.focus()}>
        {filtered.length === 0 && (
          <p style={{ color: "rgba(0,255,65,0.2)", fontSize: "11px", padding: "4px 0" }}>— Waiting for events —</p>
        )}
        {filtered.map((line) => (
          <div key={line.id} style={{ display: "flex", gap: "8px", fontSize: "11px", lineHeight: "1.5", padding: "0.5px 0" }}>
            <span style={{ color: "rgba(0,255,65,0.25)", flexShrink: 0, fontSize: "10px" }}>{fmtTime(line.ts)}</span>
            <span style={{ color: LEVEL_COLORS[line.level] ?? "var(--green)", flexShrink: 0, width: "14px", textAlign: "center", fontSize: "10px" }}>{line.glyph ?? "·"}</span>
            <span style={{ color: LEVEL_COLORS[line.level] ?? "rgba(0,255,65,0.75)", wordBreak: "break-word", flex: 1 }}>{line.msg}</span>
            {line.source === "ws" && <span style={{ color: "rgba(0,200,255,0.25)", fontSize: "8px", flexShrink: 0 }}>WS</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command input */}
      {showCommandInput && (
        <div style={{ position: "relative", borderTop: "1px solid rgba(0,255,65,0.12)", padding: "8px 12px", flexShrink: 0 }}>
          {suggestions.length > 0 && (
            <div style={{ position: "absolute", bottom: "100%", left: "12px", right: "12px", background: "rgba(0,4,1,0.98)", border: "1px solid rgba(0,255,65,0.2)", zIndex: 20 }}>
              {suggestions.map((s) => {
                const info = SYNTH_COMMANDS.find((c) => c.cmd === s);
                return (
                  <div key={s} onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
                    style={{ padding: "5px 10px", fontSize: "10px", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--green)", letterSpacing: "0.08em" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,255,65,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span>{s}</span>
                    {info && <span style={{ color: "rgba(0,255,65,0.35)", fontSize: "9px" }}>{info.desc}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "rgba(0,255,65,0.5)", fontSize: "11px", flexShrink: 0 }}>root@synth:~$</span>
            <input ref={inputRef} type="text" value={input} onChange={(e) => handleChange(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
              placeholder={loading ? "executing…" : "/synth <cmd> — Tab to autocomplete, ↑↓ history"}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
              spellCheck={false} autoCapitalize="none" autoComplete="off" />
            {loading && <span className="cursor-blink" style={{ color: "var(--cyan)", fontSize: "10px" }}>◈</span>}
          </div>
        </div>
      )}
    </div>
  );
}
