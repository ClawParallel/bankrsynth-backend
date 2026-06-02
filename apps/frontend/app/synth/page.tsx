'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BYOKModal from '@/components/BYOKModal'
import { loadBYOK, getFreeUsage, recordFreeUsage, FREE_LIMIT } from '@/lib/byok'

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
  const [showBYOK, setShowBYOK] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState(FREE_LIMIT)
  const [ticker, setTicker] = useState(0)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setHasKey(!!loadBYOK())
    setFreeRemaining(getFreeUsage().remaining)
  }, [])
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

  function onSearch(val: string) {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!val.trim()) return
    searchDebounce.current = setTimeout(() => {
      const match = tokens.find((t) => t.symbol.toLowerCase().includes(val.toLowerCase()) || t.name.toLowerCase().includes(val.toLowerCase()))
      if (match) setSelectedToken(match)
    }, 300)
  }

  async function synthesize() {
    if (!selectedToken) return

    const config = loadBYOK()

    if (typewriterRef.current) clearInterval(typewriterRef.current)
    setLoading(true)
    setOutput('')
    setOutputMeta('')
    setError('')

    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config) {
      reqHeaders['X-API-Key'] = config.apiKey
      reqHeaders['X-Provider'] = config.provider
      reqHeaders['X-Model'] = config.model
    }

    try {
      const res = await fetch('/api/synth', {
        method: 'POST',
        headers: reqHeaders,
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
        analysis?: string; error?: string; provider?: string; model?: string
        isFallback?: boolean; remaining?: number; byokPrompt?: boolean
      }
      setLoading(false)

      if (res.status === 429) {
        setError(data.error ?? `Free limit reached (${FREE_LIMIT}/day). Add your API key for unlimited.`)
        setShowBYOK(true)
        return
      }
      if (res.status === 401) {
        setShowBYOK(true)
        return
      }
      if (!res.ok || data.error) { setError(data.error ?? 'Synthesis failed'); return }

      if (data.isFallback) {
        recordFreeUsage(data.remaining)
        const rem = data.remaining ?? 0
        setFreeRemaining(rem)
        setOutputMeta(`via BankrSynth · free (${rem} remaining today)`)
      } else {
        setOutputMeta(`via ${data.provider}/${data.model} · your key`)
      }

      const text = data.analysis ?? ''
      let i = 0
      typewriterRef.current = setInterval(() => {
        i++
        setOutput(text.slice(0, i))
        if (i >= text.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current)
        }
      }, 12)
    } catch {
      setLoading(false)
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

          {/* Free / BYOK status hint */}
          {!hasKey && (
            <div style={{ padding: '7px 12px', border: `1px solid ${freeRemaining > 0 ? 'rgba(0,255,65,0.15)' : 'rgba(255,165,0,0.3)'}`, background: freeRemaining > 0 ? 'rgba(0,255,65,0.03)' : 'rgba(255,165,0,0.04)', fontSize: '10px', color: freeRemaining > 0 ? 'rgba(0,255,65,0.6)' : 'rgba(255,165,0,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{freeRemaining > 0 ? `free · ${freeRemaining}/${FREE_LIMIT} remaining today` : `free limit reached (${FREE_LIMIT}/day)`}</span>
              <button onClick={() => setShowBYOK(true)} style={{ background: 'none', border: `1px solid ${freeRemaining > 0 ? 'rgba(0,255,65,0.2)' : 'rgba(255,165,0,0.3)'}`, color: freeRemaining > 0 ? 'rgba(0,255,65,0.5)' : 'rgba(255,165,0,0.7)', cursor: 'pointer', fontSize: '9px', padding: '3px 8px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                {freeRemaining > 0 ? 'add key →' : 'Groq is free →'}
              </button>
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
                ? `◉ SYNTHESIZE ${selectedToken.symbol}${mode !== 'analyze' ? ` — ${mode.toUpperCase()}` : ''}${!hasKey ? ` · free` : ''}`
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

      {showBYOK && (
        <BYOKModal onClose={() => { setShowBYOK(false); setHasKey(!!loadBYOK()); setFreeRemaining(getFreeUsage().remaining) }} />
      )}
    </main>
  )
}
