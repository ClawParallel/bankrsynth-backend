import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const GT_H = { Accept: 'application/json;version=20230302' }

// Rate limit: 20 chat messages/day per IP
const rateLimitMap = new Map<string, number>()
const MAX_CHAT_PER_DAY = 20

interface ToolDef {
  name: string
  description: string
  input_schema: { type: string; properties: Record<string, unknown>; required?: string[] }
}

interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface AnthropicResponse {
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string
}

type MessageContent = string | ContentBlock[]
interface ChatMsg { role: 'user' | 'assistant'; content: MessageContent }

const TOOLS: ToolDef[] = [
  {
    name: 'get_token_data',
    description: 'Get live price, volume, 24h change, liquidity for a Base token. Use for any token price/analysis question.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Token symbol (e.g. AEON, VIRTUAL) or contract address (0x...)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_trending',
    description: 'Get trending, new, or top-volume tokens on Base right now.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['trending', 'new', 'volume'], description: 'Type of token list' },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_global_market',
    description: 'Get global crypto market: total market cap, BTC dominance, 24h volume, ETH dominance.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_wallet_portfolio',
    description: 'Get ERC-20 token holdings for a wallet address on Base.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum wallet address (0x...)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_whale_activity',
    description: 'Get recent large token transfers (>$5K) for a token contract on Base.',
    input_schema: {
      type: 'object',
      properties: {
        token_address: { type: 'string', description: 'Token contract address on Base' },
      },
      required: ['token_address'],
    },
  },
  {
    name: 'synthesize_token',
    description: 'Generate AI investment analysis for a token: analyze (fundamentals), narrative (meta/sentiment), or thesis (trade setup).',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Token symbol, e.g. AEON' },
        mode: { type: 'string', enum: ['analyze', 'narrative', 'thesis'] },
      },
      required: ['symbol', 'mode'],
    },
  },
]

// ── Tool implementations ──────────────────────────────────────────────────────

async function toolGetTokenData(query: string): Promise<string> {
  const isAddress = query.startsWith('0x')
  type TokenInfo = {
    symbol?: string; name?: string; price?: number; change24h?: number
    change1h?: number; volume24h?: number; fdv?: number; liquidity?: number; address?: string
  }
  let found: TokenInfo | null = null

  try {
    if (isAddress) {
      const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/tokens/${query}?include=top_pools`, { headers: GT_H })
      if (r.ok) {
        const d = await r.json() as { data?: { attributes?: Record<string, unknown> }; included?: Array<{ attributes?: Record<string, unknown> }> }
        const tok = d.data?.attributes ?? {}
        const pool = d.included?.[0]?.attributes ?? {}
        const pc = (pool.price_change_percentage as Record<string, string> | undefined) ?? {}
        const vu = (pool.volume_usd as Record<string, string> | undefined) ?? {}
        found = {
          symbol: String(tok.symbol ?? '').toUpperCase(),
          name: String(tok.name ?? query),
          price: parseFloat(String(pool.base_token_price_usd ?? '0')),
          change24h: parseFloat(pc.h24 ?? '0'),
          change1h: parseFloat(pc.h1 ?? '0'),
          volume24h: parseFloat(vu.h24 ?? '0'),
          fdv: parseFloat(String(tok.fdv_usd ?? pool.fdv_usd ?? '0')),
          liquidity: parseFloat(String(pool.reserve_in_usd ?? '0')),
          address: query,
        }
      }
    } else {
      const [t, v] = await Promise.all([
        fetch('https://api.geckoterminal.com/api/v2/networks/base/trending_pools?include=base_token&page=1', { headers: GT_H }).then(r => r.json()),
        fetch('https://api.geckoterminal.com/api/v2/networks/base/pools?network=base&sort=h24_volume_usd_desc&include=base_token&page=1', { headers: GT_H }).then(r => r.json()),
      ]) as [Record<string, unknown>, Record<string, unknown>]
      const pools = [...((t.data as unknown[]) ?? []), ...((v.data as unknown[]) ?? [])] as Array<Record<string, unknown>>
      const included = [...((t.included as unknown[]) ?? []), ...((v.included as unknown[]) ?? [])] as Array<Record<string, unknown>>
      const tokenMap: Record<string, Record<string, unknown>> = {}
      for (const item of included) {
        if (item.type === 'token' && item.id) tokenMap[String(item.id)] = (item.attributes as Record<string, unknown>) ?? {}
      }
      const match = pools.find(p => {
        const rel = p.relationships as Record<string, Record<string, Record<string, string>>> | undefined
        const ti = tokenMap[rel?.base_token?.data?.id ?? ''] ?? {}
        return String(ti.symbol ?? '').toUpperCase() === query.toUpperCase()
      })
      if (match) {
        const rel = match.relationships as Record<string, Record<string, Record<string, string>>> | undefined
        const ti = tokenMap[rel?.base_token?.data?.id ?? ''] ?? {}
        const a = (match.attributes as Record<string, unknown>) ?? {}
        const pc = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
        const vu = (a.volume_usd as Record<string, string> | undefined) ?? {}
        found = {
          symbol: String(ti.symbol ?? '').toUpperCase() || query.toUpperCase(),
          name: String(ti.name ?? ti.symbol ?? query),
          price: parseFloat(String(a.base_token_price_usd ?? '0')),
          change24h: parseFloat(pc.h24 ?? '0'),
          change1h: parseFloat(pc.h1 ?? '0'),
          volume24h: parseFloat(vu.h24 ?? '0'),
          fdv: parseFloat(String(a.market_cap_usd ?? a.fdv_usd ?? '0')),
          liquidity: parseFloat(String(a.reserve_in_usd ?? '0')),
          address: rel?.base_token?.data?.id?.split('_').slice(1).join('_') ?? undefined,
        }
      }
    }

    // DexScreener fallback
    if (!found || !found.price) {
      const ds = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => null) as { pairs?: Array<Record<string, unknown>> } | null
      const pair = (ds?.pairs ?? []).filter((p: Record<string, unknown>) => p.chainId === 'base')
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => parseFloat(String((a.liquidity as Record<string,string>)?.usd ?? '0')) - parseFloat(String((b.liquidity as Record<string,string>)?.usd ?? '0')))[0] as Record<string, unknown> | undefined
      if (pair) {
        const bt = pair.baseToken as Record<string, string> | undefined
        const pc = pair.priceChange as Record<string, string> | undefined
        const vol = pair.volume as Record<string, string> | undefined
        const liq = pair.liquidity as Record<string, string> | undefined
        found = {
          symbol: bt?.symbol?.toUpperCase(),
          name: bt?.name,
          price: parseFloat(String(pair.priceUsd ?? '0')),
          change24h: parseFloat(pc?.h24 ?? '0'),
          change1h: parseFloat(pc?.h1 ?? '0'),
          volume24h: parseFloat(vol?.h24 ?? '0'),
          fdv: parseFloat(String(pair.fdv ?? '0')),
          liquidity: parseFloat(liq?.usd ?? '0'),
          address: bt?.address,
        }
      }
    }

    if (!found || !found.symbol) return `Token "${query}" not found on Base (GeckoTerminal + DexScreener)`

    const fmt = (n: number) => {
      if (!n) return '$0'
      if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
      if (n >= 1) return '$' + n.toFixed(4)
      return '$' + n.toPrecision(4)
    }
    const c = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
    const p = found.price ?? 0
    const priceStr = p < 0.001 ? '$' + p.toPrecision(4) : p < 1 ? '$' + p.toFixed(6) : '$' + p.toFixed(4)

    return JSON.stringify({
      symbol: found.symbol, name: found.name,
      price: priceStr, priceRaw: p,
      change24h: c(found.change24h ?? 0),
      change1h: c(found.change1h ?? 0),
      volume24h: fmt(found.volume24h ?? 0),
      fdv: fmt(found.fdv ?? 0),
      liquidity: fmt(found.liquidity ?? 0),
      volFdvRatio: found.fdv ? ((found.volume24h ?? 0) / found.fdv * 100).toFixed(1) + '%' : 'n/a',
      address: found.address,
      chain: 'base',
      basescan: found.address ? `https://basescan.org/token/${found.address}` : null,
    })
  } catch (e) {
    return `Error fetching ${query}: ${e instanceof Error ? e.message : 'unknown'}`
  }
}

async function toolGetTrending(type: string): Promise<string> {
  const endpoints: Record<string, string> = {
    trending: 'https://api.geckoterminal.com/api/v2/networks/base/trending_pools?include=base_token&page=1',
    new:      'https://api.geckoterminal.com/api/v2/networks/base/new_pools?include=base_token&page=1',
    volume:   'https://api.geckoterminal.com/api/v2/networks/base/pools?network=base&sort=h24_volume_usd_desc&include=base_token&page=1',
  }
  const r = await fetch(endpoints[type] ?? endpoints.trending, { headers: GT_H })
  const d = await r.json() as { data?: Array<Record<string, unknown>>; included?: Array<Record<string, unknown>> }
  const tokenMap: Record<string, Record<string, unknown>> = {}
  for (const item of d.included ?? []) if (item.type === 'token' && item.id) tokenMap[String(item.id)] = (item.attributes as Record<string, unknown>) ?? {}

  const lines = (d.data ?? []).slice(0, 12).map(p => {
    const rel = p.relationships as Record<string, Record<string, Record<string, string>>> | undefined
    const ti = tokenMap[rel?.base_token?.data?.id ?? ''] ?? {}
    const a = (p.attributes as Record<string, unknown>) ?? {}
    const pc = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
    const vu = (a.volume_usd as Record<string, string> | undefined) ?? {}
    const sym = String(ti.symbol ?? (a.name as string ?? '').split('/')[0]).toUpperCase()
    const chg = parseFloat(pc.h24 ?? '0')
    const price = parseFloat(String(a.base_token_price_usd ?? '0'))
    const vol = parseFloat(vu.h24 ?? '0')
    const priceStr = price < 0.001 ? price.toExponential(2) : price.toFixed(4)
    const volStr = vol >= 1e6 ? (vol / 1e6).toFixed(1) + 'M' : vol >= 1e3 ? (vol / 1e3).toFixed(0) + 'K' : vol.toFixed(0)
    return `${sym.padEnd(12)} ${(chg >= 0 ? '+' : '') + chg.toFixed(1) + '%'}  price $${priceStr}  vol $${volStr}`
  }).join('\n')

  return `${type.toUpperCase()} TOKENS ON BASE:\n${lines}`
}

async function toolGetGlobalMarket(): Promise<string> {
  const r = await fetch('https://api.coingecko.com/api/v3/global')
  const d = (await r.json() as { data?: Record<string, unknown> }).data ?? {}
  const mcap = (d.total_market_cap as Record<string, number> | undefined)?.usd ?? 0
  const vol  = (d.total_volume  as Record<string, number> | undefined)?.usd ?? 0
  const dom  = (d.market_cap_percentage as Record<string, number> | undefined) ?? {}
  const chg  = (d.market_cap_change_percentage_24h_usd as number | undefined) ?? 0
  const fmt  = (n: number) => n >= 1e12 ? '$' + (n / 1e12).toFixed(2) + 'T' : n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : '$' + n.toFixed(0)
  return `GLOBAL CRYPTO MARKET:\nTotal Market Cap: ${fmt(mcap)} (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% 24h)\n24h Volume: ${fmt(vol)}\nBTC Dominance: ${dom.btc?.toFixed(1) ?? 'n/a'}%\nETH Dominance: ${dom.eth?.toFixed(1) ?? 'n/a'}%\nActive Cryptos: ${(d.active_cryptocurrencies as number | undefined)?.toLocaleString() ?? 'n/a'}`
}

async function toolGetWalletPortfolio(address: string): Promise<string> {
  const r = await fetch(`https://base.blockscout.com/api/v2/addresses/${address}/token-balances`)
  const d = await r.json() as Array<Record<string, unknown>>
  const items = Array.isArray(d) ? d : []
  const balances = items
    .filter(t => t.value && t.value !== '0' && t.token)
    .map(t => {
      const tok = t.token as Record<string, string> | undefined
      const bal = parseFloat(String(t.value ?? '0')) / Math.pow(10, parseInt(tok?.decimals ?? '18'))
      const balStr = bal >= 1e6 ? (bal / 1e6).toFixed(2) + 'M' : bal >= 1e3 ? (bal / 1e3).toFixed(2) + 'K' : bal.toFixed(4)
      return `${(tok?.symbol ?? '?').padEnd(12)} ${balStr}`
    })
    .slice(0, 15)
  return `WALLET ${address.slice(0, 6)}...${address.slice(-4)} ON BASE:\n` +
    (balances.length ? balances.join('\n') : 'No ERC-20 token balances found')
}

async function toolGetWhaleActivity(tokenAddress: string): Promise<string> {
  const [txR, priceR] = await Promise.all([
    fetch(`https://base.blockscout.com/api/v2/tokens/${tokenAddress}/transfers?limit=20`).then(r => r.json()),
    fetch(`https://api.geckoterminal.com/api/v2/simple/networks/base/token_price/${tokenAddress}`, { headers: GT_H }).then(r => r.json()),
  ]) as [Record<string, unknown>, Record<string, unknown>]

  const priceAttr = (priceR.data as Record<string, unknown> | undefined)?.attributes as Record<string, unknown> | undefined
  const tokenPrices = (priceAttr?.token_prices ?? {}) as Record<string, string>
  const price = parseFloat(tokenPrices[tokenAddress.toLowerCase()] ?? '0')

  const items = (txR.items as Array<Record<string, unknown>> | undefined) ?? []
  const whales = items.map(tx => {
    const total = tx.total as Record<string, string> | undefined
    const amount = parseFloat(total?.value ?? '0') / Math.pow(10, parseInt(total?.decimals ?? '18'))
    const usd = amount * price
    const from = (tx.from as Record<string, string> | undefined)?.hash ?? ''
    const to   = (tx.to   as Record<string, string> | undefined)?.hash ?? ''
    return { usd, from, to, hash: String(tx.transaction_hash ?? ''), ts: String(tx.timestamp ?? '') }
  }).filter(tx => tx.usd >= 5000).slice(0, 5)

  if (!whales.length) return 'No large transactions (>$5K) found in recent transfers'
  const fmt = (n: number) => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(0) + 'K' : '$' + n.toFixed(0)
  return 'RECENT LARGE TRANSACTIONS:\n' + whales.map(w =>
    `${fmt(w.usd)}  ${w.from.slice(0, 6)}...→${w.to.slice(0, 6)}...  basescan.org/tx/${w.hash.slice(0, 10)}...`
  ).join('\n')
}

async function toolSynthesizeToken(symbol: string, mode: string): Promise<string> {
  const tokenJson = await toolGetTokenData(symbol)
  let td: Record<string, unknown>
  try { td = JSON.parse(tokenJson) } catch { return 'Cannot synthesize: token not found' }
  if (!td.symbol) return `Cannot synthesize: ${symbol} not found on Base`

  const apiKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!apiKey) return 'Synthesis unavailable: no API key configured'

  const PROMPTS: Record<string, string> = {
    analyze: `Senior on-chain analyst. Terse brief. Plain text.
SIGNAL: what this token is + on-chain signal (vol/fdv ratio, liquidity, price action)
RISKS: top 2 risks
VERDICT: ACCUMULATE / WATCH / AVOID + one-clause reason
Max 150 words. DATA: ${tokenJson}`,
    narrative: `Crypto narrative scout. Plain text.
NARRATIVE: bucket (AI agents / base meme / defi / etc)
SENTIMENT: alive/dying/rotating + why
CATALYSTS: what could move it
GRADE: S/A/B/C/D + reason
Max 150 words. DATA: ${tokenJson}`,
    thesis: `Alpha thesis. Plain text.
THE TRADE: long/short/avoid + timeframe
ENTRY: price zone
EXIT: target + invalidation
CATALYSTS: 1-3 things
CONVICTION: low/medium/high + score 0-100
Max 180 words. DATA: ${tokenJson}`,
  }

  const r = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: PROMPTS[mode] ?? PROMPTS.analyze }],
    }),
  })
  const data = await r.json() as AnthropicResponse
  return data.content?.filter(b => b.type === 'text').map(b => b.text ?? '').join('') || 'Synthesis failed'
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'get_token_data':       return await toolGetTokenData(String(input.query ?? ''))
      case 'get_trending':         return await toolGetTrending(String(input.type ?? 'trending'))
      case 'get_global_market':    return await toolGetGlobalMarket()
      case 'get_wallet_portfolio': return await toolGetWalletPortfolio(String(input.address ?? ''))
      case 'get_whale_activity':   return await toolGetWhaleActivity(String(input.token_address ?? ''))
      case 'synthesize_token':     return await toolSynthesizeToken(String(input.symbol ?? ''), String(input.mode ?? 'analyze'))
      default: return `Unknown tool: ${name}`
    }
  } catch (e) {
    return `Tool ${name} error: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const body = await req.json() as { messages?: ChatMsg[]; walletAddress?: string }
  if (!body.messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const today = new Date().toISOString().split('T')[0]
  const rlKey = `chat:${ip}:${today}`
  const count = rateLimitMap.get(rlKey) ?? 0
  if (count >= MAX_CHAT_PER_DAY) {
    return NextResponse.json({ error: `Daily limit reached (${MAX_CHAT_PER_DAY} messages/day). Add your API key in Settings for unlimited.` }, { status: 429 })
  }
  rateLimitMap.set(rlKey, count + 1)

  const system = `You are SynthVirtual — an AI intelligence terminal for Base ecosystem tokens and crypto markets.

You have live data tools. ALWAYS call them when users ask about:
- Specific tokens (price, analysis, performance)
- Market conditions or macro data
- Trending tokens or new launches
- Wallet portfolios
- Whale activity

Be direct and opinionated. No disclaimers. No "as an AI". Format clearly with line breaks.
Always include price + 24h change when showing token data.
${body.walletAddress ? `Connected wallet: ${body.walletAddress}` : 'No wallet connected.'}
Current time: ${new Date().toUTCString()}
Chain focus: Base Mainnet`

  let messages: ChatMsg[] = body.messages
  let finalText = ''
  let iterations = 0

  while (iterations < 5) {
    iterations++
    const r = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1024, system, tools: TOOLS, messages }),
    })

    const resp = await r.json() as AnthropicResponse
    if (!r.ok) return NextResponse.json({ error: (resp as unknown as Record<string, unknown>).error ?? 'Anthropic API error' }, { status: 500 })

    if (resp.stop_reason === 'end_turn') {
      finalText = resp.content.filter(b => b.type === 'text').map(b => b.text ?? '').join('')
      break
    }

    if (resp.stop_reason === 'tool_use') {
      const toolUses = resp.content.filter(b => b.type === 'tool_use')
      const results = await Promise.all(
        toolUses.map(async tool => ({
          type: 'tool_result' as const,
          tool_use_id: tool.id!,
          content: await executeTool(tool.name!, tool.input ?? {}),
        }))
      )
      messages = [
        ...messages,
        { role: 'assistant', content: resp.content },
        { role: 'user',      content: results as ContentBlock[] },
      ]
      continue
    }

    break
  }

  return NextResponse.json({ response: finalText || 'No response generated' })
}
