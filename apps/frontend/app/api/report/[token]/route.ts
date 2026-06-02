import { NextRequest, NextResponse } from 'next/server'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

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
  image: string | null
}

async function fetchByAddress(address: string): Promise<TokenData | null> {
  try {
    const r = await fetch(
      `${GT}/networks/base/tokens/${address}?include=top_pools`,
      { headers: GT_H, next: { revalidate: 60 } },
    )
    if (!r.ok) return null
    const d = await r.json() as {
      data?: { attributes?: Record<string, unknown> }
      included?: Array<{ attributes?: Record<string, unknown> }>
    }
    const t = d.data?.attributes ?? {}
    const pool = d.included?.[0]?.attributes ?? {}
    const priceChange = (pool.price_change_percentage as Record<string, string> | undefined) ?? {}
    const volumeUsd = (pool.volume_usd as Record<string, string> | undefined) ?? {}
    return {
      symbol: String(t.symbol ?? '').toUpperCase(),
      name: String(t.name ?? address),
      address,
      priceUsd: parseFloat(String(pool.base_token_price_usd ?? '0')),
      change24h: parseFloat(priceChange.h24 ?? '0'),
      change1h: parseFloat(priceChange.h1 ?? '0'),
      volume24h: parseFloat(volumeUsd.h24 ?? '0'),
      marketCap: parseFloat(String(t.fdv_usd ?? pool.fdv_usd ?? '0')),
      liquidity: parseFloat(String(pool.reserve_in_usd ?? '0')),
      image: String(t.image_url ?? '') || null,
    }
  } catch { return null }
}

async function fetchBySymbol(symbol: string): Promise<TokenData | null> {
  try {
    const [t1, v1] = await Promise.all([
      fetch(`${GT}/networks/base/trending_pools?include=base_token&page=1`, { headers: GT_H }).then(r => r.json()),
      fetch(`${GT}/networks/base/pools?network=base&sort=h24_volume_usd_desc&include=base_token&page=1`, { headers: GT_H }).then(r => r.json()),
    ]) as [Record<string, unknown>, Record<string, unknown>]

    const allPools = [...((t1.data as unknown[]) ?? []), ...((v1.data as unknown[]) ?? [])] as Array<Record<string, unknown>>
    const included = [...((t1.included as unknown[]) ?? []), ...((v1.included as unknown[]) ?? [])] as Array<Record<string, unknown>>

    const tokenMap: Record<string, Record<string, unknown>> = {}
    for (const item of included) {
      if (item.type === 'token' && item.id) {
        tokenMap[String(item.id)] = (item.attributes as Record<string, unknown>) ?? {}
      }
    }

    const match = allPools.find(p => {
      const rel = p.relationships as Record<string, Record<string, Record<string, string>>> | undefined
      const tid = rel?.base_token?.data?.id ?? ''
      const ti = tokenMap[tid] ?? {}
      return String(ti.symbol ?? '').toUpperCase() === symbol.toUpperCase()
    })
    if (!match) return null

    const rel = match.relationships as Record<string, Record<string, Record<string, string>>> | undefined
    const tid = rel?.base_token?.data?.id ?? ''
    const ti = tokenMap[tid] ?? {}
    const a = (match.attributes as Record<string, unknown>) ?? {}
    const priceChange = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
    const volumeUsd = (a.volume_usd as Record<string, string> | undefined) ?? {}
    const addr = tid.split('_').slice(1).join('_') || null

    return {
      symbol: String(ti.symbol ?? '').toUpperCase() || symbol.toUpperCase(),
      name: String(ti.name ?? ti.symbol ?? symbol),
      address: addr,
      priceUsd: parseFloat(String(a.base_token_price_usd ?? '0')),
      change24h: parseFloat(priceChange.h24 ?? '0'),
      change1h: parseFloat(priceChange.h1 ?? '0'),
      volume24h: parseFloat(volumeUsd.h24 ?? '0'),
      marketCap: parseFloat(String(a.market_cap_usd ?? a.fdv_usd ?? '0')),
      liquidity: parseFloat(String(a.reserve_in_usd ?? '0')),
      image: String(ti.image_url ?? '') || null,
    }
  } catch { return null }
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const d = await r.json() as { content?: Array<{ type: string; text: string }> }
    return d.content?.filter(b => b.type === 'text').map(b => b.text).join('') ?? null
  } catch { return null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: tokenId } = await params
  const isAddress = tokenId.startsWith('0x')

  const tokenData = isAddress ? await fetchByAddress(tokenId) : await fetchBySymbol(tokenId)

  if (!tokenData || !tokenData.symbol) {
    return NextResponse.json({ error: `Token not found: ${tokenId}` }, { status: 404 })
  }

  const fmtP = (n: number) => {
    if (!n || !isFinite(n)) return '$0'
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
    if (n >= 1) return '$' + n.toFixed(6)
    return '$' + n.toPrecision(4)
  }

  const ctx = [
    `Token: ${tokenData.symbol} (${tokenData.name})`,
    `Chain: base${tokenData.address ? ` · CA: ${tokenData.address.slice(0, 8)}...${tokenData.address.slice(-6)}` : ''}`,
    `Price: ${fmtP(tokenData.priceUsd)}`,
    `24h change: ${tokenData.change24h >= 0 ? '+' : ''}${tokenData.change24h.toFixed(2)}%`,
    `1h change: ${tokenData.change1h >= 0 ? '+' : ''}${tokenData.change1h.toFixed(2)}%`,
    `24h volume: ${fmtP(tokenData.volume24h)}`,
    `Market cap / FDV: ${fmtP(tokenData.marketCap)}`,
    `Pool liquidity: ${fmtP(tokenData.liquidity)}`,
    `Vol/MCap: ${tokenData.marketCap > 0 ? ((tokenData.volume24h / tokenData.marketCap) * 100).toFixed(1) + '%' : 'n/a'}`,
  ].join('\n')

  const PROMPTS = {
    analyze: `Senior on-chain analyst. Terse fundamental brief. Plain text, no markdown.
SIGNAL: what this token is + key on-chain signal read
RISKS: top 2 risks
VERDICT: ACCUMULATE / WATCH / AVOID + one-clause reason
Max 150 words. DATA:\n${ctx}`,

    narrative: `Crypto narrative scout. Tight narrative read. Plain text, no markdown.
NARRATIVE: bucket classification (AI agents / base meme / defi blue chip / etc)
SENTIMENT: alive/dying/rotating + why
CATALYSTS: what could move it
GRADE: S/A/B/C/D + reason
Max 150 words. DATA:\n${ctx}`,

    thesis: `Alpha thesis for degen trader. Plain text, no markdown.
THE TRADE: long/short/avoid + timeframe
ENTRY: price zone
EXIT: target + invalidation
CATALYSTS: 1-3 things
CONVICTION: low/medium/high + score 0-100
Max 180 words. DATA:\n${ctx}`,
  }

  const apiKey = process.env.ANTHROPIC_FALLBACK_KEY
  let synthesis: { analyze: string | null; narrative: string | null; thesis: string | null } | null = null

  if (apiKey) {
    const [analyze, narrative, thesis] = await Promise.all([
      callAnthropic(apiKey, PROMPTS.analyze),
      callAnthropic(apiKey, PROMPTS.narrative),
      callAnthropic(apiKey, PROMPTS.thesis),
    ])
    synthesis = { analyze, narrative, thesis }
  }

  // Whale alerts from Blockscout
  let whaleAlerts: Array<{ valueUsd: number; from: string; to: string; txHash: string; timestamp: string }> = []
  if (tokenData.address) {
    try {
      const r = await fetch(`https://base.blockscout.com/api/v2/tokens/${tokenData.address}/transfers?limit=20`)
      if (r.ok) {
        const d = await r.json() as { items?: Array<Record<string, unknown>> }
        whaleAlerts = (d.items ?? [])
          .map(tx => {
            const total = tx.total as Record<string, string> | undefined
            const amount = parseFloat(total?.value ?? '0') / Math.pow(10, parseInt(total?.decimals ?? '18'))
            const valueUsd = amount * tokenData.priceUsd
            const from = tx.from as Record<string, string> | undefined
            const to = tx.to as Record<string, string> | undefined
            return {
              valueUsd,
              from: from?.hash ?? '',
              to: to?.hash ?? '',
              txHash: String(tx.transaction_hash ?? ''),
              timestamp: String(tx.timestamp ?? ''),
            }
          })
          .filter(tx => tx.valueUsd >= 5000)
          .slice(0, 5)
      }
    } catch { /* non-critical */ }
  }

  const verdictMatch = synthesis?.analyze?.match(/VERDICT:\s*(ACCUMULATE|WATCH|AVOID)/i)
  const verdict = verdictMatch?.[1]?.toUpperCase() ?? 'WATCH'

  return NextResponse.json(
    { ...tokenData, verdict, synthesis, whaleAlerts, generatedAt: Date.now() },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
  )
}
