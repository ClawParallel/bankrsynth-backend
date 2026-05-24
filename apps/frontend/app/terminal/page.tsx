'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import BYOKModal from '@/components/BYOKModal'
import { loadBYOK } from '@/lib/byok'

interface Line {
  id: number
  text: string
  color?: string
}

type Token = {
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
}

let lineId = 0
function mkLine(text: string, color?: string): Line {
  return { id: lineId++, text, color }
}

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

const BOOT_LINES = [
  '> initializing BankrSynth v2.0.0',
  '> booting synthesis core..............ok',
  '> connecting to base mainnet...........ok',
  '> loading token universe...............ok',
  '> aeon skills layer....................ok',
  '> miroshark swarm engine...............ok',
  '> gitlawb connection...................ok',
  '>',
  '> BANKRSYNTH ONLINE ●',
  '> intelligence synthesis layer active',
  '>',
]

const SWARM_AGENTS = [
  { id: 1, name: 'Scan Agent',      status: 'ACTIVE',  role: 'trending_base monitoring · GeckoTerminal' },
  { id: 2, name: 'Narrative Agent', status: 'ACTIVE',  role: 'narrative_scan · meta detection · Aeon' },
  { id: 3, name: 'Thesis Agent',    status: 'ACTIVE',  role: 'alpha_generation · long/short picks' },
  { id: 4, name: 'Sentiment Agent', status: 'ACTIVE',  role: 'LunarCrush v4 · Galaxy Score · social feed' },
  { id: 5, name: 'Swap Agent',      status: 'STANDBY', role: 'awaiting signal · handoff to BankrBot' },
  { id: 6, name: 'Monitor Agent',   status: 'ACTIVE',  role: 'on_chain_watch · whale detection · Base' },
  { id: 7, name: 'Analysis Agent',  status: 'ACTIVE',  role: 'vol/mcap ratio · liquidity depth · on-chain' },
  { id: 8, name: 'Social Agent',    status: 'ACTIVE',  role: 'X/Twitter · Reddit · Polymarket signals' },
  { id: 9, name: 'Repos Agent',     status: 'ACTIVE',  role: 'gitlawb health · push notifications' },
  { id: 10, name: 'Intel Agent',    status: 'ACTIVE',  role: 'macro: BTC dominance · fear/greed · regime' },
  { id: 11, name: 'Alert Agent',    status: 'ACTIVE',  role: 'threshold alerts · cross-chain signals' },
  { id: 12, name: 'Swarm Agent',    status: 'ACTIVE',  role: 'orchestration · inter-agent coordination' },
]

const HELP_TEXT = [
  '  status        show uptime + Base network status',
  '  trending      Base trending pools',
  '  new           new token launches',
  '  price [sym]   token price lookup',
  '  intel         macro market data',
  '  repos         gitlawb repository status',
  '  swarm         12-agent roster',
  '  thesis [SYM]  alpha thesis (requires API key)',
  '  narrative [SYM] narrative read (requires API key)',
  '  analyze [SYM] fundamental analysis (requires API key)',
  '  watch [SYM] --alert [%] poll price every 30s',
  '  portfolio [ADDR] on-chain portfolio',
  '  help          show this list',
  '  clear         clear terminal',
]

export default function TerminalPage() {
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [showBYOK, setShowBYOK] = useState(false)
  const [booted, setBooted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const push = useCallback((...newLines: Line[]) => {
    setLines((prev) => [...prev, ...newLines])
  }, [])

  const scroll = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
  }, [])

  // Boot sequence
  useEffect(() => {
    let cancelled = false
    async function boot() {
      for (const line of BOOT_LINES) {
        if (cancelled) return
        await new Promise((r) => setTimeout(r, 55 + Math.random() * 50))
        setLines((prev) => [...prev, mkLine(line, line.includes('ONLINE') ? 'var(--green)' : undefined)])
      }
      setBooted(true)
    }
    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (booted) {
      runCommand('status')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted])

  useEffect(() => { scroll() }, [lines, scroll])

  async function runCommand(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    if (cmd !== 'clear') {
      push(mkLine(`> ${trimmed}`, 'rgba(0,255,65,0.5)'))
    }

    switch (cmd) {
      case 'clear':
        setLines([])
        break

      case 'help':
        push(mkLine(''), mkLine('AVAILABLE COMMANDS:'), ...HELP_TEXT.map((l) => mkLine(l, 'rgba(0,255,65,0.6)')), mkLine(''))
        break

      case 'status': {
        push(mkLine('  fetching status...', 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch('https://mainnet.base.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
          })
          const d = (await r.json()) as { result?: string }
          const block = d.result ? parseInt(d.result, 16) : null
          push(
            mkLine(''),
            mkLine('  BANKRSYNTH v2.0.0', 'var(--green)'),
            mkLine(`  BASE MAINNET: ONLINE`, 'var(--green)'),
            block ? mkLine(`  BLOCK: #${block.toLocaleString()}`, 'var(--cyan)') : mkLine('  BLOCK: unavailable'),
            mkLine(`  UPTIME: ${new Date().toUTCString()}`, 'rgba(0,255,65,0.5)'),
            mkLine('  SYNTHESIS ENGINE: ACTIVE', 'var(--green)'),
            mkLine(''),
          )
        } catch {
          push(mkLine('  Base RPC unreachable — check network', '#ff4466'))
        }
        break
      }

      case 'trending':
      case 'new': {
        const bucket = cmd === 'new' ? 'new_launches' : 'trending'
        push(mkLine(`  loading ${cmd === 'new' ? 'new launches' : 'trending pools'}...`, 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch(`/api/tokens?bucket=${bucket}`)
          const d = (await r.json()) as { tokens?: Token[]; error?: string }
          if (!r.ok || d.error) { push(mkLine(`  error: ${d.error ?? 'failed'}`, '#ff4466')); break }
          const tokens = d.tokens ?? []
          if (!tokens.length) { push(mkLine('  no tokens found', 'rgba(0,255,65,0.4)')); break }
          push(
            mkLine(''),
            mkLine(`  ${'SYMBOL'.padEnd(10)} ${'PRICE'.padEnd(14)} ${'24H'.padEnd(10)} ${'VOLUME'.padEnd(14)} MCAP`, 'rgba(0,255,65,0.4)'),
            mkLine('  ' + '─'.repeat(64), 'rgba(0,255,65,0.15)'),
          )
          tokens.slice(0, 20).forEach((t) => {
            const chg = fmtC(t.change24h)
            const color = t.change24h >= 0 ? 'var(--green)' : 'var(--red)'
            push(mkLine(`  ${t.symbol.padEnd(10)} ${fmtP(t.priceUsd).padEnd(14)} ${chg.padEnd(10)} ${fmtP(t.volume24h).padEnd(14)} ${fmtP(t.marketCap)}`, color))
          })
          push(mkLine(''))
        } catch {
          push(mkLine('  GeckoTerminal unavailable', '#ff4466'))
        }
        break
      }

      case 'intel': {
        push(mkLine('  fetching market data...', 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch('/api/intel')
          const d = (await r.json()) as {
            global?: { totalMcap?: number; vol24h?: number; btcDominance?: number; ethDominance?: number; mcapChange24h?: number; activeCryptos?: number }
            trending?: Array<{ symbol?: string; name?: string; marketCapRank?: number }>
            basePools?: Array<{ symbol?: string; price?: number; change24h?: number; volume24h?: number }>
            error?: string
          }
          if (d.error) { push(mkLine(`  error: ${d.error}`, '#ff4466')); break }
          const g = d.global
          if (g) {
            push(
              mkLine(''),
              mkLine('  GLOBAL MARKET', 'var(--cyan)'),
              mkLine(`  Total MCap:    ${g.totalMcap ? fmtP(g.totalMcap) : 'n/a'}`),
              mkLine(`  24h Volume:    ${g.vol24h ? fmtP(g.vol24h) : 'n/a'}`),
              mkLine(`  BTC Dom:       ${g.btcDominance?.toFixed(1) ?? 'n/a'}%`),
              mkLine(`  ETH Dom:       ${g.ethDominance?.toFixed(1) ?? 'n/a'}%`),
              mkLine(`  MCap 24h chg:  ${g.mcapChange24h ? fmtC(g.mcapChange24h) : 'n/a'}`),
            )
          }
          if (d.trending?.length) {
            push(mkLine(''), mkLine('  COINGECKO TRENDING', 'var(--cyan)'))
            d.trending.slice(0, 8).forEach((t, i) => {
              push(mkLine(`  ${(i + 1).toString().padStart(2)}. ${(t.symbol ?? '?').padEnd(12)} ${t.name ?? ''}`, 'rgba(0,255,65,0.7)'))
            })
          }
          if (d.basePools?.length) {
            push(mkLine(''), mkLine('  BASE TRENDING POOLS', 'var(--cyan)'))
            d.basePools.slice(0, 8).forEach((p) => {
              const chg = p.change24h !== undefined ? fmtC(p.change24h) : ''
              const color = (p.change24h ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'
              push(mkLine(`  ${(p.symbol ?? '?').padEnd(12)} ${fmtP(p.price ?? 0).padEnd(14)} ${chg}`, color))
            })
          }
          push(mkLine(''))
        } catch {
          push(mkLine('  intel API unavailable', '#ff4466'))
        }
        break
      }

      case 'price': {
        const sym = args[0]?.toUpperCase()
        if (!sym) { push(mkLine('  usage: price [SYMBOL]', '#ff4466')); break }
        push(mkLine(`  looking up ${sym}...`, 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch('/api/tokens?bucket=trending')
          const d = (await r.json()) as { tokens?: Token[] }
          const token = d.tokens?.find((t) => t.symbol.toUpperCase() === sym)
          if (token) {
            const color = token.change24h >= 0 ? 'var(--green)' : 'var(--red)'
            push(
              mkLine(''),
              mkLine(`  ${token.symbol} — ${token.name}`, 'var(--cyan)'),
              mkLine(`  Price:     ${fmtP(token.priceUsd)}`, color),
              mkLine(`  24h:       ${fmtC(token.change24h)}`, color),
              mkLine(`  1h:        ${fmtC(token.change1h)}`, color),
              mkLine(`  Volume:    ${fmtP(token.volume24h)}`),
              mkLine(`  MCap:      ${fmtP(token.marketCap)}`),
              mkLine(`  Liquidity: ${fmtP(token.liquidity)}`),
              mkLine(''),
            )
          } else {
            push(mkLine(`  ${sym} not found in trending. Try 'trending' to see available tokens.`, 'rgba(0,255,65,0.4)'))
          }
        } catch {
          push(mkLine('  price lookup failed', '#ff4466'))
        }
        break
      }

      case 'repos': {
        push(mkLine('  connecting to gitlawb...', 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch('/api/repos')
          const d = (await r.json()) as {
            did?: string
            repos?: Array<{ name: string; objects?: number; nodes?: number; storage?: string; signature?: string; url?: string; live?: boolean }>
            nodeStatus?: { online: number; total: number; locations?: string[] }
            source?: string
          }
          push(
            mkLine(''),
            mkLine('  GITLAWB STATUS', 'var(--cyan)'),
            mkLine(`  DID: ${d.did?.slice(0, 40) ?? 'n/a'}...`, 'rgba(0,200,255,0.7)'),
            mkLine(`  Source: ${d.source?.toUpperCase() ?? 'UNKNOWN'}`, d.source === 'live' ? 'var(--green)' : 'var(--gold)'),
          )
          if (d.nodeStatus) {
            push(mkLine(`  Nodes: ${d.nodeStatus.online}/${d.nodeStatus.total} online | ${d.nodeStatus.locations?.join(', ') ?? ''}`, 'var(--green)'))
          }
          if (d.repos?.length) {
            push(mkLine(''), mkLine('  REPOSITORIES:', 'var(--cyan)'))
            d.repos.forEach((repo) => {
              push(
                mkLine(`  ◈ ${repo.name}`, 'var(--green)'),
                mkLine(`    objects: ${repo.objects ?? 'n/a'} · nodes: ${repo.nodes ?? 'n/a'} · ${repo.storage ?? ''} · ${repo.signature ?? ''}`),
                mkLine(`    ${repo.url ?? ''}`, 'rgba(0,200,255,0.5)'),
              )
            })
          }
          push(mkLine(''))
        } catch {
          push(mkLine('  gitlawb unavailable', '#ff4466'))
        }
        break
      }

      case 'swarm': {
        push(mkLine(''), mkLine('  MIROSHARK SWARM — 12 AGENTS', 'var(--cyan)'))
        SWARM_AGENTS.forEach((a) => {
          const color = a.status === 'ACTIVE' ? 'var(--green)' : 'var(--gold)'
          push(mkLine(`  [${a.status}] ${a.name.padEnd(18)} ${a.role}`, color))
        })
        push(mkLine(''))
        break
      }

      case 'thesis':
      case 'narrative':
      case 'analyze': {
        const sym = args[0]?.toUpperCase()
        if (!sym) { push(mkLine(`  usage: ${cmd} [SYMBOL]`, '#ff4466')); break }

        const config = loadBYOK()
        if (!config) {
          push(mkLine('  no API key configured — opening settings...', '#ff4466'))
          setShowBYOK(true)
          break
        }

        push(mkLine(`  finding ${sym}...`, 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch('/api/tokens?bucket=trending')
          const d = (await r.json()) as { tokens?: Token[] }
          let token = d.tokens?.find((t) => t.symbol.toUpperCase() === sym)

          if (!token) {
            const r2 = await fetch('/api/tokens?bucket=high_volume')
            const d2 = (await r2.json()) as { tokens?: Token[] }
            token = d2.tokens?.find((t) => t.symbol.toUpperCase() === sym)
          }

          if (!token) {
            push(mkLine(`  ${sym} not found — try trending or high_volume bucket`, '#ff4466'))
            break
          }

          const modeMap: Record<string, string> = { thesis: 'thesis', narrative: 'narrative', analyze: 'analyze' }
          push(mkLine(`  synthesizing ${modeMap[cmd]} for ${sym} via ${config.provider}/${config.model}...`, 'rgba(0,255,65,0.4)'))

          const sr = await fetch('/api/synth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': config.apiKey,
              'X-Provider': config.provider,
              'X-Model': config.model,
            },
            body: JSON.stringify({
              mode: modeMap[cmd],
              tokenSymbol: token.symbol,
              tokenName: token.name,
              priceUsd: token.priceUsd,
              change24h: token.change24h,
              change1h: token.change1h,
              volume24h: token.volume24h,
              marketCap: token.marketCap,
              liquidity: token.liquidity,
              chain: 'base',
              address: token.address,
            }),
          })

          const sd = (await sr.json()) as { analysis?: string; error?: string }

          if (sr.status === 401) {
            push(mkLine('  invalid API key — opening settings...', '#ff4466'))
            setShowBYOK(true)
            break
          }

          if (!sr.ok || sd.error) {
            push(mkLine(`  synthesis failed: ${sd.error ?? 'unknown error'}`, '#ff4466'))
            break
          }

          push(mkLine(''), mkLine(`  [${cmd.toUpperCase()} — ${sym}]`, 'var(--cyan)'))

          // Typewriter
          const text = sd.analysis ?? ''
          const lines_ = text.split('\n')
          for (const line of lines_) {
            await new Promise<void>((resolve) => {
              const id = lineId++
              let i = 0
              setLines((prev) => [...prev, { id, text: '', color: 'rgba(0,255,65,0.9)' }])
              const t = setInterval(() => {
                i++
                setLines((prev) =>
                  prev.map((l) => (l.id === id ? { ...l, text: `  ${line.slice(0, i)}` } : l)),
                )
                if (i >= line.length) { clearInterval(t); resolve() }
              }, 15)
            })
          }
          push(mkLine(''), mkLine(`  via ${config.provider}/${config.model} · your key`, 'rgba(0,255,65,0.3)'), mkLine(''))
        } catch {
          push(mkLine('  synthesis request failed', '#ff4466'))
        }
        break
      }

      case 'watch': {
        const sym = args[0]?.toUpperCase()
        const alertIdx = args.indexOf('--alert')
        const threshold = alertIdx >= 0 ? parseFloat(args[alertIdx + 1] ?? '5') : 5

        if (!sym) { push(mkLine('  usage: watch [SYMBOL] --alert [%]', '#ff4466')); break }
        if (watchRef.current) { clearInterval(watchRef.current); push(mkLine('  stopped previous watch', 'rgba(0,255,65,0.4)')) }

        push(mkLine(`  watching ${sym} · alert at ±${threshold}% · Ctrl+C or "clear" to stop`, 'rgba(0,255,65,0.6)'))
        let lastPrice: number | null = null

        const poll = async () => {
          try {
            const r = await fetch('/api/tokens?bucket=trending')
            const d = (await r.json()) as { tokens?: Token[] }
            const token = d.tokens?.find((t) => t.symbol.toUpperCase() === sym)
            if (!token) return
            const chg = lastPrice ? ((token.priceUsd - lastPrice) / lastPrice) * 100 : 0
            if (lastPrice && Math.abs(chg) >= threshold) {
              push(mkLine(`  🔔 ALERT: ${sym} ${fmtC(chg)} → ${fmtP(token.priceUsd)}`, chg >= 0 ? 'var(--green)' : 'var(--red)'))
            } else {
              push(mkLine(`  ${new Date().toLocaleTimeString()} ${sym}: ${fmtP(token.priceUsd)} (${fmtC(token.change24h)})`, 'rgba(0,255,65,0.5)'))
            }
            lastPrice = token.priceUsd
          } catch {
            push(mkLine('  watch: fetch failed', '#ff4466'))
          }
        }
        await poll()
        watchRef.current = setInterval(poll, 30000)
        break
      }

      case 'portfolio': {
        const addr = args[0]
        if (!addr) { push(mkLine('  usage: portfolio [ADDRESS]', '#ff4466')); break }
        push(mkLine(`  fetching portfolio for ${addr.slice(0, 8)}...`, 'rgba(0,255,65,0.4)'))
        try {
          const r = await fetch(`https://base.blockscout.com/api/v2/addresses/${addr}/token-balances`)
          if (!r.ok) throw new Error(`Blockscout ${r.status}`)
          const d = (await r.json()) as Array<{ token?: { symbol?: string; name?: string }; value?: string; token_instance?: null }>
          const balances = d.filter((b) => !b.token_instance).slice(0, 20)
          if (!balances.length) { push(mkLine('  no token balances found', 'rgba(0,255,65,0.4)')); break }
          push(mkLine(''), mkLine('  PORTFOLIO BALANCES', 'var(--cyan)'))
          balances.forEach((b) => {
            const sym = b.token?.symbol ?? '?'
            const raw = parseFloat(b.value ?? '0')
            push(mkLine(`  ${sym.padEnd(12)} ${raw > 0 ? raw.toExponential(4) : '0'}`, 'rgba(0,255,65,0.7)'))
          })
          push(mkLine(''))
        } catch {
          push(mkLine('  Blockscout unavailable — check address format', '#ff4466'))
        }
        break
      }

      default:
        push(mkLine(`  unknown command: ${cmd}. Type 'help' for available commands.`, '#ff4466'))
    }
    scroll()
  }

  function submit() {
    const trimmed = input.trim()
    if (!trimmed) return
    setHistory((prev) => [trimmed, ...prev].slice(0, 100))
    setHistIdx(-1)
    setInput('')
    runCommand(trimmed)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { submit(); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setInput(history[next] ?? '')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setInput(next === -1 ? '' : history[next] ?? '')
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const cmds = ['status', 'trending', 'new', 'price', 'intel', 'repos', 'swarm', 'thesis', 'narrative', 'analyze', 'watch', 'portfolio', 'help', 'clear']
      const match = cmds.find((c) => c.startsWith(input.toLowerCase()))
      if (match) setInput(match)
    }
  }

  return (
    <main
      style={{ height: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', display: 'flex', flexDirection: 'column', background: '#000', cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>BANKRSYNTH://</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,2vw,18px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)' }}>
            ▶ TERMINAL
          </h1>
        </div>
        <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)' }}>type &apos;help&apos; · tab autocomplete · ↑↓ history</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7 }}>
        {lines.map((l) => (
          <div key={l.id} style={{ color: l.color ?? 'rgba(0,255,65,0.8)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {l.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.12)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '14px', flexShrink: 0 }}>▸</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="enter command..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '13px',
            caretColor: 'var(--green)',
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={submit}
          style={{ background: 'none', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.5)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', padding: '5px 10px', cursor: 'pointer' }}
        >
          RUN
        </button>
      </div>

      {showBYOK && <BYOKModal onClose={() => setShowBYOK(false)} />}
    </main>
  )
}
