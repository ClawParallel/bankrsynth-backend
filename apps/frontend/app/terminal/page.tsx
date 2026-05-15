"use client";

import { useRef, useState } from "react";

type Trade = { entry: number; stopLoss: number; takeProfit: number };
type Msg =
  | { role: "user";    content: string }
  | { role: "ai";      content: string; prediction?: "UP" | "DOWN"; trade?: Trade };

export default function TerminalPage() {
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scroll = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  const send = async () => {
    if (!input.trim() || loading) return;
    const token = input.trim();
    setMessages((p) => [...p, { role: "user", content: token }]);
    setLoading(true);
    setInput("");
    scroll();

    try {
      const res = await fetch(
        "https://x402.bankr.bot/0xa8682fc423b9aa04bd11e76ab01fba5bd2d5c91a/synth",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      if (!res.ok) throw new Error("server");
      const data = await res.json();
      setMessages((p) => [
        ...p,
        {
          role: "ai",
          content: data.aiSummary || "No analysis available.",
          trade: data.trade,
          prediction: data.prediction,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "ai", content: "x Connection failed. Check network or try again." },
      ]);
    }

    setLoading(false);
    scroll();
  };

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 0' }}>
      <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 76px)' }}>
        <div style={{ marginBottom: '16px' }}>
          <p className="muted" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,3vw,26px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
            ◉ TERMINAL // MARKET INTELLIGENCE
          </h1>
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
          <div style={{ padding: '14px 14px 6px', borderBottom: '1px solid rgba(0,255,65,0.1)' }}>
            <div className="panel-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>ANALYSIS OUTPUT</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.length === 0 && (
              <div className="muted" style={{ fontSize: '11px' }}>
                <p>&gt; AI MARKET TERMINAL v2.0</p>
                <p>&gt; Paste a Base token address to begin analysis.</p>
                <span className="cursor-blink" style={{ color: 'var(--green)' }}>_</span>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="fade-in">
                <div className="muted" style={{ fontSize: '9px', letterSpacing: '0.2em', marginBottom: '4px' }}>
                  {m.role === "user" ? "YOU ▸" : "▸ AI ANALYSIS"}
                </div>

                <div style={{ background: 'rgba(0,10,3,0.6)', border: m.role === "user" ? '1px solid rgba(0,255,65,0.4)' : '1px solid rgba(0,255,65,0.2)', padding: '12px' }}>
                  <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', lineHeight: 1.6, color: m.role === "ai" && m.content.startsWith("x") ? '#ff4466' : 'var(--green)', margin: 0 }}>
                    {m.content}
                  </pre>

                  {m.role === "ai" && m.prediction && (
                    <div style={{
                      marginTop: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      border: m.prediction === "UP" ? '1px solid rgba(0,255,65,0.5)' : '1px solid rgba(255,26,60,0.5)',
                      color: m.prediction === "UP" ? 'var(--green)' : 'var(--red)',
                      fontSize: '10px',
                      letterSpacing: '0.2em',
                      textShadow: m.prediction === "UP" ? '0 0 8px var(--green)' : '0 0 8px var(--red)',
                    }}>
                      SIGNAL: {m.prediction === "UP" ? "▲" : "▼"} {m.prediction}
                    </div>
                  )}

                  {m.role === "ai" && m.trade && (
                    <div style={{ marginTop: '12px', border: '1px solid rgba(0,255,65,0.15)', padding: '10px' }}>
                      <p className="muted" style={{ fontSize: '9px', letterSpacing: '0.2em', marginBottom: '6px' }}>TRADE PARAMETERS</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                        <div>
                          <p className="muted" style={{ fontSize: '9px' }}>ENTRY</p>
                          <p className="text-success">${m.trade.entry.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="muted" style={{ fontSize: '9px' }}>STOP LOSS</p>
                          <p className="text-error">${m.trade.stopLoss.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="muted" style={{ fontSize: '9px' }}>TARGET</p>
                          <p className="text-success">${m.trade.takeProfit.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="fade-in">
                <p className="muted" style={{ fontSize: '9px', letterSpacing: '0.2em', marginBottom: '4px' }}>▸ AI ANALYSIS</p>
                <div className="muted" style={{ background: 'rgba(0,10,3,0.6)', border: '1px solid rgba(0,255,65,0.2)', padding: '12px', fontSize: '11px' }}>
                  <p>&gt; scanning on-chain data...</p>
                  <p>&gt; loading market metrics...</p>
                  <p>&gt; generating signal<span className="cursor-blink">_</span></p>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ borderTop: '1px solid rgba(0,255,65,0.15)', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '12px', flexShrink: 0 }}>&gt;</span>
            <input
              className="terminal-input"
              style={{ borderBottom: 'none', flex: 1, padding: '4px 0' }}
              placeholder="Paste token address..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="neon-btn"
              style={{ width: 'auto', padding: '8px 18px', fontSize: '10px' }}
            >
              ANALYZE
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
