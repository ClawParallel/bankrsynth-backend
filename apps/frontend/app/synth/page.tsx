'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createX402Payment } from '@/lib/x402'

const FREE_LIMIT = 5

type Mode = 'analyze' | 'narrative' | 'thesis'
type Bucket = 'trending' | 'new_launches' | 'high_volume' | 'ai_agents' | 'bankr_eco'

interface Token {
  id: string
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
}

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'new_launches', label: 'New' },
  { key: 'high_volume', label: 'Volume' },
  { key: 'ai_agents', label: 'AI Agents' },
  { key: 'bankr_eco', label: 'Bankr Eco' },
]

const MODES: { key: Mode; label: string }[] = [
  { key: 'analyze', label: 'ANALYZE' },
  { key: 'narrative', label: 'NARRATIVE' },
  { key: 'thesis', label: 'THESIS' },
]

function fmtP(n: number): string {
  if (!n || !isFinite(n)) return '$0'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  if (n >= 1) return '$' + n.toFixed(4)
  return '$' + n.toPrecision(4)
}

function fmtC(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export default function SynthPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [bucket, setBucket] = useState<Bucket>('trending')
  const [mode, setMode] = useState<Mode>('analyze')
  const [tokens, setTokens] = useState<Token[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensError, setTokensError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [output, setOutput] = useState('')
  const [outputMeta, setOutputMeta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConnectPrompt, setShowConnectPrompt] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState(FREE_LIMIT)
  const [ticker, setTicker] = useState(0)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { const t = setInterval(() => setTicker((n) => n + 1), 1000); return () => clearInterval(t) }, [])

  const fetchTokens = useCallback(async () => {
    setTokensLoading(true)
    setTokensError('')
    try {
      const r = await fetch(`/api/tokens?bucket=${bucket}`)
      const d = (await r.json()) as { tokens?: Token[]; error?: string }
      if (!r.ok || d.error) { setTokensError(d.error ?? 'Failed to load tokens'); setTokens([]); return }
      setTokens(d.tokens ?? [])
      setLastRefresh(Date.now())
    } catch {
      setTokensError('GeckoTerminal unavailable')
      setTokens([])
    }
    setTokensLoading(false)
  }, [bucket])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  // Pre-select a token passed via ?token= (e.g. clicked from the homepage cloud)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('token')
    if (!param) return
    setSearch(param)
    ;(async () => {
      try {
        const r = await fetch(`/api/arena/search?q=${encodeURIComponent(param)}`)
        const d = (await r.json()) as { tokens?: Array<Partial<Token>> }
        const t = d.tokens?.[0]
        if (t && t.symbol) {
          setSelectedToken({
            id: t.id ?? `q:${t.symbol}`,
            symbol: t.symbol,
            name: t.name ?? t.symbol,
            address: t.address ?? null,
            priceUsd: t.priceUsd ?? 0,
            change24h: t.change24h ?? 0,
            change1h: t.change1h ?? 0,
            volume24h: t.volume24h ?? 0,
            marketCap: t.marketCap ?? 0,
            liquidity: t.liquidity ?? 0,
            image: t.image ?? null,
          })
          setSearch(t.symbol)
        }
      } catch { /* leave search text for manual pick */ }
    })()
  }, [])

  function onSearch(val: string) {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!val.trim()) return
    searchDebounce.current = setTimeout(() => {
      const match = tokens.find((t) => t.symbol.toLowerCase().includes(val.toLowerCase()) || t.name.toLowerCase().includes(val.toLowerCase()))
      if (match) setSelectedToken(match)
    }, 300)
  }

  function typewriterOutput(text: string) {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    typewriterRef.current = setInterval(() => {
      i++
      setOutput(text.slice(0, i))
      if (i >= text.length && typewriterRef.current) clearInterval(typewriterRef.current)
    }, 12)
  }

  async function synthesize() {
    if (!selectedToken) return

    if (typewriterRef.current) clearInterval(typewriterRef.current)
    setLoading(true)
    setOutput('')
    setOutputMeta('')
    setError('')
    setShowConnectPrompt(false)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    // Wallet connected → sign a gasless $0.10 USDC.e x402 payment (Sonnet 4.5).
    if (isConnected && address) {
      setOutput('> signing payment...')
      const recipient = process.env.NEXT_PUBLIC_SKALE_PAYMENT_RECIPIENT
      if (!recipient) {
        setLoading(false)
        setOutput('')
        setError('Payment recipient not configured. Contact support.')
        return
      }
      const payment = await createX402Payment(address, recipient)
      if (!payment) {
        setLoading(false)
        setOutput('')
        setError('Payment failed. Get USDC.e at base.skalenodes.com/credits')
        return
      }
      headers['X-PAYMENT'] = payment
    }

    try {
      const res = await fetch('/api/synth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode,
          tokenSymbol: selectedToken.symbol,
          tokenName: selectedToken.name,
          priceUsd: selectedToken.priceUsd,
          change24h: selectedToken.change24h,
          change1h: selectedToken.change1h,
          volume24h: selectedToken.volume24h,
          marketCap: selectedToken.marketCap,
          liquidity: selectedToken.liquidity,
          chain: 'base',
          address: selectedToken.address,
        }),
      })

      const data = (await res.json()) as {
        analysis?: string; error?: string; model?: string
        isPaid?: boolean; remaining?: number | null
      }
      setLoading(false)

      if (res.status === 429) {
        setOutput('')
        setError('Free limit reached (5/day). Connect wallet → pay $0.10 USDC.')
        setFreeRemaining(0)
        setShowConnectPrompt(true)
        return
      }
      if (res.status === 402) {
        setOutput('')
        setError('Payment failed. Need USDC.e on SKALE Base.')
        return
      }
      if (!res.ok || data.error) { setOutput(''); setError(data.error ?? 'synthesis failed'); return }

      if (!data.isPaid && typeof data.remaining === 'number') setFreeRemaining(data.remaining)
      setOutputMeta(data.isPaid
        ? '✓ $0.10 USDC · SKALE Base · gasless'
        : `✓ free · ${data.remaining ?? 0} remaining today`)

      typewriterOutput(data.analysis ?? '')
    } catch {
      setLoading(false)
      setOutput('')
      setError('Network error — synthesis request failed')
    }
  }

  const secondsAgo = lastRefresh ? Math.floor((Date.now() - lastRefresh) / 1000) : null
  const filtered = tokens.filter(
    (t) =>
      !search ||
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <main style={{ minHeight: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', display: 'flex', flexDirection: 'column', background: '#000' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>BANKRSYNTH://</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,2vw,18px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)' }}>
          ◉ SYNTH — AI SYNTHESIS
        </h1>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
        {/* Left panel — 60% */}
        <div style={{ flex: '0 0 60%', borderRight: '1px solid rgba(0,255,65,0.1)', display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflowY: 'auto' }}>
          {/* Token search */}
          <div>
            <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '5px' }}>TOKEN SEARCH</label>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search symbol or name..."
              style={{ width: '100%', background: 'rgba(0,10,3,0.9)', border: '1px solid rgba(0,255,65,0.25)', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '7px 10px', outline: 'none' }}
              autoComplete="off"
            />
            {selectedToken && (
              <div style={{ marginTop: '6px', padding: '6px 10px', background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.2)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--green)' }}>{selectedToken.symbol} <span style={{ color: 'rgba(0,255,65,0.5)' }}>{selectedToken.name}</span></span>
                <button onClick={() => setSelectedToken(null)} style={{ background: 'none', border: 'none', color: 'rgba(0,255,65,0.4)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            )}
          </div>

          {/* Bucket tabs */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {BUCKETS.map((b) => (
              <button key={b.key} onClick={() => setBucket(b.key)} style={{ fontSize: '9px', padding: '4px 10px', background: bucket === b.key ? 'rgba(0,255,65,0.1)' : 'transparent', border: `1px solid ${bucket === b.key ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.15)'}`, color: bucket === b.key ? 'var(--green)' : 'rgba(0,255,65,0.4)', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                {b.label}
              </button>
            ))}
          </div>

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {MODES.map((m) => (
              <button key={m.key} onClick={() => setMode(m.key)} style={{ flex: 1, fontSize: '10px', padding: '7px 4px', background: mode === m.key ? 'rgba(0,255,65,0.1)' : 'transparent', border: `1px solid ${mode === m.key ? 'rgba(0,255,65,0.5)' : 'rgba(0,255,65,0.15)'}`, color: mode === m.key ? 'var(--green)' : 'rgba(0,255,65,0.4)', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', fontWeight: mode === m.key ? 700 : 400 }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Payment mode hint */}
          {isConnected ? (
            <div style={{ padding: '7px 12px', border: '1px solid rgba(0,255,65,0.2)', background: 'rgba(0,255,65,0.04)', fontSize: '10px', color: 'rgba(0,255,65,0.65)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--green)' }}>⚡</span>
              <span>$0.10 USDC.e per synthesis · Sonnet 4.5 · gasless on SKALE Base</span>
            </div>
          ) : (
            <div style={{ padding: '7px 12px', border: `1px solid ${freeRemaining > 0 ? 'rgba(0,255,65,0.15)' : 'rgba(255,165,0,0.3)'}`, background: freeRemaining > 0 ? 'rgba(0,255,65,0.03)' : 'rgba(255,165,0,0.04)', fontSize: '10px', color: freeRemaining > 0 ? 'rgba(0,255,65,0.6)' : 'rgba(255,165,0,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span>{freeRemaining > 0 ? `free · ${freeRemaining}/${FREE_LIMIT} remaining today` : `free limit reached (${FREE_LIMIT}/day)`}</span>
              <span style={{ flexShrink: 0 }}><ConnectButton showBalance={false} accountStatus="address" chainStatus="none" /></span>
            </div>
          )}

          {/* Share Report button */}
          {selectedToken && (
            <button
              onClick={() => router.push(`/report/${selectedToken.address ?? selectedToken.symbol}`)}
              style={{ padding: '7px 12px', background: 'transparent', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.5)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ↗ FULL REPORT FOR {selectedToken.symbol}
            </button>
          )}

          {/* Synthesize button */}
          <button
            onClick={synthesize}
            disabled={loading || !selectedToken}
            style={{ padding: '10px', background: !selectedToken ? 'transparent' : 'rgba(0,255,65,0.06)', border: `1px solid ${!selectedToken ? 'rgba(0,255,65,0.15)' : 'rgba(0,255,65,0.4)'}`, color: !selectedToken ? 'rgba(0,255,65,0.3)' : 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.2em', cursor: !selectedToken ? 'not-allowed' : 'pointer', textShadow: !selectedToken ? 'none' : '0 0 8px rgba(0,255,65,0.4)' }}
          >
            {loading
              ? '◉ SYNTHESIZING...'
              : selectedToken
                ? `◉ SYNTHESIZE ${selectedToken.symbol}${mode !== 'analyze' ? ` — ${mode.toUpperCase()}` : ''}${isConnected ? ' · $0.10 USDC' : ' · free'}`
                : '◉ SELECT TOKEN TO SYNTHESIZE'}
          </button>

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 12px', border: '1px solid rgba(255,26,60,0.3)', color: '#ff4466', fontSize: '11px' }}>✗ {error}</div>
          )}

          {/* Output area */}
          {(output || loading) && (
            <div style={{ flex: 1, padding: '14px', background: 'rgba(0,10,3,0.6)', border: '1px solid rgba(0,255,65,0.15)', minHeight: '200px' }}>
              {loading && !output && (
                <div style={{ color: 'rgba(0,255,65,0.4)', fontSize: '11px' }}>
                  <span>synthesizing</span>
                  <span style={{ animation: 'blink 0.8s infinite' }}>_</span>
                </div>
              )}
              {output && (
                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, color: 'rgba(0,255,65,0.9)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {output}
                </pre>
              )}
              {outputMeta && (
                <div style={{ marginTop: '10px', fontSize: '9px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.1em' }}>{outputMeta}</div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — 40% */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,255,65,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.5)' }}>LIVE TOKENS</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {secondsAgo !== null && <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)' }}>refreshed {ticker > 0 ? secondsAgo : 0}s ago</span>}
              <button onClick={fetchTokens} disabled={tokensLoading} style={{ background: 'none', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.5)', cursor: 'pointer', fontSize: '9px', padding: '3px 8px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                {tokensLoading ? '...' : '↺'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {tokensLoading && tokens.length === 0 && (
              <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ height: '42px', background: 'rgba(0,255,65,0.03)', border: '1px solid rgba(0,255,65,0.06)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}

            {tokensError && (
              <div style={{ padding: '12px', fontSize: '10px', color: '#ff4466' }}>✗ {tokensError}</div>
            )}

            {filtered.map((token) => {
              const isSelected = selectedToken?.id === token.id
              const chgColor = token.change24h >= 0 ? 'var(--green)' : 'var(--red)'
              return (
                <button
                  key={token.id}
                  onClick={() => { setSelectedToken(token); setSearch(token.symbol) }}
                  style={{ width: '100%', background: isSelected ? 'rgba(0,255,65,0.07)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(0,255,65,0.06)', borderLeft: isSelected ? '2px solid var(--green)' : '2px solid transparent', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? 'var(--green)' : 'rgba(0,255,65,0.8)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.symbol}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.8)', fontFamily: 'var(--font-mono)' }}>{fmtP(token.priceUsd)}</div>
                    <div style={{ fontSize: '9px', color: chgColor }}>{fmtC(token.change24h)}</div>
                    <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.25)' }}>v {fmtP(token.volume24h)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {showConnectPrompt && !isConnected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowConnectPrompt(false)}>
          <div className="connect-prompt" onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(0,8,2,0.97)', border: '1px solid rgba(0,255,65,0.3)', boxShadow: '0 0 40px rgba(0,255,65,0.08)', padding: '24px', width: '100%', maxWidth: '420px', fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--green)', letterSpacing: '0.05em', margin: 0 }}>5 free syntheses used today.</p>
            <ConnectButton showBalance={false} />
            <p className="note" style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)', lineHeight: 1.6, margin: 0 }}>
              Connect wallet → $0.10 USDC.e per synthesis · no gas · SKALE Base
            </p>
            <a href="https://base.skalenodes.com/credits" target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'rgba(0,200,255,0.7)', textDecoration: 'none', letterSpacing: '0.1em' }}>
              Get USDC.e →
            </a>
          </div>
        </div>
      )}
    </main>
  )
}
