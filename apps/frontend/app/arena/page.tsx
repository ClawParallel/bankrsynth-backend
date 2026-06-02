'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

interface Portfolio {
  wallet: string
  usdc: number
  holdings: Record<string, { balance: number; avgPrice: number; address: string }>
  startValue: number
  joinedAt: number
  trades: number
  currentValue?: number
}

interface TradeRecord {
  id: string
  tokenSymbol: string
  tradeType: 'buy' | 'sell'
  usdcAmount: number
  price: number
  tokensAmount: number
  timestamp: number
}

interface LeaderboardEntry {
  wallet: string
  displayName: string
  currentValue: number
  startValue: number
  pnlPercent: number
  pnlUsd: number
  trades: number
  rank: number
}

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

function fmtP(n: number): string {
  if (!n || !isFinite(n)) return '$0'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  if (n >= 1) return '$' + n.toFixed(4)
  return '$' + n.toPrecision(4)
}

function fmtTokens(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return n.toPrecision(4)
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getCountdown(period: 'weekly' | 'monthly'): string {
  const now = new Date()
  const target = new Date(now)
  if (period === 'weekly') {
    const day = now.getUTCDay()
    const daysUntil = day === 1 ? 7 : (8 - day) % 7 || 7
    target.setUTCDate(now.getUTCDate() + daysUntil)
    target.setUTCHours(0, 0, 0, 0)
  } else {
    target.setUTCMonth(now.getUTCMonth() + 1, 1)
    target.setUTCHours(0, 0, 0, 0)
  }
  const diff = target.getTime() - now.getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function ts(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

export default function ArenaPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const [tokens, setTokens] = useState<Token[]>([])
  const [tokenSearch, setTokenSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [usdcAmount, setUsdcAmount] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeMsg, setTradeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [trades, setTrades] = useState<TradeRecord[]>([])

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbPeriod, setLbPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [countdown, setCountdown] = useState('')

  const [ticker, setTicker] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(getCountdown(lbPeriod))
      setTicker(n => n + 1)
    }, 1000)
    setCountdown(getCountdown(lbPeriod))
    return () => clearInterval(t)
  }, [lbPeriod])

  // Load tokens for search
  useEffect(() => {
    fetch('/api/tokens?bucket=trending')
      .then(r => r.json())
      .then((d: { tokens?: Token[] }) => setTokens(d.tokens ?? []))
      .catch(() => {})
  }, [])

  // Load portfolio when wallet connects
  const loadPortfolio = useCallback(async () => {
    if (!address) return
    setPortfolioLoading(true)
    try {
      const r = await fetch(`/api/arena?action=portfolio&wallet=${address}`)
      const p = (await r.json()) as Portfolio | null
      setPortfolio(p)
      setJoined(!!p)
    } catch { /* ignore */ }
    setPortfolioLoading(false)
  }, [address])

  useEffect(() => {
    if (address) {
      loadPortfolio()
      fetch(`/api/arena?action=trades&wallet=${address}`)
        .then(r => r.json())
        .then((d: { trades?: TradeRecord[] }) => setTrades(d.trades ?? []))
        .catch(() => {})
    } else {
      setPortfolio(null)
      setJoined(false)
    }
  }, [address, loadPortfolio])

  // Load leaderboard
  useEffect(() => {
    fetch(`/api/arena?action=leaderboard&period=${lbPeriod}`)
      .then(r => r.json())
      .then((d: { leaderboard?: LeaderboardEntry[] }) => setLeaderboard(d.leaderboard ?? []))
      .catch(() => {})
  }, [lbPeriod, ticker])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function handleJoin() {
    if (!address) return
    setJoining(true)
    try {
      const r = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', wallet: address }),
      })
      const d = (await r.json()) as { ok?: boolean; portfolio?: Portfolio; error?: string }
      if (d.ok && d.portfolio) {
        setPortfolio(d.portfolio)
        setJoined(true)
      } else if (d.error === 'already joined') {
        await loadPortfolio()
      }
    } catch { /* ignore */ }
    setJoining(false)
  }

  async function executeTrade() {
    if (!address || !selectedToken || !usdcAmount || !selectedToken.address) return
    const amt = parseFloat(usdcAmount)
    if (isNaN(amt) || amt < 10) {
      setTradeMsg({ ok: false, text: 'Minimum trade: $10 USDC' })
      return
    }
    setTradeLoading(true)
    setTradeMsg(null)
    try {
      const r = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trade',
          wallet: address,
          tokenSymbol: selectedToken.symbol,
          tokenAddress: selectedToken.address,
          tradeType,
          usdcAmount: amt,
        }),
      })
      const d = (await r.json()) as {
        ok?: boolean
        trade?: { tokenSymbol: string; tradeType: string; usdcAmount: number; price: number; tokensAmount: number }
        portfolio?: Portfolio
        error?: string
      }
      if (d.ok && d.trade && d.portfolio) {
        const t = d.trade
        setPortfolio(d.portfolio)
        setUsdcAmount('')
        const action = t.tradeType === 'buy' ? 'Bought' : 'Sold'
        setTradeMsg({ ok: true, text: `✓ ${action} ${fmtTokens(t.tokensAmount)} ${t.tokenSymbol} at ${fmtP(t.price)}` })
        // Refresh trades
        fetch(`/api/arena?action=trades&wallet=${address}`)
          .then(rr => rr.json())
          .then((dd: { trades?: TradeRecord[] }) => setTrades(dd.trades ?? []))
          .catch(() => {})
      } else {
        setTradeMsg({ ok: false, text: d.error ?? 'Trade failed' })
      }
    } catch {
      setTradeMsg({ ok: false, text: 'Network error — try again' })
    }
    setTradeLoading(false)
  }

  const searchFiltered = tokenSearch.trim()
    ? tokens.filter(t =>
        t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(tokenSearch.toLowerCase()),
      ).slice(0, 8)
    : []

  const portfolioValue = portfolio
    ? portfolio.usdc +
      Object.values(portfolio.holdings).reduce((s, h) => s + h.balance * h.avgPrice, 0)
    : 0
  const pnlAbs = portfolioValue - 10000
  const pnlPercent = (pnlAbs / 10000) * 100
  const myRank = portfolio
    ? leaderboard.findIndex(e => e.wallet.toLowerCase() === address?.toLowerCase()) + 1
    : 0

  const tokensToReceive = selectedToken && usdcAmount && parseFloat(usdcAmount) > 0
    ? parseFloat(usdcAmount) / selectedToken.priceUsd
    : 0

  const PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(0,10,3,0.85)',
    border: '1px solid rgba(0,255,65,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const TITLE_STYLE: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '0.3em',
    color: 'rgba(0,255,65,0.5)',
    textTransform: 'uppercase',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(0,255,65,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  }

  return (
    <main style={{ minHeight: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>BANKRSYNTH://</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,2vw,18px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)' }}>
          ⚔ ARENA — PAPER TRADING COMPETITION
        </h1>
        <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em', marginTop: '2px' }}>
          $10,000 VIRTUAL USDC · REAL GECKOTERMINAL PRICES · BASE TOKENS
        </div>
      </div>

      {/* Three-panel layout */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, gap: '1px', background: 'rgba(0,255,65,0.08)' }}>

        {/* ── LEFT: Portfolio (340px) ── */}
        <div style={{ ...PANEL_STYLE, width: '340px', minWidth: '280px', flexShrink: 0 }} className="hide-mobile">
          <div style={TITLE_STYLE}>
            <span style={{ color: 'var(--green)' }}>▶</span> VIRTUAL PORTFOLIO
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {!isConnected && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
                <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.5)', textAlign: 'center', lineHeight: 1.6 }}>
                  Connect your wallet<br />to join the Arena
                </div>
                <button
                  onClick={() => openConnectModal?.()}
                  disabled={false}
                  className="neon-btn"
                  style={{ fontSize: '10px', padding: '8px 20px', width: 'auto' }}
                >
                  {'◈ CONNECT WALLET'}
                </button>
              </div>
            )}

            {isConnected && portfolioLoading && (
              <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)', padding: '16px 0' }}>
                loading<span style={{ animation: 'blink 0.8s infinite' }}>_</span>
              </div>
            )}

            {isConnected && !portfolioLoading && !joined && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', border: '1px solid rgba(0,255,65,0.15)', background: 'rgba(0,255,65,0.03)' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.6)', marginBottom: '6px' }}>START WITH</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--green)', textShadow: '0 0 12px rgba(0,255,65,0.4)' }}>$10,000.00</div>
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', marginTop: '4px' }}>virtual USDC</div>
                </div>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="neon-btn"
                  style={{ fontSize: '11px' }}
                >
                  {joining ? '⚔ JOINING...' : '⚔ JOIN ARENA'}
                </button>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', lineHeight: 1.6 }}>
                  No real money. Trade Base tokens at live market prices.
                  Compete for top leaderboard rank.
                </div>
              </div>
            )}

            {isConnected && joined && portfolio && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Summary */}
                <div style={{ border: '1px solid rgba(0,255,65,0.15)', background: 'rgba(0,255,65,0.03)', padding: '10px' }}>
                  <div className="metric-row">
                    <span className="metric-label">Starting capital</span>
                    <span className="metric-val">$10,000.00</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Current value</span>
                    <span className="metric-val">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">P&L</span>
                    <span className="metric-val" style={{ color: pnlAbs >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {pnlAbs >= 0 ? '+' : ''}${Math.abs(pnlAbs).toFixed(2)} ({pnlAbs >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">USDC balance</span>
                    <span className="metric-val">${portfolio.usdc.toFixed(2)}</span>
                  </div>
                  {myRank > 0 && (
                    <div className="metric-row">
                      <span className="metric-label">Rank</span>
                      <span className="metric-val" style={{ color: myRank <= 3 ? 'var(--gold)' : 'var(--green)' }}>
                        {myRank <= 3 ? ['👑','🥈','🥉'][myRank - 1] + ' ' : '#'}{myRank} this {lbPeriod === 'weekly' ? 'week' : 'month'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Holdings */}
                {Object.keys(portfolio.holdings).length > 0 && (
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', marginBottom: '6px' }}>HOLDINGS</div>
                    {Object.entries(portfolio.holdings).map(([sym, h]) => (
                      <div key={sym} style={{ borderBottom: '1px solid rgba(0,255,65,0.06)', padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{sym}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>{fmtTokens(h.balance)} tokens</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.7)' }}>{fmtP(h.avgPrice)}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>{fmtP(h.balance * h.avgPrice)}</div>
                        </div>
                        <button
                          onClick={() => {
                            const t = tokens.find(t => t.symbol === sym)
                            if (t) { setSelectedToken(t); setTradeType('sell'); setTokenSearch(sym) }
                          }}
                          style={{ background: 'rgba(255,26,60,0.08)', border: '1px solid rgba(255,26,60,0.3)', color: 'var(--red)', fontSize: '9px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', flexShrink: 0 }}
                        >
                          SELL
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', paddingTop: '4px' }}>
                  {portfolio.trades} trade{portfolio.trades !== 1 ? 's' : ''} · joined {ts(portfolio.joinedAt)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Trade Panel ── */}
        <div style={{ ...PANEL_STYLE, flex: 1, minWidth: 0 }}>
          <div style={TITLE_STYLE}>
            <span style={{ color: 'var(--green)' }}>▶</span> TRADE
            {selectedToken && <span style={{ color: 'rgba(0,255,65,0.5)' }}>— {selectedToken.symbol}</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Token search */}
            <div ref={searchRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '4px' }}>TOKEN SEARCH</label>
              <input
                value={tokenSearch}
                onChange={e => { setTokenSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search symbol or name..."
                className="terminal-input"
                autoComplete="off"
              />
              {showDropdown && searchFiltered.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(0,8,2,0.98)', border: '1px solid rgba(0,255,65,0.3)', zIndex: 10, maxHeight: '280px', overflowY: 'auto' }}>
                  {searchFiltered.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedToken(t); setTokenSearch(t.symbol); setShowDropdown(false); setTradeMsg(null) }}
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,255,65,0.05)', padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{t.symbol}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>{t.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.8)' }}>{fmtP(t.priceUsd)}</div>
                        <div style={{ fontSize: '9px', color: t.change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected token info */}
            {selectedToken && (
              <div style={{ border: '1px solid rgba(0,255,65,0.2)', background: 'rgba(0,255,65,0.03)', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--green)', fontWeight: 700 }}>${selectedToken.symbol}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)' }}>{selectedToken.name} · Base</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', color: 'rgba(0,255,65,0.9)', fontFamily: 'var(--font-mono)' }}>{fmtP(selectedToken.priceUsd)}</div>
                    <div style={{ fontSize: '11px', color: selectedToken.change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {selectedToken.change24h >= 0 ? '+' : ''}{selectedToken.change24h.toFixed(2)}% 24h
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>24h VOL</div>
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.8)' }}>{fmtP(selectedToken.volume24h)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>LIQUIDITY</div>
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.8)' }}>{fmtP(selectedToken.liquidity)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>MCAP</div>
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.8)' }}>{fmtP(selectedToken.marketCap)}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedToken && (
              <>
                {/* BUY / SELL toggle */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['buy', 'sell'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTradeType(t)}
                      style={{ flex: 1, padding: '8px', fontSize: '11px', letterSpacing: '0.2em', fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer', border: `1px solid ${tradeType === t ? (t === 'buy' ? 'rgba(0,255,65,0.6)' : 'rgba(255,26,60,0.6)') : 'rgba(0,255,65,0.15)'}`, background: tradeType === t ? (t === 'buy' ? 'rgba(0,255,65,0.1)' : 'rgba(255,26,60,0.1)') : 'transparent', color: tradeType === t ? (t === 'buy' ? 'var(--green)' : 'var(--red)') : 'rgba(0,255,65,0.4)' }}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Amount input */}
                <div>
                  <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '4px' }}>
                    {tradeType === 'buy' ? 'USDC TO SPEND' : 'USDC TO RECEIVE'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(0,255,65,0.5)' }}>$</span>
                    <input
                      type="number"
                      value={usdcAmount}
                      onChange={e => setUsdcAmount(e.target.value)}
                      placeholder="0.00"
                      min="10"
                      step="10"
                      className="terminal-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                  {tokensToReceive > 0 && (
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)', marginTop: '4px' }}>
                      at market: {fmtP(selectedToken.priceUsd)} per token →{' '}
                      <span style={{ color: 'var(--green)' }}>{fmtTokens(tokensToReceive)} {selectedToken.symbol}</span>
                    </div>
                  )}
                  {portfolio && tradeType === 'buy' && (
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', marginTop: '3px' }}>
                      available: ${portfolio.usdc.toFixed(2)} USDC
                    </div>
                  )}
                </div>

                {/* Execute button */}
                {!isConnected ? (
                  <button
                    onClick={() => openConnectModal?.()}
                    className="neon-btn"
                    style={{ fontSize: '10px' }}
                  >
                    ◈ CONNECT WALLET TO TRADE
                  </button>
                ) : !joined ? (
                  <button onClick={handleJoin} disabled={joining} className="neon-btn" style={{ fontSize: '10px' }}>
                    {joining ? '⚔ JOINING...' : '⚔ JOIN ARENA FIRST'}
                  </button>
                ) : (
                  <button
                    onClick={executeTrade}
                    disabled={tradeLoading || !usdcAmount || parseFloat(usdcAmount) < 10}
                    className={`neon-btn${tradeType === 'sell' ? ' red-btn' : ''}`}
                    style={{ fontSize: '11px' }}
                  >
                    {tradeLoading
                      ? '⟳ EXECUTING...'
                      : usdcAmount && parseFloat(usdcAmount) >= 10
                        ? `${tradeType === 'buy' ? '▲ BUY' : '▼ SELL'} ${selectedToken.symbol} — $${parseFloat(usdcAmount).toFixed(2)}`
                        : 'ENTER USDC AMOUNT (min $10)'}
                  </button>
                )}

                {tradeMsg && (
                  <div style={{ padding: '8px 12px', border: `1px solid ${tradeMsg.ok ? 'rgba(0,255,65,0.3)' : 'rgba(255,26,60,0.3)'}`, background: tradeMsg.ok ? 'rgba(0,255,65,0.05)' : 'rgba(255,26,60,0.05)', fontSize: '11px', color: tradeMsg.ok ? 'var(--green)' : 'var(--red)' }}>
                    {tradeMsg.text}
                  </div>
                )}
              </>
            )}

            {!selectedToken && (
              <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.3)', paddingTop: '8px' }}>
                Search for a Base token above to start trading
              </div>
            )}

            {/* Recent trades */}
            {trades.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', marginBottom: '6px' }}>RECENT TRADES</div>
                <div style={{ border: '1px solid rgba(0,255,65,0.1)' }}>
                  {trades.slice(0, 10).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderBottom: '1px solid rgba(0,255,65,0.05)', fontSize: '10px', gap: '8px' }}>
                      <span style={{ color: 'rgba(0,255,65,0.4)', flexShrink: 0, fontSize: '9px' }}>{ts(t.timestamp)}</span>
                      <span style={{ color: t.tradeType === 'buy' ? 'var(--green)' : 'var(--red)', fontWeight: 700, flexShrink: 0 }}>{t.tradeType.toUpperCase()}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>{t.tokenSymbol}</span>
                      <span style={{ color: 'rgba(0,255,65,0.7)' }}>${t.usdcAmount.toFixed(0)} @ {fmtP(t.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile portfolio summary */}
            <div className="sm:hidden" style={{ marginTop: '8px' }}>
              {!isConnected && (
                <button onClick={() => openConnectModal?.()} disabled={false} className="neon-btn" style={{ fontSize: '10px' }}>
                  {'◈ CONNECT WALLET TO JOIN'}
                </button>
              )}
              {isConnected && !joined && (
                <button onClick={handleJoin} disabled={joining} className="neon-btn" style={{ fontSize: '10px' }}>
                  {joining ? '⚔ JOINING...' : '⚔ JOIN ARENA ($10,000 USDC)'}
                </button>
              )}
              {isConnected && joined && portfolio && (
                <div style={{ padding: '10px', border: '1px solid rgba(0,255,65,0.15)', background: 'rgba(0,255,65,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'rgba(0,255,65,0.5)' }}>Portfolio</span>
                    <span style={{ color: pnlAbs >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      ${portfolioValue.toFixed(2)} ({pnlAbs >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Leaderboard (340px) ── */}
        <div style={{ ...PANEL_STYLE, width: '340px', minWidth: '280px', flexShrink: 0 }} className="hide-mobile">
          <div style={TITLE_STYLE}>
            <span style={{ color: 'var(--green)' }}>▶</span> LEADERBOARD
          </div>

          {/* Period tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0 }}>
            {(['weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setLbPeriod(p)}
                style={{ flex: 1, padding: '7px', fontSize: '9px', letterSpacing: '0.2em', fontFamily: 'var(--font-display)', cursor: 'pointer', border: 'none', borderBottom: `2px solid ${lbPeriod === p ? 'var(--green)' : 'transparent'}`, background: lbPeriod === p ? 'rgba(0,255,65,0.05)' : 'transparent', color: lbPeriod === p ? 'var(--green)' : 'rgba(0,255,65,0.4)' }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,255,65,0.06)', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.1em' }}>
              resets {lbPeriod === 'weekly' ? 'Monday 00:00 UTC' : '1st of month UTC'} · {countdown} remaining
            </span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px', gap: '4px', padding: '5px 10px', borderBottom: '1px solid rgba(0,255,65,0.08)', flexShrink: 0 }}>
            {['#', 'TRADER', 'P&L%', 'VALUE'].map(h => (
              <div key={h} style={{ fontSize: '8px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em' }}>{h}</div>
            ))}
          </div>

          {/* Leaderboard rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leaderboard.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>
                No traders yet — join to start!
              </div>
            )}
            {leaderboard.map((entry, i) => {
              const rank = i + 1
              const isMe = entry.wallet.toLowerCase() === address?.toLowerCase()
              const crown = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
              return (
                <div
                  key={entry.wallet}
                  style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px', gap: '4px', padding: '6px 10px', borderBottom: '1px solid rgba(0,255,65,0.05)', background: isMe ? 'rgba(0,255,65,0.06)' : 'transparent', borderLeft: isMe ? '2px solid var(--green)' : '2px solid transparent' }}
                >
                  <div style={{ fontSize: '11px', color: rank <= 3 ? 'var(--gold)' : 'rgba(0,255,65,0.5)' }}>
                    {crown ?? `${rank}`}
                  </div>
                  <div style={{ fontSize: '10px', color: isMe ? 'var(--green)' : 'rgba(0,255,65,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                    {shortAddr(entry.wallet)}{isMe && ' ← you'}
                  </div>
                  <div style={{ fontSize: '10px', color: entry.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)', textAlign: 'right' }}>
                    {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.7)', textAlign: 'right' }}>
                    {fmtP(entry.currentValue)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Badges info */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,255,65,0.08)', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', lineHeight: 1.6, letterSpacing: '0.05em' }}>
              <div>◆ Top 10 weekly → Verified Analyst badge</div>
              <div>◆ Top 3 monthly → Hall of Fame status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile leaderboard (below trade panel) */}
      <div className="sm:hidden" style={{ borderTop: '1px solid rgba(0,255,65,0.1)', padding: '12px' }}>
        <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.5)', letterSpacing: '0.2em', marginBottom: '8px' }}>LEADERBOARD</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {(['weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setLbPeriod(p)} style={{ flex: 1, padding: '5px', fontSize: '9px', letterSpacing: '0.15em', cursor: 'pointer', border: `1px solid ${lbPeriod === p ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.1)'}`, background: lbPeriod === p ? 'rgba(0,255,65,0.08)' : 'transparent', color: lbPeriod === p ? 'var(--green)' : 'rgba(0,255,65,0.4)', fontFamily: 'var(--font-display)' }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        {leaderboard.slice(0, 5).map((entry, i) => {
          const rank = i + 1
          const isMe = entry.wallet.toLowerCase() === address?.toLowerCase()
          return (
            <div key={entry.wallet} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,255,65,0.05)', background: isMe ? 'rgba(0,255,65,0.04)' : 'transparent' }}>
              <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)' }}>#{rank} {shortAddr(entry.wallet)}{isMe ? ' ←' : ''}</span>
              <span style={{ fontSize: '10px', color: entry.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)' }}>{entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent.toFixed(1)}%</span>
            </div>
          )
        })}
        {leaderboard.length === 0 && <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>No traders yet</div>}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(0,255,65,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.1em' }}>Prices: GeckoTerminal · Base Mainnet · No real money</span>
        <Link href="/synth" style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', textDecoration: 'none' }}>◉ synth →</Link>
      </div>
    </main>
  )
}
