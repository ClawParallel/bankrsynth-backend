"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const AUTO_REFRESH_MS = 90000;

const FALLBACK: Narrative[] = [
  { title: "AI AGENTS",      desc: "Autonomous on-chain agents gaining traction on Base",  strength: 92 },
  { title: "BASE ECOSYSTEM", desc: "TVL and developer activity surging on Base",            strength: 84 },
  { title: "MEME META",      desc: "Cultural tokens driving community-led narratives",      strength: 71 },
  { title: "DePIN",          desc: "Decentralized physical infrastructure growing",         strength: 63 },
  { title: "RESTAKING",      desc: "Yield optimization via restaking protocols",            strength: 58 },
  { title: "SOCIAL FI",      desc: "On-chain social platforms and identity emerging",       strength: 47 },
];

type Narrative = { title: string; desc: string; strength: number };

function strengthMeta(s: number) {
  if (s > 80) return { label: "HIGH", color: "var(--green)", border: "rgba(0,255,65,0.4)", bar: "var(--green)" };
  if (s > 60) return { label: "MED",  color: "var(--gold)",  border: "rgba(255,215,0,0.4)", bar: "var(--gold)" };
  return             { label: "LOW",  color: "rgba(0,255,65,0.45)", border: "rgba(0,255,65,0.15)", bar: "rgba(0,255,65,0.4)" };
}

export default function IntelPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState("");
  const [fallback, setFallback] = useState(false);
  const [autoNext, setAutoNext] = useState(AUTO_REFRESH_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = useCallback(async () => {
    setLoading(true); setFallback(false);
    try {
      let parsed: Narrative[] | null = null;
      try {
        const r = await fetch(`${API}/narratives`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d) && d.length > 0)   parsed = d;
          else if (Array.isArray(d?.narratives))   parsed = d.narratives;
        }
      } catch { /* fallthrough */ }
      if (parsed && parsed.length > 0) {
        setNarratives(parsed.map((n: Record<string, unknown>) => ({
          title:    String(n.title ?? n.topic ?? "UNKNOWN"),
          desc:     String(n.desc ?? n.description ?? ""),
          strength: Number(n.strength ?? n.score ?? Math.floor(Math.random() * 60) + 30),
        })));
      } else { setNarratives(FALLBACK); setFallback(true); }
    } catch { setNarratives(FALLBACK); setFallback(true); }
    setLastScan(new Date().toLocaleTimeString());
    setLoading(false); setAutoNext(AUTO_REFRESH_MS);
  }, []);

  useEffect(() => { scan(); }, [scan]);
  useEffect(() => {
    timerRef.current = setInterval(scan, AUTO_REFRESH_MS);
    countRef.current = setInterval(() => setAutoNext(n => Math.max(0, n - 1000)), 1000);
    return () => { clearInterval(timerRef.current!); clearInterval(countRef.current!); };
  }, [scan]);

  const nextIn = Math.ceil(autoNext / 1000);

  return (
    <main className="page-wrapper" style={{ padding: "64px 16px 48px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "rgba(0,255,65,0.35)" }}>BANKRSYNTH://</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(16px,3vw,22px)", letterSpacing: "0.2em", color: "var(--green)", textShadow: "0 0 20px rgba(0,255,65,0.4)", marginTop: "4px" }}>
              ◎ INTEL // NARRATIVE SCANNER
            </h1>
            {fallback && <p style={{ fontSize: "9px", color: "var(--gold)", marginTop: "4px" }}>⚠ Using cached data — live feed unavailable</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {lastScan && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "9px", color: "rgba(0,255,65,0.35)" }}>LAST: {lastScan}</p>
                <p style={{ fontSize: "9px", color: "rgba(0,255,65,0.25)" }}>NEXT: {nextIn}s</p>
              </div>
            )}
            <button onClick={scan} disabled={loading} className="neon-btn" style={{ width: "auto", padding: "7px 16px", fontSize: "10px" }}>
              {loading ? "SCANNING…" : "↺ RESCAN"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="glass-panel" style={{ marginBottom: "16px" }}>
            <div className="corner corner-tl" />
            <div className="panel-title">SCAN IN PROGRESS</div>
            {["connecting to narrative feeds","scanning Base activity","processing signal data","ranking narratives"].map((s,i) => (
              <motion.p key={s} className="muted" style={{ fontSize: "11px", marginBottom: "4px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}>
                &gt; {s}…
              </motion.p>
            ))}
            <span className="cursor-blink" style={{ color: "var(--green)" }}>_</span>
          </div>
        )}

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "12px" }}>
            <AnimatePresence>
              {narratives.map((n, i) => {
                const { label, color, border, bar } = strengthMeta(n.strength);
                return (
                  <motion.div key={`${n.title}-${i}`} className="glass-panel"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}>
                    <div className="corner corner-tl" />
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "8px" }}>
                      <div>
                        <p className="muted" style={{ fontSize: "9px", letterSpacing: "0.15em", marginBottom: "2px" }}>#{i+1}</p>
                        <p style={{ fontSize: "13px", letterSpacing: "0.12em", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-display)" }}>{n.title}</p>
                      </div>
                      <span style={{ fontSize: "9px", padding: "3px 8px", border: `1px solid ${border}`, color, letterSpacing: "0.2em", flexShrink: 0 }}>{label}</span>
                    </div>
                    <p className="muted" style={{ fontSize: "11px", lineHeight: 1.55, marginBottom: "10px", minHeight: "32px" }}>{n.desc}</p>
                    <div className="prog-wrap">
                      <div className="prog-label"><span>SIGNAL</span><span>{n.strength}%</span></div>
                      <div className="prog-track">
                        <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${bar}88, ${bar})`, boxShadow: `0 0 6px ${bar}` }}
                          initial={{ width: 0 }} animate={{ width: `${n.strength}%` }} transition={{ duration: 0.8, delay: i * 0.06 + 0.2 }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
