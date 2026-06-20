'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Mode = 'analyze' | 'narrative' | 'thesis'

interface SynthResponse {
  ok?: boolean
  token?: string
  name?: string
  mode?: string
  chain?: string
  analysis?: string
  data?: {
    priceUsd: number
    change24h: number
    change1h: number
    volume24h: number
    marketCap: number
    liquidity: number
    address: string | null
    basescan: string | null
  }
  meta?: {
    model: string
    latencyMs: number
    remaining: number
    poweredBy: string
    docsUrl: string
  }
  error?: string
  message?: string
}

const CURL = `curl -X POST https://synthterminal.app/api/v1/synthesize \\
  -H "Content-Type: application/json" \\
  -d '{"token":"AEON","mode":"thesis"}'`

const JS = `const res = await fetch('https://synthterminal.app/api/v1/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'AEON', mode: 'thesis' })
})
const { analysis, data } = await res.json()`

const PY = `import requests
r = requests.post(
    'https://synthterminal.app/api/v1/synthesize',
    json={'token': 'AEON', 'mode': 'thesis'}
)
print(r.json()['analysis'])`

function CopyBlock({ label, code, lang }: { label: string; code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="glass-panel" style={{ marginBottom: '12px' }}>
      <div className="corner corner-tl" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.5)' }}>{label}</span>
        <button
          onClick={copy}
          style={{
            fontSize: '9px',
            padding: '3px 10px',
            background: 'transparent',
            border: '1px solid rgba(0,255,65,0.25)',
            color: copied ? 'var(--green)' : 'rgba(0,255,65,0.6)',
            cursor: 'pointer',
            letterSpacing: '0.15em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          fontSize: '11px',
          lineHeight: 1.6,
          color: lang === 'bash' ? 'var(--cyan)' : 'rgba(0,255,65,0.85)',
          overflowX: 'auto',
          whiteSpace: 'pre',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {code}
      </pre>
    </div>
  )
}

export default function ApiDocsPage() {
  const [demoToken, setDemoToken] = useState('AEON')
  const [demoMode, setDemoMode] = useState<Mode>('thesis')
  const [result, setResult] = useState<SynthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)

  const runDemo = useCallback(async () => {
    setLoading(true)
    setRan(true)
    try {
      const r = await fetch('/api/v1/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: demoToken, mode: demoMode }),
      })
      const d = (await r.json()) as SynthResponse
      setResult(d)
    } catch {
      setResult({ error: 'network_error', message: 'Request failed. Try again.' })
    }
    setLoading(false)
  }, [demoToken, demoMode])

  // Auto-run a live demo on first mount so the Response section shows real output.
  useEffect(() => {
    runDemo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const modes: Mode[] = ['analyze', 'narrative', 'thesis']

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 64px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>BANKRSYNTH://API/V1</p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(18px,3.5vw,28px)',
              fontWeight: 900,
              letterSpacing: '0.18em',
              color: 'var(--green)',
              textShadow: '0 0 24px rgba(0,255,65,0.4)',
              marginTop: '6px',
            }}
          >
            BANKRSYNTH INTELLIGENCE API
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(0,255,65,0.7)', marginTop: '8px', lineHeight: 1.6 }}>
            AI synthesis for any Base token.
            <br />
            Free. No signup. Open to everyone.
          </p>
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              border: '1px solid rgba(0,200,255,0.25)',
              background: 'rgba(0,200,255,0.03)',
              fontSize: '12px',
              color: 'var(--cyan)',
              letterSpacing: '0.05em',
              wordBreak: 'break-all',
            }}
          >
            <span style={{ color: 'var(--gold)' }}>POST</span> https://synthterminal.app/api/v1/synthesize
          </div>
        </div>

        {/* Live demo */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">◉ LIVE DEMO — REAL CALL</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <input
              value={demoToken}
              onChange={(e) => setDemoToken(e.target.value)}
              placeholder="symbol or 0x..."
              spellCheck={false}
              style={{
                flex: '1 1 160px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(0,255,65,0.25)',
                color: 'var(--green)',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setDemoMode(m)}
                  className={`mode-btn ${demoMode === m ? 'active' : ''}`}
                  style={{ fontSize: '9px', padding: '6px 10px', letterSpacing: '0.1em', minHeight: 'unset' }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={runDemo}
              disabled={loading}
              className="mode-btn active"
              style={{ fontSize: '10px', padding: '7px 18px', letterSpacing: '0.2em', minHeight: 'unset', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'RUNNING…' : 'RUN ▶'}
            </button>
          </div>

          {loading && (
            <p className="muted" style={{ fontSize: '11px', color: 'rgba(0,255,65,0.5)' }}>
              &gt; synthesizing {demoToken.toUpperCase()} · {demoMode}…{' '}
              <span className="cursor-blink" style={{ color: 'var(--green)' }}>_</span>
            </p>
          )}

          {!loading && ran && result && (
            <div>
              {result.ok && result.analysis ? (
                <>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--green)' }}>
                      ◈ {result.token} {result.data && `· $${result.data.priceUsd.toPrecision(4)}`}
                    </span>
                    {result.data && (
                      <span style={{ color: result.data.change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {result.data.change24h >= 0 ? '+' : ''}
                        {result.data.change24h.toFixed(2)}% 24h
                      </span>
                    )}
                    {result.meta && (
                      <span style={{ color: 'rgba(0,200,255,0.6)' }}>
                        {result.meta.latencyMs}ms · {result.meta.remaining} calls left · {result.meta.model}
                      </span>
                    )}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      lineHeight: 1.7,
                      color: 'rgba(0,255,65,0.9)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-mono)',
                      borderTop: '1px solid rgba(0,255,65,0.1)',
                      paddingTop: '10px',
                    }}
                  >
                    {result.analysis}
                  </pre>
                </>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--red)', padding: '8px 0' }}>
                  ✗ {result.error}: {result.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request schema */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">REQUEST · JSON BODY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '6px 14px', fontSize: '11px' }}>
            <span style={{ color: 'var(--cyan)' }}>token</span>
            <span style={{ color: 'var(--gold)' }}>string</span>
            <span style={{ color: 'rgba(0,255,65,0.6)' }}>required · symbol (AEON) or contract (0x...)</span>
            <span style={{ color: 'var(--cyan)' }}>mode</span>
            <span style={{ color: 'var(--gold)' }}>string</span>
            <span style={{ color: 'rgba(0,255,65,0.6)' }}>analyze | narrative | thesis · default thesis</span>
            <span style={{ color: 'var(--cyan)' }}>chain</span>
            <span style={{ color: 'var(--gold)' }}>string</span>
            <span style={{ color: 'rgba(0,255,65,0.6)' }}>base only · default base</span>
          </div>
        </div>

        {/* Response shape */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">RESPONSE · LIVE SHAPE</div>
          <p style={{ fontSize: '10px', color: 'rgba(0,255,65,0.45)', marginBottom: '8px' }}>
            {ran && result?.ok ? 'Real response from the call above:' : 'Awaiting first live call…'}
          </p>
          <pre
            style={{
              margin: 0,
              fontSize: '10px',
              lineHeight: 1.6,
              color: 'rgba(0,255,65,0.8)',
              overflowX: 'auto',
              whiteSpace: 'pre',
              fontFamily: 'var(--font-mono)',
              maxHeight: '320px',
            }}
          >
            {result ? JSON.stringify(result, null, 2) : '{ }'}
          </pre>
        </div>

        {/* Code examples */}
        <div style={{ marginBottom: '6px', fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.5)' }}>
          ◈ CODE EXAMPLES
        </div>
        <CopyBlock label="// CURL" code={CURL} lang="bash" />
        <CopyBlock label="// JAVASCRIPT" code={JS} lang="js" />
        <CopyBlock label="// PYTHON" code={PY} lang="py" />

        {/* Rate limits */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">RATE LIMITS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '12px' }}>
            <span style={{ color: 'rgba(0,255,65,0.5)' }}>No key</span>
            <span style={{ color: 'var(--green)' }}>3 calls / day</span>
            <span style={{ color: 'rgba(0,255,65,0.5)' }}>X-API-Key</span>
            <span style={{ color: 'var(--green)' }}>20 calls / day (free)</span>
          </div>
        </div>

        {/* Get key */}
        <div className="glass-panel red-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">GET A FREE API KEY</div>
          <p style={{ fontSize: '12px', color: 'rgba(0,255,65,0.7)', marginBottom: '12px', lineHeight: 1.6 }}>
            No signup. No email. Generate a key in your browser and get 20 calls/day instead of 3.
          </p>
          <Link href="/api/keys" className="no-underline">
            <button className="mode-btn active" style={{ fontSize: '11px', padding: '8px 20px', letterSpacing: '0.2em' }}>
              GENERATE KEY →
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
