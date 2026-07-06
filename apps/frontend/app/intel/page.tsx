'use client'
import { useEffect, useState, useCallback } from 'react'

interface GlobalData {
  totalMcap?: number
  vol24h?: number
  btcDominance?: number
  ethDominance?: number
  mcapChange24h?: number
  activeCryptos?: number
}

interface TrendingCoin {
  symbol?: string
  name?: string
  marketCapRank?: number
  thumb?: string
}

interface BasePool {
  symbol?: string
  price?: number
  change24h?: number
  volume24h?: number
  liquidity?: number
}

interface IntelData {
  global?: GlobalData | null
  trending?: TrendingCoin[]
  basePools?: BasePool[]
  timestamp?: number
  error?: string
}

function fmtP(n: number): string {
  if (!n || !isFinite(n)) return 'n/a'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(4)
}

function fmtC(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export default function IntelPage() {
  const [data, setData] = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [ticker, setTicker] = useState(0)
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState('')
  const [briefAt, setBriefAt] = useState('')

  async function generateBrief() {
    setBriefLoading(true)
    setBriefError('')
    try {
      const r = await fetch('/api/intel/brief', { method: 'POST' })
      const d = (await r.json()) as { brief?: string; error?: string }
      if (!r.ok || d.error) throw new Error(d.error ?? 'brief failed')
      setBrief(d.brief ?? '')
      setBriefAt(new Date().toLocaleTimeString())
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : 'brief generation failed')
    }
    setBriefLoading(false)
  }

  const fetchIntel = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const r = await fetch('/api/intel')
      const d = (await r.json()) as IntelData
      if (d.error && !d.global && !d.trending?.length && !d.basePools?.length) {
        setFetchError(d.error)
      } else {
        setData(d)
        setLastFetch(Date.now())
      }
    } catch {
      setFetchError('Intel API unavailable')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchIntel() }, [fetchIntel])
  useEffect(() => {
    const t = setInterval(fetchIntel, 30000)
    const tick = setInterval(() => setTicker((n) => n + 1), 1000)
    return () => { clearInterval(t); clearInterval(tick) }
  }, [fetchIntel])

  const secondsAgo = lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : null

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>SYNTHVIRTUAL://</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,3vw,22px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
              ◎ INTEL // MARKET INTELLIGENCE
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {secondsAgo !== null && ticker >= 0 && (
              <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)' }}>updated {secondsAgo}s ago · auto-refresh 30s</span>
            )}
            <button onClick={fetchIntel} disabled={loading} className="neon-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '10px' }}>
              {loading ? 'LOADING...' : '↺ REFRESH'}
            </button>
          </div>
        </div>

        {fetchError && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', border: '1px solid rgba(255,60,60,0.3)', color: '#ff4466', fontSize: '11px' }}>
            ✗ {fetchError}
          </div>
        )}

        {loading && !data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: '100px', background: 'rgba(0,255,65,0.03)', border: '1px solid rgba(0,255,65,0.08)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Row 1 — 4 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {/* Total MCap */}
              <div className="glass-panel" style={{ borderTop: '2px solid rgba(0,255,65,0.4)' }}>
                <div className="corner corner-tl" />
                <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.4)', marginBottom: '6px' }}>TOTAL MARKET CAP</p>
                {data.global?.totalMcap ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--green)', textShadow: '0 0 12px rgba(0,255,65,0.4)' }}>
                      {fmtP(data.global.totalMcap)}
                    </p>
                    {data.global.mcapChange24h !== undefined && (
                      <p style={{ fontSize: '10px', color: data.global.mcapChange24h >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                        {fmtC(data.global.mcapChange24h)} 24h
                      </p>
                    )}
                  </>
                ) : <p style={{ color: 'rgba(0,255,65,0.3)', fontSize: '11px' }}>unavailable</p>}
              </div>

              {/* 24h Volume */}
              <div className="glass-panel" style={{ borderTop: '2px solid rgba(255,26,60,0.4)' }}>
                <div className="corner corner-tl" />
                <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.4)', marginBottom: '6px' }}>24H VOLUME</p>
                {data.global?.vol24h ? (
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--red)', textShadow: '0 0 12px rgba(255,26,60,0.4)' }}>
                    {fmtP(data.global.vol24h)}
                  </p>
                ) : <p style={{ color: 'rgba(0,255,65,0.3)', fontSize: '11px' }}>unavailable</p>}
              </div>

              {/* BTC Dominance */}
              <div className="glass-panel" style={{ borderTop: '2px solid rgba(255,215,0,0.4)' }}>
                <div className="corner corner-tl" />
                <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.4)', marginBottom: '6px' }}>BTC DOMINANCE</p>
                {data.global?.btcDominance !== undefined ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 12px rgba(255,215,0,0.4)' }}>
                      {data.global.btcDominance.toFixed(1)}%
                    </p>
                    <div style={{ marginTop: '8px' }}>
                      <div className="prog-track">
                        <div className="prog-fill" style={{ width: `${data.global.btcDominance}%`, background: 'linear-gradient(90deg, rgba(255,215,0,0.5), var(--gold))' }} />
                      </div>
                    </div>
                  </>
                ) : <p style={{ color: 'rgba(0,255,65,0.3)', fontSize: '11px' }}>unavailable</p>}
              </div>

              {/* Base Network */}
              <div className="glass-panel" style={{ borderTop: '2px solid rgba(0,200,255,0.4)' }}>
                <div className="corner corner-tl" />
                <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.4)', marginBottom: '6px' }}>BASE NETWORK</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 10px var(--cyan)', animation: 'pulse 2s infinite' }} />
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--cyan)', textShadow: '0 0 12px rgba(0,200,255,0.4)' }}>ONLINE</p>
                </div>
                <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" style={{ fontSize: '9px', color: 'rgba(0,200,255,0.5)', textDecoration: 'none' }}>basescan.org →</a>
                {data.global?.activeCryptos && (
                  <p style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', marginTop: '4px' }}>{data.global.activeCryptos.toLocaleString()} active cryptos</p>
                )}
              </div>
            </div>

            {/* Row 2 — 2 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '12px' }}>
              {/* CoinGecko Trending */}
              <div className="glass-panel">
                <div className="corner corner-tl" />
                <div className="panel-title">◎ COINGECKO TRENDING</div>
                {data.trending && data.trending.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {data.trending.slice(0, 8).map((coin, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(0,255,65,0.06)' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', width: '16px', flexShrink: 0 }}>#{i + 1}</span>
                        {coin.thumb && (
                          <img src={coin.thumb} alt={coin.symbol ?? ''} style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.05em', minWidth: '60px' }}>{coin.symbol}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.45)' }}>{coin.name}</span>
                        {coin.marketCapRank && (
                          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', marginLeft: 'auto' }}>rank #{coin.marketCapRank}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '11px', color: 'rgba(0,255,65,0.3)' }}>CoinGecko data unavailable</p>
                )}
              </div>

              {/* Base Trending */}
              <div className="glass-panel">
                <div className="corner corner-tl" />
                <div className="panel-title">⬢ BASE TRENDING POOLS</div>
                {data.basePools && data.basePools.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {data.basePools.slice(0, 8).map((pool, i) => {
                      const chgColor = (pool.change24h ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(0,255,65,0.06)' }}>
                          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', width: '16px', flexShrink: 0 }}>#{i + 1}</span>
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, minWidth: '80px' }}>{pool.symbol ?? '?'}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(0,255,65,0.7)', fontFamily: 'var(--font-mono)', minWidth: '90px' }}>{fmtP(pool.price ?? 0)}</span>
                          <span style={{ fontSize: '10px', color: chgColor, minWidth: '60px' }}>{pool.change24h !== undefined ? fmtC(pool.change24h) : ''}</span>
                          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', marginLeft: 'auto' }}>vol {fmtP(pool.volume24h ?? 0)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '11px', color: 'rgba(0,255,65,0.3)' }}>GeckoTerminal data unavailable</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Section 3 — AI Market Brief */}
        <div className="glass-panel" style={{ marginTop: '16px' }}>
          <div className="corner corner-tl" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div className="panel-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>◉ AI MARKET BRIEF</div>
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              className="neon-btn"
              style={{ width: 'auto', padding: '6px 16px', fontSize: '10px' }}
            >
              {briefLoading ? '◉ GENERATING...' : brief ? '↻ REGENERATE' : '◉ GENERATE BRIEF'}
            </button>
          </div>

          {!brief && !briefLoading && !briefError && (
            <p style={{ fontSize: '10px', color: 'rgba(0,255,65,0.35)', lineHeight: 1.6 }}>
              Generate a live AI market brief from current CoinGecko macro + GeckoTerminal Base data.
              Powered by claude-sonnet-4-5.
            </p>
          )}

          {briefLoading && (
            <p style={{ fontSize: '11px', color: 'rgba(0,255,65,0.45)' }}>
              fetching live data → synthesizing with claude-sonnet-4-5<span style={{ animation: 'blink 0.7s step-end infinite' }}>...</span>
            </p>
          )}

          {briefError && (
            <p style={{ fontSize: '11px', color: '#ff4466' }}>✗ {briefError}</p>
          )}

          {brief && !briefLoading && (
            <div>
              <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.15em', marginBottom: '8px' }}>
                claude-sonnet-4-5 · generated {briefAt}
              </div>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, color: 'rgba(0,255,65,0.85)', whiteSpace: 'pre-wrap', margin: 0, borderLeft: '2px solid var(--green)', paddingLeft: '12px' }}>
                {brief}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
