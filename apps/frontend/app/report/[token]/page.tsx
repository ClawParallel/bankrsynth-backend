import type { Metadata } from 'next'
import Link from 'next/link'
import ShareBar from './ShareBar'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

interface ReportData {
  symbol: string
  name: string
  address: string | null
  priceUsd: number
  change24h: number
  change1h: number
  volume24h: number
  marketCap: number
  liquidity: number
  image: string | null
  verdict: string
  synthesis: { analyze: string | null; narrative: string | null; thesis: string | null } | null
  whaleAlerts: Array<{ valueUsd: number; from: string; to: string; txHash: string; timestamp: string }>
  generatedAt: number
  error?: string
}

async function fetchReport(tokenId: string): Promise<ReportData | null> {
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001'
    const r = await fetch(`${origin}/api/report/${encodeURIComponent(tokenId)}`, {
      next: { revalidate: 300 },
    })
    if (!r.ok) return null
    return (await r.json()) as ReportData
  } catch { return null }
}

function fmtP(n: number): string {
  if (!n || !isFinite(n)) return '$0'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  if (n >= 1) return '$' + n.toFixed(4)
  return '$' + n.toPrecision(4)
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  } catch { return '' }
}

function whaleBadge(usd: number): string {
  if (usd >= 100000) return 'MEGA'
  if (usd >= 50000) return 'WHALE'
  return 'LARGE'
}

function verdictBg(v: string): string {
  if (v === 'ACCUMULATE') return 'rgba(0,255,65,0.08)'
  if (v === 'AVOID') return 'rgba(255,26,60,0.08)'
  return 'rgba(255,176,0,0.08)'
}
function verdictBorder(v: string): string {
  if (v === 'ACCUMULATE') return 'rgba(0,255,65,0.5)'
  if (v === 'AVOID') return 'rgba(255,26,60,0.5)'
  return 'rgba(255,176,0,0.5)'
}
function verdictColor(v: string): string {
  if (v === 'ACCUMULATE') return 'var(--green)'
  if (v === 'AVOID') return 'var(--red)'
  return 'var(--gold)'
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const data = await fetchReport(token)

  if (!data) {
    return {
      title: 'Token Report — BankrSynth',
      description: 'AI-generated token intelligence report on BankrSynth',
    }
  }

  const changeStr = `${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%`
  const ogUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/report/og?token=${token}`
    : `http://localhost:3001/api/report/og?token=${token}`

  return {
    title: `$${data.symbol} Intelligence Report — BankrSynth`,
    description: `${data.verdict} · Price: ${fmtP(data.priceUsd)} · 24h: ${changeStr} | synthterminal.app`,
    openGraph: {
      title: `$${data.symbol} · ${data.verdict} — BankrSynth`,
      description: data.synthesis?.analyze?.slice(0, 160) ?? `${data.symbol} analysis on BankrSynth`,
      images: [ogUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `$${data.symbol} Analysis — BankrSynth`,
      description: `${data.verdict} · ${fmtP(data.priceUsd)} · ${changeStr}`,
      images: [ogUrl],
    },
  }
}

const PANEL: React.CSSProperties = {
  background: 'rgba(0,10,3,0.85)',
  border: '1px solid rgba(0,255,65,0.2)',
  padding: '14px',
  position: 'relative',
  overflow: 'hidden',
}

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '9px',
  letterSpacing: '0.3em',
  color: 'rgba(0,255,65,0.5)',
  textTransform: 'uppercase',
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: '1px solid rgba(0,255,65,0.1)',
}

const METRIC_LABEL: React.CSSProperties = { fontSize: '9px', color: 'rgba(0,255,65,0.45)', letterSpacing: '0.1em' }
const METRIC_VAL: React.CSSProperties = { fontSize: '13px', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchReport(token)

  if (!data || data.error) {
    return (
      <main style={{ minHeight: '100dvh', paddingTop: '64px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--red)', marginBottom: '8px' }}>TOKEN NOT FOUND</div>
          <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.4)', marginBottom: '16px' }}>{data?.error ?? `Could not find token: ${token}`}</div>
          <Link href="/synth" style={{ fontSize: '10px', color: 'var(--green)', letterSpacing: '0.15em' }}>← BACK TO SYNTH</Link>
        </div>
      </main>
    )
  }

  const chgColor = data.change24h >= 0 ? 'var(--green)' : 'var(--red)'
  const chg1hColor = data.change1h >= 0 ? 'var(--green)' : 'var(--red)'
  const volMcap = data.marketCap > 0 ? ((data.volume24h / data.marketCap) * 100).toFixed(2) + '%' : 'n/a'
  const liqMcap = data.marketCap > 0 ? ((data.liquidity / data.marketCap) * 100).toFixed(2) + '%' : 'n/a'

  const priceStr = data.priceUsd < 0.001
    ? '$' + data.priceUsd.toPrecision(4)
    : data.priceUsd < 1
    ? '$' + data.priceUsd.toFixed(6)
    : '$' + data.priceUsd.toFixed(4)

  return (
    <main style={{ minHeight: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', background: '#000', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

        {/* Header bar */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,255,65,0.1)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>BANKRSYNTH INTELLIGENCE REPORT</div>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', letterSpacing: '0.15em', marginTop: '2px' }}>
              generated just now · synthterminal.app
            </div>
          </div>
          <Link href="/synth" style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.15em', textDecoration: 'none' }}>← SYNTH</Link>
        </div>

        {/* Token hero */}
        <div style={{ ...PANEL, marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {data.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.image} alt={data.symbol} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(0,255,65,0.2)' }} />
              )}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', lineHeight: 1 }}>
                  ${data.symbol}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.5)', marginTop: '4px' }}>{data.name} · Base Mainnet</div>
                {data.address && (
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    <a href={`https://basescan.org/token/${data.address}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                      {shortAddr(data.address)} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>
                {priceStr}
              </div>
              <div style={{ fontSize: '16px', color: chgColor, marginTop: '4px', fontWeight: 700 }}>
                {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}% ↑
              </div>
              <div style={{ fontSize: '10px', color: chg1hColor, marginTop: '2px' }}>
                1h: {data.change1h >= 0 ? '+' : ''}{data.change1h.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Quick metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,255,65,0.08)' }}>
            {[
              { label: 'PRICE', value: priceStr },
              { label: 'MCAP', value: fmtP(data.marketCap) },
              { label: '24H VOL', value: fmtP(data.volume24h) },
              { label: 'LIQUIDITY', value: fmtP(data.liquidity) },
            ].map(m => (
              <div key={m.label}>
                <div style={METRIC_LABEL}>{m.label}</div>
                <div style={{ ...METRIC_VAL, fontSize: '12px' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Synthesis + On-chain grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px', marginBottom: '12px' }}>
          {/* Analyze */}
          <div style={{ ...PANEL, gridColumn: data.synthesis?.analyze ? undefined : 'span 2' }}>
            <div style={{ ...TITLE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>◉ ANALYZE</span>
              {data.verdict && (
                <span style={{ padding: '2px 10px', background: verdictBg(data.verdict), border: `1px solid ${verdictBorder(data.verdict)}`, color: verdictColor(data.verdict), fontSize: '9px', letterSpacing: '0.2em' }}>
                  {data.verdict}
                </span>
              )}
            </div>
            {data.synthesis?.analyze ? (
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: 'rgba(0,255,65,0.85)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {data.synthesis.analyze}
              </pre>
            ) : (
              <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>Synthesis unavailable — set ANTHROPIC_FALLBACK_KEY</div>
            )}
          </div>

          {/* On-chain metrics */}
          <div style={PANEL}>
            <div style={TITLE}>ON-CHAIN</div>
            {[
              { label: 'Vol/MCap', value: volMcap },
              { label: 'Liq/MCap', value: liqMcap },
              { label: '24h Vol', value: fmtP(data.volume24h) },
              { label: 'Liquidity', value: fmtP(data.liquidity) },
              { label: 'MCap', value: fmtP(data.marketCap) },
            ].map(m => (
              <div key={m.label} className="metric-row">
                <span className="metric-label">{m.label}</span>
                <span className="metric-val" style={{ fontSize: '11px' }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative + Thesis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={PANEL}>
            <div style={TITLE}>◎ NARRATIVE</div>
            {data.synthesis?.narrative ? (
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: 'rgba(0,255,65,0.85)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {data.synthesis.narrative}
              </pre>
            ) : (
              <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>—</div>
            )}
          </div>
          <div style={PANEL}>
            <div style={TITLE}>◆ ALPHA THESIS</div>
            {data.synthesis?.thesis ? (
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: 'rgba(0,255,65,0.85)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {data.synthesis.thesis}
              </pre>
            ) : (
              <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>—</div>
            )}
          </div>
        </div>

        {/* Whale alerts */}
        {data.whaleAlerts.length > 0 && (
          <div style={{ ...PANEL, marginBottom: '12px' }}>
            <div style={TITLE}>⬟ RECENT WHALE ACTIVITY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {data.whaleAlerts.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(0,255,65,0.05)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '9px', padding: '2px 7px', background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.7)', letterSpacing: '0.1em', flexShrink: 0 }}>
                    {whaleBadge(w.valueUsd)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>
                    ${w.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {w.from ? shortAddr(w.from) : '?'}→{w.to ? shortAddr(w.to) : '?'}
                  </span>
                  {w.timestamp && (
                    <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', flexShrink: 0 }}>{relTime(w.timestamp)}</span>
                  )}
                  {w.txHash && (
                    <a
                      href={`https://basescan.org/tx/${w.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '9px', color: 'rgba(0,200,255,0.6)', textDecoration: 'none', letterSpacing: '0.1em', flexShrink: 0 }}
                    >
                      [basescan]
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 0', fontSize: '9px', color: 'rgba(0,255,65,0.2)', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.8 }}>
          Generated by BankrSynth · synthterminal.app · Built on Base<br />
          Prices: GeckoTerminal · Whale data: Blockscout · Not financial advice
        </div>
      </div>

      {/* Sticky share bar */}
      <ShareBar
        symbol={data.symbol}
        verdict={data.verdict}
        price={priceStr}
        change24h={data.change24h}
        tokenId={token}
      />
    </main>
  )
}
