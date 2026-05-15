"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { SYNTH_COMMANDS } from "@/lib/synth/useSynthCommand";

const SynthTerminal = dynamic(() => import("@/components/synth/SynthTerminal"), { ssr: false });

export default function SynthPage() {
  const [showRef, setShowRef] = useState(false);

  return (
    <main style={{ height: "100vh", paddingTop: "56px", display: "flex", flexDirection: "column", background: "#000" }}>
      {/* Header */}
      <div style={{ padding: "10px 20px 8px", borderBottom: "1px solid rgba(0,255,65,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "rgba(0,255,65,0.35)" }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(14px,2.5vw,20px)", fontWeight: 700, letterSpacing: "0.2em", color: "var(--green)", textShadow: "0 0 20px rgba(0,255,65,0.4)" }}>
            ◈ SYNTH TERMINAL — AI-NATIVE COMMAND INTERFACE
          </h1>
        </div>
        <button
          onClick={() => setShowRef((v) => !v)}
          style={{ fontSize: "9px", padding: "4px 10px", background: "transparent", border: "1px solid rgba(0,255,65,0.2)", color: "rgba(0,255,65,0.5)", cursor: "pointer", letterSpacing: "0.15em" }}>
          {showRef ? "HIDE REF" : "CMD REF"}
        </button>
      </div>

      {/* Command reference panel */}
      {showRef && (
        <div style={{ borderBottom: "1px solid rgba(0,255,65,0.12)", padding: "10px 20px", background: "rgba(0,6,2,0.8)", flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "4px 24px" }}>
            {SYNTH_COMMANDS.map((c) => (
              <div key={c.cmd} style={{ display: "flex", gap: "8px", fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 0" }}>
                <span style={{ color: "var(--green)", letterSpacing: "0.05em", flexShrink: 0 }}>{c.cmd}</span>
                <span style={{ color: "rgba(0,255,65,0.35)" }}>— {c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SynthTerminal showCommandInput height="100%" maxLines={500} />
      </div>
    </main>
  );
}
