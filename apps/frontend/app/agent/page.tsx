"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

const QUICK_CMDS = [
  "deploy a meme coin",
  "deploy a utility token",
  "generate a token idea",
  "scan narratives",
];

type Msg =
  | { type: "user"; text: string }
  | { type: "agent"; text: string }
  | { type: "deploy"; ca: string; name?: string };

export default function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { type: "agent", text: "BankrSynth node initialized. Connected to Base. Awaiting command." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((p) => [...p, { type: "user", text: msg }]);
    setTyping(true);

    try {
      const res = await fetch(`${API}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error("server");
      const data = await res.json();

      const agentText = data?.message || data?.reply || data?.response || data?.content;
      const ca = data?.deployResult?.tokenAddress || data?.deployResult?.address;

      setTimeout(() => {
        setTyping(false);
        if (agentText) setMessages((p) => [...p, { type: "agent", text: agentText }]);
        if (ca)         setMessages((p) => [...p, { type: "deploy", ca, name: data?.deployResult?.name }]);
        if (!agentText && !ca)
          setMessages((p) => [...p, { type: "agent", text: "x No response from agent. Try again." }]);
      }, 1500);
    } catch {
      setTyping(false);
      setMessages((p) => [
        ...p,
        { type: "agent", text: "x Connection failed. Check network or try again." },
      ]);
    }
  };

  const copyCA = (ca: string) => {
    navigator.clipboard.writeText(ca);
    setCopied(ca);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 0' }}>
      <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 76px)' }}>
        <div style={{ marginBottom: '16px' }}>
          <p className="muted" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,3vw,26px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
            ⬡ AGENT // AUTONOMOUS EXECUTION
          </h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {QUICK_CMDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => send(cmd)}
              disabled={typing}
              className="mode-btn"
              style={{ fontSize: '10px' }}
            >
              &gt; {cmd}
            </button>
          ))}
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
          <div style={{ padding: '14px 14px 6px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(0,255,65,0.1)' }}>
            <div className="panel-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>AGENT TERMINAL</div>
            <button
              onClick={() => setMessages([{ type: "agent", text: "Session cleared." }])}
              className="muted"
              style={{ marginLeft: 'auto', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              [CLEAR]
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            {messages.map((msg, i) => {
              if (msg.type === "user") {
                return (
                  <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '85%' }}>
                      <p className="muted" style={{ fontSize: '9px', textAlign: 'right', marginBottom: '4px', letterSpacing: '0.2em' }}>YOU ▸</p>
                      <div style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.4)', padding: '10px 12px', fontSize: '12px', color: 'var(--green)' }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "deploy") {
                return (
                  <div key={i} className="fade-in">
                    <p className="muted" style={{ fontSize: '9px', marginBottom: '4px', letterSpacing: '0.2em' }}>▸ AGENT</p>
                    <div className="glass-panel">
                      <p className="text-success" style={{ letterSpacing: '0.2em', fontSize: '12px' }}>✔ DEPLOYMENT RESULT</p>
                      <div style={{ borderTop: '1px solid rgba(0,255,65,0.15)', paddingTop: '10px', marginTop: '8px', fontSize: '11px' }}>
                        {msg.name && (<p><span className="muted">NAME:    </span>{msg.name}</p>)}
                        <p><span className="muted">NETWORK: </span>Base Mainnet</p>
                        <p style={{ wordBreak: 'break-all' }}>
                          <span className="muted">CA:      </span>
                          <span style={{ color: 'var(--green)' }}>{msg.ca}</span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        <button onClick={() => copyCA(msg.ca)} className="neon-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '10px' }}>
                          {copied === msg.ca ? "COPIED!" : "COPY CA"}
                        </button>
                        <a href={`https://basescan.org/token/${msg.ca}`} target="_blank" rel="noreferrer" className="neon-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '10px', textDecoration: 'none', display: 'inline-block' }}>
                          BASESCAN
                        </a>
                        <a href={`https://swap.bankr.bot/?outputToken=${msg.ca}`} target="_blank" rel="noreferrer" className="neon-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '10px', textDecoration: 'none', display: 'inline-block' }}>
                          TRADE
                        </a>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="fade-in">
                  <p className="muted" style={{ fontSize: '9px', marginBottom: '4px', letterSpacing: '0.2em' }}>▸ AGENT</p>
                  <div style={{ background: 'rgba(0,10,3,0.6)', border: '1px solid rgba(0,255,65,0.2)', padding: '10px 12px', fontSize: '12px', lineHeight: 1.6, color: msg.text.startsWith("x") ? '#ff4466' : 'var(--green)' }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="fade-in">
                <p className="muted" style={{ fontSize: '9px', marginBottom: '4px', letterSpacing: '0.2em' }}>▸ AGENT</p>
                <div className="muted" style={{ background: 'rgba(0,10,3,0.6)', border: '1px solid rgba(0,255,65,0.2)', padding: '10px 12px', fontSize: '12px' }}>
                  processing<span className="cursor-blink">_</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ borderTop: '1px solid rgba(0,255,65,0.15)', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '12px', flexShrink: 0 }}>&gt;</span>
            <input
              className="terminal-input"
              style={{ borderBottom: 'none', flex: 1, padding: '4px 0' }}
              placeholder="deploy a meme coin about..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={typing}
            />
            <button
              onClick={() => send()}
              disabled={typing || !input.trim()}
              className="neon-btn"
              style={{ width: 'auto', padding: '8px 18px', fontSize: '10px' }}
            >
              EXECUTE
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
