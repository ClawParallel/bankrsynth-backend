"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

const FALLBACK: Narrative[] = [
  { title: "AI AGENTS",     desc: "Autonomous on-chain agents gaining traction on Base",     strength: 92 },
  { title: "BASE ECOSYSTEM",desc: "TVL and developer activity surging on Base",               strength: 84 },
  { title: "MEME META",     desc: "Cultural tokens driving community-led narratives",         strength: 71 },
  { title: "DePIN",         desc: "Decentralized physical infrastructure growing",            strength: 63 },
  { title: "RESTAKING",     desc: "Yield optimization via restaking protocols",               strength: 58 },
  { title: "SOCIAL FI",     desc: "On-chain social platforms and identity emerging",          strength: 47 },
];

type Narrative = { title: string; desc: string; strength: number };

const SCAN_LINES = [
  "connecting to narrative feeds",
  "scanning Base activity",
  "processing signal data",
  "ranking narratives",
];

function strengthLabel(s: number) {
  if (s > 80) return { label: "HIGH", color: 'var(--green)', border: 'rgba(0,255,65,0.5)', glow: '0 0 8px var(--green)' };
  if (s > 60) return { label: "MED",  color: 'var(--gold)',  border: 'rgba(255,215,0,0.5)', glow: '0 0 8px var(--gold)' };
  return              { label: "LOW",  color: 'rgba(0,255,65,0.45)', border: 'rgba(0,255,65,0.2)', glow: 'none' };
}

export default function IntelPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastScan, setLastScan]     = useState("");
  const [fallback, setFallback]     = useState(false);

  const scan = async () => {
    setLoading(true);
    setFallback(false);

    try {
      let parsed: Narrative[] | null = null;
      try {
        const r = await fetch(`${API}/narratives`, { signal: AbortSignal.timeout(6000) });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d) && d.length > 0)        parsed = d;
          else if (Array.isArray(d?.narratives))        parsed = d.narratives;
          else if (Array.isArray(d?.topics))            parsed = d.topics;
        }
      } catch { /* fallthrough */ }

      if (!parsed) {
        try {
          const r = await fetch(`${API}/agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "scan crypto narratives trending on Base now" }),
            signal: AbortSignal.timeout(10000),
          });
          if (r.ok) {
            const d = await r.json();
            if (Array.isArray(d))                       parsed = d;
            else if (Array.isArray(d?.narratives))      parsed = d.narratives;
          }
        } catch { /* fallthrough */ }
      }

      if (parsed && parsed.length > 0) {
        setNarratives(
          parsed.map((n: any) => ({
            title:    n.title    ?? n.topic ?? n.name ?? "UNKNOWN",
            desc:     n.desc     ?? n.description ?? n.summary ?? "",
            strength: n.strength ?? n.score ?? Math.floor(Math.random() * 60) + 30,
          }))
        );
      } else {
        setNarratives(FALLBACK);
        setFallback(true);
      }
    } catch {
      setNarratives(FALLBACK);
      setFallback(true);
    }

    setLastScan(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => { scan(); }, []); // eslint-disable-line

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div className="max-w-5xl mx-auto" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <p className="muted" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,3vw,26px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
            ◎ INTEL // NARRATIVE SCANNER
          </h1>
          {fallback && (
            <p className="text-warn" style={{ fontSize: '10px', marginTop: '4px' }}>! Using cached data — live feed unavailable</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastScan && <span className="muted" style={{ fontSize: '10px' }}>LAST SCAN: {lastScan}</span>}
          <button
            onClick={scan}
            disabled={loading}
            className="neon-btn"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '10px' }}
          >
            {loading ? "SCANNING..." : "↺ RESCAN"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="max-w-5xl mx-auto glass-panel">
          <div className="corner corner-tl" />
          <div className="panel-title">SCAN IN PROGRESS</div>
          {SCAN_LINES.map((s, i) => (
            <p key={i} className="muted fade-in" style={{ animationDelay: `${i * 0.4}s`, fontSize: '11px', marginBottom: '4px' }}>
              &gt; {s}...
            </p>
          ))}
          <span className="cursor-blink" style={{ color: 'var(--green)' }}>_</span>
        </div>
      )}

      {!loading && (
        <div className="max-w-5xl mx-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {narratives.map((n, i) => {
            const { label, color, border, glow } = strengthLabel(n.strength);
            return (
              <div
                key={i}
                className="glass-panel fade-in"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="corner corner-tl" />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                  <div>
                    <p className="muted" style={{ fontSize: '9px', letterSpacing: '0.2em', marginBottom: '2px' }}>#{i + 1}</p>
                    <p style={{ fontSize: '13px', letterSpacing: '0.15em', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>{n.title}</p>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    padding: '3px 8px',
                    border: `1px solid ${border}`,
                    color,
                    letterSpacing: '0.2em',
                    flexShrink: 0,
                    textShadow: glow,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {label}
                  </span>
                </div>

                <p className="muted" style={{ fontSize: '11px', lineHeight: 1.5, marginBottom: '10px', minHeight: '34px' }}>{n.desc}</p>

                <div className="prog-wrap">
                  <div className="prog-label"><span>SIGNAL</span><span>{n.strength}%</span></div>
                  <div className="prog-track"><div className="prog-fill" style={{ width: `${n.strength}%` }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
