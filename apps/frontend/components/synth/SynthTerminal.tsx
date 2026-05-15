"use client";

import { useEffect, useRef } from "react";
import { useSynthTerminal } from "../../lib/synth/useSynthTerminal";
import type { TerminalLine } from "../../lib/synth/useSynthTerminal";

// ══════════════════════════════════════════════════════════════
// SYNTH TERMINAL COMPONENT
// Live cyberterminal feed — connects to backend SSE stream.
// Renders neon-green terminal output in real time.
// ══════════════════════════════════════════════════════════════

const LEVEL_COLORS: Record<string, string> = {
  boot: "#00ff41",
  ok: "#00ff41",
  info: "#00e5ff",
  warn: "#ffd700",
  error: "#ff1a3c",
  run: "#00e5ff",
  done: "#00ff41",
  agent: "#bf5af2",
  git: "#00e5ff",
  ai: "#00e5ff",
  deploy: "#ffd700",
  raw: "#4a4a4a",
};

function TerminalLine({ line }: { line: TerminalLine }) {
  const color = LEVEL_COLORS[line.level] || "#00ff41";
  const ts = new Date(line.ts).toISOString().replace("T", " ").slice(0, 19);

  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "11px",
        lineHeight: "1.5",
        color,
        display: "flex",
        gap: "8px",
        padding: "1px 0",
      }}
    >
      <span style={{ color: "#1a3a1a", flexShrink: 0 }}>[{ts}]</span>
      <span>{line.msg}</span>
    </div>
  );
}

interface SynthTerminalProps {
  height?: string | number;
  showStatus?: boolean;
  maxLines?: number;
  className?: string;
}

export function SynthTerminal({
  height = 320,
  showStatus = true,
  className,
}: SynthTerminalProps) {
  const { lines, connected, clear } = useSynthTerminal();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div
      className={className}
      style={{
        background: "#000",
        border: "1px solid #00ff4133",
        borderRadius: "4px",
        height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Share Tech Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid #00ff4122",
          background: "#050505",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#00ff41", fontSize: "11px", letterSpacing: "2px" }}>
          ◈ SYNTH TERMINAL
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {showStatus && (
            <span
              style={{
                fontSize: "10px",
                color: connected ? "#00ff41" : "#ff1a3c",
                letterSpacing: "1px",
              }}
            >
              {connected ? "● LIVE" : "● OFFLINE"}
            </span>
          )}
          <button
            onClick={clear}
            style={{
              background: "none",
              border: "1px solid #00ff4133",
              color: "#00ff4166",
              fontSize: "9px",
              padding: "2px 6px",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            CLR
          </button>
        </div>
      </div>

      {/* Log output */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          scrollbarWidth: "thin",
          scrollbarColor: "#00ff4133 transparent",
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: "#1a3a1a", fontSize: "11px" }}>
            {connected ? "Waiting for events..." : "Connecting to terminal stream..."}
          </div>
        ) : (
          lines.map((line) => <TerminalLine key={line.id} line={line} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default SynthTerminal;
