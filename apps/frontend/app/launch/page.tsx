"use client";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

const DEPLOY_CYCLE = ["CONNECTING...", "GENERATING...", "BROADCASTING...", "CONFIRMING..."];

const FIELDS = [
  { key: "name",        label: "TOKEN_NAME",     required: true,  ph: "e.g. AgentForge"           },
  { key: "wallet",      label: "CREATOR_WALLET", required: true,  ph: "0x..."                      },
  { key: "symbol",      label: "SYMBOL",         required: false, ph: "auto-generated if empty"    },
  { key: "description", label: "DESCRIPTION",    required: false, ph: "one-liner about your token" },
  { key: "image",       label: "IMAGE_URL",      required: false, ph: "https://..."                },
  { key: "tweet",       label: "TWEET_URL",      required: false, ph: "https://x.com/..."          },
  { key: "website",     label: "WEBSITE_URL",    required: false, ph: "https://..."                },
];

export default function LaunchPage() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, ""]))
  );
  const [loading, setLoading] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cycleRef.current) clearInterval(cycleRef.current); };
  }, []);

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const deploy = async () => {
    if (!values.name.trim() || !values.wallet.trim()) {
      setError("TOKEN_NAME and CREATOR_WALLET are required.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    setCycleIdx(0);

    cycleRef.current = setInterval(() => {
      setCycleIdx((i) => (i + 1) % DEPLOY_CYCLE.length);
    }, 2000);

    try {
      const res = await fetch(`${API}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResult(data);
      if (!data.success) setError(data.error || "Deployment failed.");
    } catch {
      setError("Connection failed. Check network or try again.");
    } finally {
      if (cycleRef.current) clearInterval(cycleRef.current);
      setLoading(false);
    }
  };

  const copyCA = () => {
    if (!result?.tokenAddress) return;
    navigator.clipboard.writeText(result.tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canDeploy = values.name.trim() && values.wallet.trim() && !loading;

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div className="max-w-6xl mx-auto" style={{ marginBottom: '20px' }}>
        <p className="muted" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>BANKRSYNTH://</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,3vw,26px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
          ◈ DEPLOY // BASE MAINNET
        </h1>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass-panel">
          <div className="corner corner-tl" /><div className="corner corner-br" />
          <div className="panel-title">DEPLOYMENT PARAMETERS</div>

          {FIELDS.map((f) => (
            <div key={f.key} className="input-group">
              <label className="input-label">
                {f.label}{f.required && <span style={{ color: 'var(--green)', marginLeft: '4px' }}>*</span>}
              </label>
              <input
                className="terminal-input"
                placeholder={f.ph}
                value={values[f.key]}
                onChange={set(f.key)}
                disabled={loading}
              />
            </div>
          ))}

          <div style={{ paddingTop: '20px' }}>
            <button onClick={deploy} disabled={!canDeploy} className="neon-btn">
              {loading ? DEPLOY_CYCLE[cycleIdx] : "◈ EXECUTE DEPLOY"}
            </button>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(0,255,65,0.08)' }}>
            <p className="muted" style={{ fontSize: '10px', marginBottom: '4px' }}>&gt; Fields marked * are required</p>
            <p className="muted" style={{ fontSize: '10px', marginBottom: '4px' }}>&gt; SYMBOL auto-generated from name if empty</p>
            <p className="muted" style={{ fontSize: '10px' }}>
              &gt; Upload images at{" "}
              <a href="https://imgbb.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--green)', textDecoration: 'underline' }}>imgbb.com</a>
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">EXECUTION LOG</div>
          <div style={{ flex: 1, fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            {!loading && !result && !error && (
              <>
                <p className="muted">&gt; awaiting parameters...</p>
                <p className="muted">&gt; fill form to deploy</p>
                <p style={{ color: 'var(--green)' }}><span className="cursor-blink">_</span></p>
              </>
            )}

            {loading && (
              <div>
                {["connecting to bankr api","generating deployment wallet","broadcasting transaction","waiting for confirmation"].map((s, i) => (
                  <p key={i} className="muted fade-in" style={{ animationDelay: `${i * 0.8}s`, marginBottom: '4px' }}>&gt; {s}...</p>
                ))}
                <span style={{ color: 'var(--green)' }} className="cursor-blink">_</span>
              </div>
            )}

            {error && !loading && (
              <div>
                <p className="text-error">x DEPLOY FAILED</p>
                <p className="muted">&gt; {error}</p>
                <p className="muted">&gt; check parameters and retry</p>
              </div>
            )}

            {result?.success && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="text-success">✔ DEPLOY SUCCESS</p>

                <div style={{ border: '1px solid rgba(0,255,65,0.2)', padding: '12px' }}>
                  <p className="muted" style={{ fontSize: '10px' }}>CONTRACT ADDRESS</p>
                  <p style={{ color: 'var(--green)', wordBreak: 'break-all', lineHeight: 1.5, marginTop: '6px' }}>{result.tokenAddress}</p>
                  <button onClick={copyCA} className="neon-btn" style={{ width: 'auto', padding: '6px 16px', marginTop: '8px', fontSize: '10px' }}>
                    {copied ? "COPIED!" : "COPY CA"}
                  </button>
                </div>

                {result.blockNumber && (
                  <p className="muted">&gt; BLOCK #{result.blockNumber.toLocaleString()}</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a href={`https://basescan.org/token/${result.tokenAddress}`} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: '10px' }}>→ VIEW ON BASESCAN</a>
                  <a href={`https://www.geckoterminal.com/base/pools/${result.poolId}`} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: '10px' }}>→ VIEW ON GECKOTERMINAL</a>
                  <a href={`https://swap.bankr.bot/?outputToken=${result.tokenAddress}`} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: '10px' }}>→ TRADE ON BANKR SWAP</a>
                </div>

                <p className="muted">&gt; END OF TRANSMISSION</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
