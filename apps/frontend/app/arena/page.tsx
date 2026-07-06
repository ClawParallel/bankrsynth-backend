'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWriteContract, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  parseUnits, formatUnits, encodeFunctionData, maxUint256, type Address,
} from 'viem'
import Link from 'next/link'
import {
  BASE_CHAIN_ID, WETH, USDC, SWAP_ROUTER_02, SWAP_ROUTER_02_ABI, ERC20_ABI, ADDRESS_THIS,
  type PayWith, type Side, type RoutePlan,
} from '@/lib/uniswap'

const SLIPPAGE_BPS = 200n // 2%

interface Token {
  id: string
  symbol: string
  name: string
  address: string | null
  priceUsd: number
  change24h: number
  volume24h: number
  liquidity: number
}

interface Holding { symbol: string; address: string; balance: number; priceUsd: number; valueUsd: number }
interface SwapRecord { hash: string; summary: string; ts: number }
interface LeaderEntry { wallet: string; displayName: string; currentValue: number; pnlPercent: number; rank: number }

function fmtUsd(n: number): string {
  if (!n || !isFinite(n)) return '$0'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  if (n >= 1) return '$' + n.toFixed(2)
  return '$' + n.toPrecision(4)
}
function fmtTok(n: number): string {
  if (!isFinite(n)) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}
function shortAddr(a: string): string { return `${a.slice(0, 6)}...${a.slice(-4)}` }
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
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
function ts(ms: number): string {
  const d = Date.now() - ms
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  return `${Math.floor(d / 3600000)}h ago`
}

export default function ArenaPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { openConnectModal } = useConnectModal()
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { data: ethBal } = useBalance({ address, chainId: BASE_CHAIN_ID })

  const onBase = chainId === BASE_CHAIN_ID

  // Portfolio
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [usdcBal, setUsdcBal] = useState(0)
  const [ethPrice, setEthPrice] = useState(0)
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  // Trade
  const [tokens, setTokens] = useState<Token[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [remoteResults, setRemoteResults] = useState<Token[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Token | null>(null)
  const [selectedDecimals, setSelectedDecimals] = useState(18)
  const [side, setSide] = useState<Side>('buy')
  const [payWith, setPayWith] = useState<PayWith>('ETH')
  const [amount, setAmount] = useState('')

  const [plan, setPlan] = useState<RoutePlan | null>(null)
  const [quoteOut, setQuoteOut] = useState(0)
  const [quoting, setQuoting] = useState(false)
  const [quoteErr, setQuoteErr] = useState('')

  const [status, setStatus] = useState<'idle' | 'approving' | 'swapping' | 'confirming' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [swaps, setSwaps] = useState<SwapRecord[]>([])

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [lbPeriod, setLbPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [countdown, setCountdown] = useState('')

  const searchRef = useRef<HTMLDivElement>(null)
  const quoteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Token universe for search
  useEffect(() => {
    Promise.all([
      fetch('/api/tokens?bucket=trending').then(r => r.json()),
      fetch('/api/tokens?bucket=high_volume').then(r => r.json()),
    ]).then(([a, b]: [{ tokens?: Token[] }, { tokens?: Token[] }]) => {
      const merged = [...(a.tokens ?? []), ...(b.tokens ?? [])].filter(t => t.address)
      const seen = new Set<string>()
      const uniq = merged.filter(t => { const k = t.address!.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      setTokens(uniq)
    }).catch(() => {})
  }, [])

  // Recent swaps from localStorage
  useEffect(() => {
    try { const s = localStorage.getItem('arena_swaps'); if (s) setSwaps(JSON.parse(s) as SwapRecord[]) } catch {}
  }, [])
  function recordSwap(rec: SwapRecord) {
    setSwaps(prev => {
      const next = [rec, ...prev].slice(0, 15)
      try { localStorage.setItem('arena_swaps', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Portfolio fetch — real wallet holdings + live USD prices
  const loadPortfolio = useCallback(async () => {
    if (!address || !publicClient) return
    setPortfolioLoading(true)
    try {
      // ETH price (WETH) + USDC balance
      const [ethPx, usdcRaw] = await Promise.all([
        fetch(`https://api.geckoterminal.com/api/v2/simple/networks/base/token_price/${WETH}`, { headers: { Accept: 'application/json;version=20230302' } })
          .then(r => r.json()).then((d: { data?: { attributes?: { token_prices?: Record<string, string> } } }) => parseFloat(d.data?.attributes?.token_prices?.[WETH.toLowerCase()] ?? '0')).catch(() => 0),
        publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }).catch(() => 0n),
      ])
      setEthPrice(ethPx)
      setUsdcBal(Number(formatUnits(usdcRaw as bigint, 6)))

      // ERC-20 holdings via Blockscout
      const r = await fetch(`https://base.blockscout.com/api/v2/addresses/${address}/token-balances`)
      const raw = (await r.json()) as Array<{ token?: { address?: string; symbol?: string; decimals?: string }; value?: string }>
      const erc20 = (Array.isArray(raw) ? raw : [])
        .filter(t => t.token?.address && t.value && t.value !== '0' && t.token.symbol)
        .map(t => ({
          address: t.token!.address!.toLowerCase(),
          symbol: t.token!.symbol!,
          balance: Number(t.value) / Math.pow(10, parseInt(t.token!.decimals ?? '18')),
        }))
        .filter(t => t.address !== USDC.toLowerCase())
        .slice(0, 25)

      // Batch live prices
      const priceMap = new Map<string, number>()
      for (let i = 0; i < erc20.length; i += 30) {
        const batch = erc20.slice(i, i + 30).map(t => t.address).join(',')
        if (!batch) continue
        try {
          const pr = await fetch(`https://api.geckoterminal.com/api/v2/simple/networks/base/token_price/${batch}`, { headers: { Accept: 'application/json;version=20230302' } })
          const pd = (await pr.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } }
          for (const [a, p] of Object.entries(pd.data?.attributes?.token_prices ?? {})) priceMap.set(a.toLowerCase(), parseFloat(p))
        } catch {}
      }

      const hs: Holding[] = erc20.map(t => {
        const px = priceMap.get(t.address) ?? 0
        return { symbol: t.symbol, address: t.address, balance: t.balance, priceUsd: px, valueUsd: t.balance * px }
      }).filter(h => h.valueUsd >= 0.01).sort((a, b) => b.valueUsd - a.valueUsd)

      setHoldings(hs)
    } catch {
      // leave previous state
    }
    setPortfolioLoading(false)
  }, [address, publicClient])

  useEffect(() => { if (isConnected && onBase) loadPortfolio() }, [isConnected, onBase, loadPortfolio])

  // Read decimals when token selected
  useEffect(() => {
    if (!selected?.address || !publicClient) return
    publicClient.readContract({ address: selected.address as Address, abi: ERC20_ABI, functionName: 'decimals' })
      .then(d => setSelectedDecimals(Number(d)))
      .catch(() => setSelectedDecimals(18))
  }, [selected, publicClient])

  // Leaderboard fetch
  const loadLeaderboard = useCallback(async () => {
    try {
      const r = await fetch(`/api/arena?period=${lbPeriod}`)
      const d = (await r.json()) as { leaderboard?: LeaderEntry[] }
      setLeaderboard(d.leaderboard ?? [])
    } catch {}
  }, [lbPeriod])

  useEffect(() => {
    loadLeaderboard()
    const i = setInterval(loadLeaderboard, 30000)
    return () => clearInterval(i)
  }, [loadLeaderboard])

  // Countdown to next reset
  useEffect(() => {
    setCountdown(getCountdown(lbPeriod))
    const i = setInterval(() => setCountdown(getCountdown(lbPeriod)), 1000)
    return () => clearInterval(i)
  }, [lbPeriod])

  // Register real portfolio value to the leaderboard (debounced)
  useEffect(() => {
    if (!isConnected || !onBase || !address) return
    const ethAmt = ethBal ? Number(formatUnits(ethBal.value, ethBal.decimals)) : 0
    const total = ethAmt * ethPrice + usdcBal + holdings.reduce((s, h) => s + h.valueUsd, 0)
    if (total <= 0) return
    const id = setTimeout(() => {
      fetch('/api/arena', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', wallet: address, value: total }),
      }).then(() => loadLeaderboard()).catch(() => {})
    }, 1200)
    return () => clearTimeout(id)
  }, [isConnected, onBase, address, ethBal, ethPrice, usdcBal, holdings, loadLeaderboard])

  // Derive tokenIn/tokenOut/decimals for the trade
  function tradeRoute() {
    if (!selected?.address) return null
    const tok = selected.address as Address
    if (side === 'buy') {
      const tokenIn = payWith === 'ETH' ? WETH : USDC
      const inDecimals = payWith === 'ETH' ? 18 : 6
      return { tokenIn, tokenOut: tok, inDecimals, outDecimals: selectedDecimals, isNativeIn: payWith === 'ETH', isNativeOut: false }
    } else {
      const tokenOut = payWith === 'ETH' ? WETH : USDC
      const outDecimals = payWith === 'ETH' ? 18 : 6
      return { tokenIn: tok, tokenOut, inDecimals: selectedDecimals, outDecimals, isNativeIn: false, isNativeOut: payWith === 'ETH' }
    }
  }

  // Auto-quote (debounced)
  useEffect(() => {
    setPlan(null); setQuoteOut(0); setQuoteErr('')
    const route = tradeRoute()
    const amt = parseFloat(amount)
    if (!route || !amount || isNaN(amt) || amt <= 0) return

    if (quoteDebounce.current) clearTimeout(quoteDebounce.current)
    quoteDebounce.current = setTimeout(async () => {
      setQuoting(true); setQuoteErr('')
      try {
        const amountInWei = parseUnits(amount, route.inDecimals).toString()
        const r = await fetch('/api/arena/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIn: route.tokenIn, tokenOut: route.tokenOut, amountIn: amountInWei }),
        })
        const d = (await r.json()) as { ok?: boolean; plan?: RoutePlan; error?: string }
        if (!r.ok || !d.plan) { setQuoteErr(d.error ?? 'no route'); setQuoting(false); return }
        setPlan(d.plan)
        setQuoteOut(Number(formatUnits(BigInt(d.plan.amountOut), route.outDecimals)))
      } catch {
        setQuoteErr('quote failed')
      }
      setQuoting(false)
    }, 450)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, selected, side, payWith, selectedDecimals])

  async function execute() {
    const route = tradeRoute()
    if (!route || !plan || !selected?.address || !address || !publicClient) return
    if (!onBase) { switchChain({ chainId: BASE_CHAIN_ID }); return }

    const amountInWei = parseUnits(amount, route.inDecimals)
    const amountOutMin = (BigInt(plan.amountOut) * (10000n - SLIPPAGE_BPS)) / 10000n

    try {
      // 1. Approval for ERC-20 inputs
      if (!route.isNativeIn) {
        setStatus('approving'); setStatusMsg(`Checking ${side === 'sell' ? selected.symbol : payWith} allowance...`)
        const allowance = await publicClient.readContract({
          address: route.tokenIn, abi: ERC20_ABI, functionName: 'allowance', args: [address, SWAP_ROUTER_02],
        }) as bigint
        if (allowance < amountInWei) {
          setStatusMsg(`Approve ${side === 'sell' ? selected.symbol : payWith} in your wallet...`)
          const approveHash = await writeContractAsync({
            address: route.tokenIn, abi: ERC20_ABI, functionName: 'approve', args: [SWAP_ROUTER_02, maxUint256],
          })
          setStatusMsg('Confirming approval...')
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      // 2. Build + send swap
      setStatus('swapping'); setStatusMsg('Confirm the swap in your wallet...')
      let hash: `0x${string}`

      if (route.isNativeOut) {
        // token -> WETH (single) then unwrap to native ETH, via multicall
        const fee = plan.fee ?? 3000
        const swapData = encodeFunctionData({
          abi: SWAP_ROUTER_02_ABI, functionName: 'exactInputSingle',
          args: [{ tokenIn: route.tokenIn, tokenOut: WETH, fee, recipient: ADDRESS_THIS, amountIn: amountInWei, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        })
        const unwrapData = encodeFunctionData({
          abi: SWAP_ROUTER_02_ABI, functionName: 'unwrapWETH9', args: [amountOutMin, address],
        })
        hash = await writeContractAsync({
          address: SWAP_ROUTER_02, abi: SWAP_ROUTER_02_ABI, functionName: 'multicall', args: [[swapData, unwrapData]],
        })
      } else if (plan.kind === 'multi' && plan.path) {
        hash = await writeContractAsync({
          address: SWAP_ROUTER_02, abi: SWAP_ROUTER_02_ABI, functionName: 'exactInput',
          args: [{ path: plan.path, recipient: address, amountIn: amountInWei, amountOutMinimum: amountOutMin }],
          value: route.isNativeIn ? amountInWei : 0n,
        })
      } else {
        const fee = plan.fee ?? 3000
        hash = await writeContractAsync({
          address: SWAP_ROUTER_02, abi: SWAP_ROUTER_02_ABI, functionName: 'exactInputSingle',
          args: [{ tokenIn: route.tokenIn, tokenOut: route.tokenOut, fee, recipient: address, amountIn: amountInWei, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
          value: route.isNativeIn ? amountInWei : 0n,
        })
      }

      setStatus('confirming'); setStatusMsg('Swap submitted — waiting for confirmation...')
      await publicClient.waitForTransactionReceipt({ hash })

      const verb = side === 'buy' ? 'Bought' : 'Sold'
      const summary = side === 'buy'
        ? `${verb} ${fmtTok(quoteOut)} ${selected.symbol} for ${amount} ${payWith}`
        : `${verb} ${amount} ${selected.symbol} for ${fmtTok(quoteOut)} ${payWith}`
      setStatus('success'); setStatusMsg(`✓ ${summary}`)
      recordSwap({ hash, summary, ts: Date.now() })
      setAmount(''); setPlan(null); setQuoteOut(0)
      loadPortfolio()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'transaction failed'
      setStatus('error')
      setStatusMsg(msg.includes('User rejected') || msg.includes('denied') ? 'Transaction rejected in wallet' : msg.slice(0, 140))
    }
  }

  // dropdown close
  useEffect(() => {
    function h(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  // Live token search (DexScreener + GeckoTerminal) — finds ANY Base token, incl. pasted addresses
  useEffect(() => {
    const q = search.trim()
    setRemoteResults([])
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (q.length < 2 || (selected && q === selected.symbol)) { setSearching(false); return }
    setSearching(true)
    searchDebounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/arena/search?q=${encodeURIComponent(q)}`)
        const d = (await r.json()) as { tokens?: Token[] }
        setRemoteResults(d.tokens ?? [])
      } catch {
        setRemoteResults([])
      }
      setSearching(false)
    }, 350)
  }, [search, selected])

  const localMatches = search.trim()
    ? tokens.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
    : []

  // Merge local + remote, dedup by address, local first
  const searchResults: Token[] = (() => {
    if (!search.trim()) return []
    const seen = new Set<string>()
    const merged: Token[] = []
    for (const t of [...localMatches, ...remoteResults]) {
      const key = (t.address ?? t.id).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(t)
    }
    return merged.slice(0, 12)
  })()

  const ethAmount = ethBal ? Number(formatUnits(ethBal.value, ethBal.decimals)) : 0
  const ethValue = ethAmount * ethPrice
  const holdingsValue = holdings.reduce((s, h) => s + h.valueUsd, 0)
  const totalValue = ethValue + usdcBal + holdingsValue

  const busy = status === 'approving' || status === 'swapping' || status === 'confirming'
  const minReceived = quoteOut * (1 - Number(SLIPPAGE_BPS) / 10000)

  const PANEL: React.CSSProperties = { background: 'rgba(0,10,3,0.85)', border: '1px solid rgba(0,255,65,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const TITLE: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.5)', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '1px solid rgba(0,255,65,0.1)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }

  return (
    <main style={{ minHeight: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>SYNTHVIRTUAL://</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,2vw,18px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)' }}>
          ⚔ ARENA — LIVE DEX TRADING
        </h1>
        <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em', marginTop: '2px' }}>
          REAL SWAPS · UNISWAP V3 · BASE MAINNET · SIGNED IN YOUR WALLET
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, gap: '1px', background: 'rgba(0,255,65,0.08)' }}>

        {/* LEFT: Real Portfolio */}
        <div style={{ ...PANEL, width: '340px', minWidth: '280px', flexShrink: 0 }} className="hide-mobile">
          <div style={TITLE}><span style={{ color: 'var(--green)' }}>▶</span> WALLET PORTFOLIO
            <button onClick={loadPortfolio} disabled={!isConnected || portfolioLoading} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.5)', cursor: 'pointer', fontSize: '9px', padding: '2px 7px' }}>{portfolioLoading ? '...' : '↺'}</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {!isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '28px 0' }}>
                <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.5)', textAlign: 'center', lineHeight: 1.6 }}>Connect your wallet<br />to trade on Base</div>
                <button onClick={() => openConnectModal?.()} className="neon-btn" style={{ fontSize: '10px', padding: '8px 20px', width: 'auto' }}>◈ CONNECT WALLET</button>
              </div>
            ) : !onBase ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '28px 0' }}>
                <div style={{ fontSize: '11px', color: 'var(--gold)', textAlign: 'center' }}>Wrong network</div>
                <button onClick={() => switchChain({ chainId: BASE_CHAIN_ID })} className="neon-btn" style={{ fontSize: '10px', padding: '8px 20px', width: 'auto' }}>⇄ SWITCH TO BASE</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ border: '1px solid rgba(0,255,65,0.15)', background: 'rgba(0,255,65,0.03)', padding: '10px' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', marginBottom: '4px' }}>TOTAL VALUE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--green)', textShadow: '0 0 12px rgba(0,255,65,0.4)' }}>{fmtUsd(totalValue)}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', marginTop: '2px' }}>{shortAddr(address!)}</div>
                </div>

                <div className="metric-row"><span className="metric-label">ETH</span><span className="metric-val">{ethAmount.toFixed(4)} <span style={{ color: 'rgba(0,255,65,0.4)', fontSize: '9px' }}>{fmtUsd(ethValue)}</span></span></div>
                <div className="metric-row"><span className="metric-label">USDC</span><span className="metric-val">{usdcBal.toFixed(2)} <span style={{ color: 'rgba(0,255,65,0.4)', fontSize: '9px' }}>{fmtUsd(usdcBal)}</span></span></div>

                {holdings.length > 0 && (
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', margin: '6px 0' }}>TOKENS</div>
                    {holdings.map(h => (
                      <div key={h.address} style={{ borderBottom: '1px solid rgba(0,255,65,0.06)', padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{h.symbol}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>{fmtTok(h.balance)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.7)' }}>{fmtUsd(h.valueUsd)}</div>
                          <button onClick={() => { const t = tokens.find(t => t.address?.toLowerCase() === h.address) ?? { id: h.address, symbol: h.symbol, name: h.symbol, address: h.address, priceUsd: h.priceUsd, change24h: 0, volume24h: 0, liquidity: 0 }; setSelected(t); setSide('sell'); setSearch(h.symbol) }} style={{ background: 'rgba(255,26,60,0.08)', border: '1px solid rgba(255,26,60,0.3)', color: 'var(--red)', fontSize: '8px', padding: '2px 6px', cursor: 'pointer', marginTop: '2px' }}>SELL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {holdings.length === 0 && !portfolioLoading && (
                  <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)', paddingTop: '6px' }}>No token holdings detected. Buy a token to get started.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Real Swap */}
        <div style={{ ...PANEL, flex: 1, minWidth: 0 }}>
          <div style={TITLE}><span style={{ color: 'var(--green)' }}>▶</span> SWAP{selected && <span style={{ color: 'rgba(0,255,65,0.5)' }}>— {selected.symbol}</span>}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Token search */}
            <div ref={searchRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '4px' }}>TOKEN</label>
              <input value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} placeholder="Search symbol or paste contract address (0x...)" className="terminal-input" autoComplete="off" />
              {showDropdown && search.trim().length >= 2 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(0,8,2,0.98)', border: '1px solid rgba(0,255,65,0.3)', zIndex: 10, maxHeight: '300px', overflowY: 'auto' }}>
                  {searchResults.map(t => (
                    <button key={t.id} onClick={() => { setSelected(t); setSearch(t.symbol); setShowDropdown(false); setRemoteResults([]); setStatus('idle'); setStatusMsg('') }} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,255,65,0.05)', padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{t.symbol}</div><div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div></div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.8)' }}>{fmtUsd(t.priceUsd)}</div><div style={{ fontSize: '9px', color: t.change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>{t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%</div></div>
                    </button>
                  ))}
                  {searching && searchResults.length === 0 && (
                    <div style={{ padding: '10px', fontSize: '10px', color: 'rgba(0,255,65,0.4)' }}>searching DexScreener + GeckoTerminal<span style={{ animation: 'blink 0.7s step-end infinite' }}>...</span></div>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <div style={{ padding: '10px', fontSize: '10px', color: 'rgba(0,255,65,0.35)' }}>No Base token found for &quot;{search.trim()}&quot;</div>
                  )}
                </div>
              )}
            </div>

            {selected && (
              <div style={{ border: '1px solid rgba(0,255,65,0.2)', background: 'rgba(0,255,65,0.03)', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--green)', fontWeight: 700 }}>${selected.symbol}</div><div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)' }}>{shortAddr(selected.address!)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '13px', color: 'rgba(0,255,65,0.9)' }}>{fmtUsd(selected.priceUsd)}</div><div style={{ fontSize: '10px', color: selected.change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>{selected.change24h >= 0 ? '+' : ''}{selected.change24h.toFixed(2)}% 24h</div></div>
              </div>
            )}

            {selected && (
              <>
                {/* BUY/SELL */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['buy', 'sell'] as const).map(s => (
                    <button key={s} onClick={() => { setSide(s); setAmount('') }} style={{ flex: 1, padding: '8px', fontSize: '11px', letterSpacing: '0.2em', fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer', border: `1px solid ${side === s ? (s === 'buy' ? 'rgba(0,255,65,0.6)' : 'rgba(255,26,60,0.6)') : 'rgba(0,255,65,0.15)'}`, background: side === s ? (s === 'buy' ? 'rgba(0,255,65,0.1)' : 'rgba(255,26,60,0.1)') : 'transparent', color: side === s ? (s === 'buy' ? 'var(--green)' : 'var(--red)') : 'rgba(0,255,65,0.4)' }}>{s.toUpperCase()}</button>
                  ))}
                </div>

                {/* Pay-with */}
                <div>
                  <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '4px' }}>{side === 'buy' ? 'PAY WITH' : 'RECEIVE'}</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['ETH', 'USDC'] as const).map(p => (
                      <button key={p} onClick={() => { setPayWith(p); setAmount('') }} style={{ flex: 1, padding: '7px', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer', border: `1px solid ${payWith === p ? 'rgba(0,255,65,0.5)' : 'rgba(0,255,65,0.15)'}`, background: payWith === p ? 'rgba(0,255,65,0.08)' : 'transparent', color: payWith === p ? 'var(--green)' : 'rgba(0,255,65,0.4)', fontFamily: 'var(--font-mono)' }}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)', marginBottom: '4px' }}>
                    {side === 'buy' ? `${payWith} TO SPEND` : `${selected.symbol} TO SELL`}
                  </label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" min="0" step="any" className="terminal-input" />
                  {quoting && <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)', marginTop: '4px' }}>fetching quote<span style={{ animation: 'blink 0.7s step-end infinite' }}>...</span></div>}
                  {quoteErr && <div style={{ fontSize: '10px', color: '#ff4466', marginTop: '4px' }}>✗ {quoteErr}</div>}
                  {plan && quoteOut > 0 && !quoting && (
                    <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.55)', marginTop: '6px', lineHeight: 1.7 }}>
                      <div>≈ <span style={{ color: 'var(--green)' }}>{fmtTok(quoteOut)} {side === 'buy' ? selected.symbol : payWith}</span> expected</div>
                      <div style={{ color: 'rgba(0,255,65,0.4)' }}>min received: {fmtTok(minReceived)} (2% slippage)</div>
                      <div style={{ color: 'rgba(0,255,65,0.3)', fontSize: '9px' }}>route: Uniswap V3 {plan.kind === 'multi' ? `multi-hop via WETH (${plan.feeIn! / 10000}%·${plan.feeOut! / 10000}%)` : `${plan.fee! / 10000}% pool`}</div>
                    </div>
                  )}
                </div>

                {/* Execute */}
                {!isConnected ? (
                  <button onClick={() => openConnectModal?.()} className="neon-btn" style={{ fontSize: '10px' }}>◈ CONNECT WALLET</button>
                ) : !onBase ? (
                  <button onClick={() => switchChain({ chainId: BASE_CHAIN_ID })} className="neon-btn" style={{ fontSize: '10px' }}>⇄ SWITCH TO BASE</button>
                ) : (
                  <button onClick={execute} disabled={busy || !plan || quoteOut <= 0} className={`neon-btn${side === 'sell' ? ' red-btn' : ''}`} style={{ fontSize: '11px' }}>
                    {status === 'approving' ? '⟳ APPROVING...' : status === 'swapping' ? '⟳ CONFIRM IN WALLET...' : status === 'confirming' ? '⟳ CONFIRMING...' : plan && quoteOut > 0 ? `${side === 'buy' ? '▲ BUY' : '▼ SELL'} ${selected.symbol}` : 'ENTER AMOUNT'}
                  </button>
                )}

                {statusMsg && status !== 'idle' && (
                  <div style={{ padding: '8px 12px', border: `1px solid ${status === 'success' ? 'rgba(0,255,65,0.3)' : status === 'error' ? 'rgba(255,26,60,0.3)' : 'rgba(0,255,65,0.15)'}`, background: status === 'success' ? 'rgba(0,255,65,0.05)' : status === 'error' ? 'rgba(255,26,60,0.05)' : 'rgba(0,255,65,0.02)', fontSize: '11px', color: status === 'error' ? 'var(--red)' : status === 'success' ? 'var(--green)' : 'rgba(0,255,65,0.6)' }}>
                    {statusMsg}
                  </div>
                )}
              </>
            )}

            {!selected && <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.3)', paddingTop: '8px' }}>Search a Base token above to start trading.</div>}

            {/* Recent swaps */}
            {swaps.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', marginBottom: '6px' }}>RECENT SWAPS</div>
                <div style={{ border: '1px solid rgba(0,255,65,0.1)' }}>
                  {swaps.slice(0, 8).map(s => (
                    <div key={s.hash} style={{ padding: '6px 8px', borderBottom: '1px solid rgba(0,255,65,0.05)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.75)', lineHeight: 1.5 }}>{s.summary}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)' }}>{ts(s.ts)}</span>
                        <a href={`https://basescan.org/tx/${s.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '9px', color: 'rgba(0,200,255,0.6)', textDecoration: 'none' }}>basescan ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Leaderboard */}
        <div style={{ ...PANEL, width: '340px', minWidth: '280px', flexShrink: 0 }} className="hide-mobile">
          <div style={TITLE}><span style={{ color: 'var(--green)' }}>▶</span> LEADERBOARD</div>

          {/* Period tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0 }}>
            {(['weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setLbPeriod(p)} style={{ flex: 1, padding: '7px', fontSize: '9px', letterSpacing: '0.2em', fontFamily: 'var(--font-display)', cursor: 'pointer', border: 'none', borderBottom: `2px solid ${lbPeriod === p ? 'var(--green)' : 'transparent'}`, background: lbPeriod === p ? 'rgba(0,255,65,0.05)' : 'transparent', color: lbPeriod === p ? 'var(--green)' : 'rgba(0,255,65,0.4)' }}>
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

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leaderboard.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>No traders yet — connect and trade to join.</div>
            )}
            {leaderboard.map((e, i) => {
              const rank = i + 1
              const isMe = e.wallet.toLowerCase() === address?.toLowerCase()
              const crown = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
              return (
                <div key={e.wallet} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px', gap: '4px', padding: '6px 10px', borderBottom: '1px solid rgba(0,255,65,0.05)', background: isMe ? 'rgba(0,255,65,0.06)' : 'transparent', borderLeft: isMe ? '2px solid var(--green)' : '2px solid transparent' }}>
                  <div style={{ fontSize: '11px', color: rank <= 3 ? 'var(--gold)' : 'rgba(0,255,65,0.5)' }}>{crown ?? `${rank}`}</div>
                  <div style={{ fontSize: '10px', color: isMe ? 'var(--green)' : 'rgba(0,255,65,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{e.displayName}{isMe && ' ← you'}</div>
                  <div style={{ fontSize: '10px', color: e.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)', textAlign: 'right' }}>{e.pnlPercent >= 0 ? '+' : ''}{e.pnlPercent.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.7)', textAlign: 'right' }}>{fmtUsd(e.currentValue)}</div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,255,65,0.08)', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', lineHeight: 1.7 }}>
              <div>◆ Ranked by real Base portfolio P&amp;L</div>
              <div>◆ Top 10 weekly → Verified Analyst badge</div>
              <div>◆ Top 3 monthly → Hall of Fame status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile portfolio summary */}
      <div className="sm:hidden" style={{ borderTop: '1px solid rgba(0,255,65,0.1)', padding: '12px' }}>
        {!isConnected ? (
          <button onClick={() => openConnectModal?.()} className="neon-btn" style={{ fontSize: '10px' }}>◈ CONNECT WALLET</button>
        ) : !onBase ? (
          <button onClick={() => switchChain({ chainId: BASE_CHAIN_ID })} className="neon-btn" style={{ fontSize: '10px' }}>⇄ SWITCH TO BASE</button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '8px 10px', border: '1px solid rgba(0,255,65,0.15)', background: 'rgba(0,255,65,0.03)' }}>
            <span style={{ color: 'rgba(0,255,65,0.5)' }}>Portfolio</span>
            <span style={{ color: 'var(--green)' }}>{fmtUsd(totalValue)}</span>
          </div>
        )}

        {/* Mobile leaderboard */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {(['weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setLbPeriod(p)} style={{ flex: 1, padding: '5px', fontSize: '9px', letterSpacing: '0.15em', cursor: 'pointer', border: `1px solid ${lbPeriod === p ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.1)'}`, background: lbPeriod === p ? 'rgba(0,255,65,0.08)' : 'transparent', color: lbPeriod === p ? 'var(--green)' : 'rgba(0,255,65,0.4)', fontFamily: 'var(--font-display)' }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.3)', marginBottom: '6px' }}>{countdown} remaining</div>
          {leaderboard.slice(0, 8).map((e, i) => {
            const rank = i + 1
            const isMe = e.wallet.toLowerCase() === address?.toLowerCase()
            const crown = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
            return (
              <div key={e.wallet} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,255,65,0.05)', background: isMe ? 'rgba(0,255,65,0.04)' : 'transparent' }}>
                <span style={{ fontSize: '10px', color: isMe ? 'var(--green)' : 'rgba(0,255,65,0.6)' }}>{crown ?? `#${rank}`} {e.displayName}{isMe ? ' ←' : ''}</span>
                <span style={{ fontSize: '10px', color: e.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)' }}>{e.pnlPercent >= 0 ? '+' : ''}{e.pnlPercent.toFixed(1)}%</span>
              </div>
            )
          })}
          {leaderboard.length === 0 && <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.3)' }}>No traders yet</div>}
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(0,255,65,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.1em' }}>Uniswap V3 · Base · prices via GeckoTerminal</span>
        <Link href="/synth" style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', textDecoration: 'none' }}>◉ synth →</Link>
      </div>
    </main>
  )
}
