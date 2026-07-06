import { NextRequest, NextResponse } from 'next/server'

// SynthVirtual Intelligence API — public, free, no signup.
// POST /api/v1/synthesize  { token, mode, chain }
//
// Anthropic is called via raw fetch (same approach as /api/synth) so we don't
// pull in an extra SDK dependency. Behaviour is identical to the SDK client.

// In-memory rate limit — resets on cold start (acceptable for a free tier).
// Key: `key:${apiKey}` or `ip:${ip}` | Value: { count, date }
const rl = new Map<string, { count: number; date: string }>()

function rateLimit(key: string, max: number): { ok: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0]
  const cur = rl.get(key)
  if (!cur || cur.date !== today) {
    rl.set(key, { count: 1, date: today })
    return { ok: true, remaining: max - 1 }
  }
  if (cur.count >= max) return { ok: false, remaining: 0 }
  cur.count++
  return { ok: true, remaining: max - cur.count }
}

interface TokenData {
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

// Fetch live token data from GeckoTerminal (Base network).
async function getToken(query: string): Promise<TokenData | null> {
  const H = { Accept: 'application/json;version=20230302' }
  const isAddr = /^0x[0-9a-fA-F]{40}$/.test(query)

  if (isAddr) {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/base/tokens/${query}?include=top_pools`,
      { headers: H, next: { revalidate: 60 } },
    )
    if (!r.ok) return null
    const d = await r.json()
    const t = d.data?.attributes
    const p = d.included?.find((x: { type: string }) => x.type === 'pool')?.attributes
    if (!t || !p) return null
    return {
      symbol: (t.symbol || '??').toUpperCase(),
      name: t.name || t.symbol,
      address: query.toLowerCase(),
      priceUsd: parseFloat(p.base_token_price_usd || '0'),
      change24h: parseFloat(p.price_change_percentage?.h24 || '0'),
      change1h: parseFloat(p.price_change_percentage?.h1 || '0'),
      volume24h: parseFloat(p.volume_usd?.h24 || '0'),
      marketCap: parseFloat(t.fdv_usd || p.fdv_usd || '0'),
      liquidity: parseFloat(p.reserve_in_usd || '0'),
    }
  }

  // Symbol search — use GeckoTerminal's search endpoint (reliable for any
  // listed token, not just whatever happens to be trending). It returns one
  // pool per trading pair; pick the matching base token's deepest pool by 24h
  // volume so price/liquidity reflect the primary market.
  const sym = query.toUpperCase()
  const r = await fetch(
    `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(
      query,
    )}&network=base&include=base_token&page=1`,
    { headers: H, next: { revalidate: 60 } },
  )
  if (!r.ok) return null
  const sr = await r.json()

  type Pool = {
    attributes: {
      base_token_price_usd?: string
      price_change_percentage?: { h24?: string; h1?: string }
      volume_usd?: { h24?: string }
      fdv_usd?: string
      market_cap_usd?: string
      reserve_in_usd?: string
    }
    relationships?: { base_token?: { data?: { id?: string } } }
  }
  type Token = { id: string; type: string; attributes: { symbol?: string; name?: string } }

  const tokenMap: Record<string, Token['attributes']> = {}
  for (const x of (sr.included || []) as Token[]) if (x.type === 'token') tokenMap[x.id] = x.attributes

  const matches = ((sr.data || []) as Pool[]).filter((p) => {
    const ti = tokenMap[p.relationships?.base_token?.data?.id || ''] || {}
    return ti.symbol?.toUpperCase() === sym
  })
  if (matches.length === 0) return null

  // Deepest pool by 24h volume = primary market for this token.
  const match = matches.reduce((best, p) =>
    parseFloat(p.attributes.volume_usd?.h24 || '0') > parseFloat(best.attributes.volume_usd?.h24 || '0')
      ? p
      : best,
  )

  const ti = tokenMap[match.relationships?.base_token?.data?.id || ''] || {}
  const a = match.attributes
  const addr = match.relationships?.base_token?.data?.id?.replace(/^[^_]+_/, '') || null
  return {
    symbol: (ti.symbol || sym).toUpperCase(),
    name: ti.name || sym,
    address: addr,
    priceUsd: parseFloat(a.base_token_price_usd || '0'),
    change24h: parseFloat(a.price_change_percentage?.h24 || '0'),
    change1h: parseFloat(a.price_change_percentage?.h1 || '0'),
    volume24h: parseFloat(a.volume_usd?.h24 || '0'),
    marketCap: parseFloat(a.market_cap_usd || a.fdv_usd || '0'),
    liquidity: parseFloat(a.reserve_in_usd || '0'),
  }
}

const PROMPTS: Record<string, (ctx: string) => string> = {
  analyze: (ctx) => `You are a senior on-chain analyst. Write a terse fundamental brief.
SIGNAL: what this token is + on-chain signal (vol/mcap, liquidity, price action)
RISKS: top 2 risks
VERDICT: ACCUMULATE / WATCH / AVOID + one-clause reason
Max 150 words. Plain text only. No markdown. No asterisks.
DATA:\n${ctx}`,

  narrative: (ctx) => `You are a crypto narrative analyst. Write a tight narrative read.
NARRATIVE: bucket (AI agents / base meme / defi blue chip / etc)
SENTIMENT: alive/dying/rotating + why
CATALYSTS: what could move it
GRADE: S/A/B/C/D + one-clause reason
Max 150 words. Plain text only.
DATA:\n${ctx}`,

  thesis: (ctx) => `You are writing an alpha thesis memo for a crypto trader.
THE TRADE: long/short/avoid + timeframe
ENTRY: price zone or trigger
EXIT: target + invalidation level
CATALYSTS: 1-3 specific things
CONVICTION: low/medium/high + score 0-100
Max 180 words. Plain text only. No markdown.
DATA:\n${ctx}`,
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Anthropic ${res.status}`)
  return (data.content as Array<{ type: string; text: string }>)
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const apiKey =
    req.headers.get('X-API-Key')?.trim() ||
    req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    null

  // Rate limit: 20/day with key, 3/day anonymous.
  const rlKey = apiKey ? `key:${apiKey}` : `ip:${ip}`
  const limit = apiKey ? 20 : 3
  const { ok, remaining } = rateLimit(rlKey, limit)

  if (!ok) {
    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: apiKey
          ? `Daily limit reached (20/day). Key: ${apiKey.slice(0, 12)}...`
          : 'Anonymous limit reached (3/day). Add X-API-Key header for 20 calls/day.',
        docs: 'https://synthterminal.app/api',
      },
      { status: 429, headers: { ...CORS, 'X-RateLimit-Remaining': '0' } },
    )
  }

  // Parse body.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON.' },
      { status: 400, headers: CORS },
    )
  }

  const token = (body.token || '').toString().trim()
  const mode = (body.mode || 'thesis').toString().toLowerCase()
  const chain = (body.chain || 'base').toString().toLowerCase()

  if (!token) {
    return NextResponse.json(
      {
        error: 'missing_token',
        message: 'token is required. Pass a symbol (e.g. "AEON") or contract address (0x...).',
        example: { token: 'AEON', mode: 'thesis', chain: 'base' },
      },
      { status: 400, headers: CORS },
    )
  }

  if (!['analyze', 'narrative', 'thesis'].includes(mode)) {
    return NextResponse.json(
      { error: 'invalid_mode', message: 'mode must be one of: analyze | narrative | thesis' },
      { status: 400, headers: CORS },
    )
  }

  if (chain !== 'base') {
    return NextResponse.json(
      { error: 'unsupported_chain', message: 'Only chain: "base" is supported.' },
      { status: 400, headers: CORS },
    )
  }

  // Fetch live token data.
  const tokenData = await getToken(token).catch(() => null)
  if (!tokenData || tokenData.priceUsd === 0) {
    return NextResponse.json(
      {
        error: 'token_not_found',
        message: `"${token}" not found on Base Mainnet. Use exact symbol or 0x contract address.`,
      },
      { status: 404, headers: CORS },
    )
  }

  // Macro context (best-effort).
  let macro = ''
  try {
    const cg = await fetch('https://api.coingecko.com/api/v3/global', { next: { revalidate: 300 } })
    const g = (await cg.json()).data
    macro = `\nMACRO: btc_dom=${g.market_cap_percentage?.btc?.toFixed(1)}% total_mcap=$${(
      g.total_market_cap?.usd / 1e12
    ).toFixed(2)}T vol=$${(g.total_volume?.usd / 1e9).toFixed(0)}B`
  } catch {
    // non-critical: continue without macro context
  }

  const fmt = (n: number) => {
    if (!n || !isFinite(n)) return '$0'
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
    return '$' + n.toPrecision(4)
  }
  const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'

  const ctx = [
    `Token: ${tokenData.symbol} (${tokenData.name})`,
    `Chain: base${
      tokenData.address ? ` | CA: ${tokenData.address.slice(0, 6)}...${tokenData.address.slice(-4)}` : ''
    }`,
    `Price: ${fmt(tokenData.priceUsd)}`,
    `24h change: ${pct(tokenData.change24h)}`,
    `1h change:  ${pct(tokenData.change1h)}`,
    `24h volume: ${fmt(tokenData.volume24h)}`,
    `Market cap: ${fmt(tokenData.marketCap)}`,
    `Liquidity:  ${fmt(tokenData.liquidity)}`,
    `Vol/MCap:   ${
      tokenData.marketCap > 0 ? ((tokenData.volume24h / tokenData.marketCap) * 100).toFixed(1) + '%' : 'n/a'
    }`,
    macro,
  ].join('\n')

  const anthropicKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503, headers: CORS })
  }

  const t0 = Date.now()

  try {
    const analysis = await callAnthropic(anthropicKey, 'claude-haiku-4-5-20251001', PROMPTS[mode](ctx))
    if (!analysis) throw new Error('empty_response')

    return NextResponse.json(
      {
        ok: true,
        token: tokenData.symbol,
        name: tokenData.name,
        mode,
        chain: 'base',
        analysis,
        data: {
          priceUsd: tokenData.priceUsd,
          change24h: tokenData.change24h,
          change1h: tokenData.change1h,
          volume24h: tokenData.volume24h,
          marketCap: tokenData.marketCap,
          liquidity: tokenData.liquidity,
          address: tokenData.address,
          basescan: tokenData.address ? `https://basescan.org/token/${tokenData.address}` : null,
        },
        meta: {
          model: 'claude-haiku-4-5',
          latencyMs: Date.now() - t0,
          remaining,
          poweredBy: 'SynthVirtual',
          docsUrl: 'https://synthterminal.app/api',
        },
      },
      {
        headers: {
          ...CORS,
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Limit': limit.toString(),
        },
      },
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'synthesis_failed', message: msg }, { status: 500, headers: CORS })
  }
}
