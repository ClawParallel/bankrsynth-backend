import { NextResponse } from 'next/server'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const GT_H = { Accept: 'application/json;version=20230302' }

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  error?: { message?: string }
}

export async function POST() {
  const apiKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic key not configured' }, { status: 500 })

  const [cgGlobal, cgTrending, gtTrending] = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/global').then(r => r.json()),
    fetch('https://api.coingecko.com/api/v3/search/trending').then(r => r.json()),
    fetch('https://api.geckoterminal.com/api/v2/networks/base/trending_pools?include=base_token&page=1', { headers: GT_H }).then(r => r.json()),
  ])

  const g = cgGlobal.status === 'fulfilled' ? (cgGlobal.value as { data?: Record<string, unknown> })?.data : null

  type Coin = { item?: { symbol?: string } }
  const trending = cgTrending.status === 'fulfilled'
    ? ((cgTrending.value as { coins?: Coin[] }).coins ?? []).slice(0, 5).map(c => c.item?.symbol).filter(Boolean).join(', ')
    : ''

  type Pool = { attributes?: Record<string, unknown>; relationships?: Record<string, Record<string, Record<string, string>>> }
  type Incl = { type?: string; id?: string; attributes?: Record<string, unknown> }
  const gtVal = gtTrending.status === 'fulfilled' ? gtTrending.value as { data?: Pool[]; included?: Incl[] } : {}
  const basePools = gtVal.data ?? []
  const included = gtVal.included ?? []
  const tokenMap: Record<string, Record<string, unknown>> = {}
  for (const item of included) if (item.type === 'token' && item.id) tokenMap[item.id] = item.attributes ?? {}

  const baseTokens = basePools.slice(0, 10).map(p => {
    const ti = tokenMap[p.relationships?.base_token?.data?.id ?? ''] ?? {}
    const a = p.attributes ?? {}
    const pc = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
    const vu = (a.volume_usd as Record<string, string> | undefined) ?? {}
    const change = parseFloat(pc.h24 ?? '0')
    const vol = parseFloat(vu.h24 ?? '0')
    const mcap = parseFloat(String(a.fdv_usd ?? '0'))
    const sym = String(ti.symbol ?? (a.name as string ?? '').split('/')[0] ?? '??').toUpperCase()
    return `${sym}: ${change >= 0 ? '+' : ''}${change.toFixed(1)}% vol=$${(vol / 1e3).toFixed(0)}K mcap=$${(mcap / 1e3).toFixed(0)}K`
  }).join('\n')

  let macro = ''
  if (g) {
    const mcapObj = g.total_market_cap as Record<string, number> | undefined
    const volObj = g.total_volume as Record<string, number> | undefined
    const dom = g.market_cap_percentage as Record<string, number> | undefined
    const chg = g.market_cap_change_percentage_24h_usd as number | undefined
    macro = `MACRO: mcap=$${((mcapObj?.usd ?? 0) / 1e12).toFixed(2)}T btc_dom=${dom?.btc?.toFixed(1)}% vol=$${((volObj?.usd ?? 0) / 1e9).toFixed(0)}B mcap_change=${chg?.toFixed(2)}%`
  }

  const ctx = [
    macro,
    trending ? `TRENDING SEARCH: ${trending}` : '',
    baseTokens ? `BASE ECOSYSTEM:\n${baseTokens}` : '',
  ].filter(Boolean).join('\n\n')

  try {
    const r = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are BankrSynth — AI intelligence layer for Base ecosystem.
Generate a market brief from this live data.

Structure (plain text, labeled):
MARKET REGIME: one sentence macro read
TOP NARRATIVES: 2-3 active themes on Base right now
WATCH LIST: 3 specific tokens with one-clause reason each
FADE LIST: 1-2 tokens showing exhaustion
SIGNAL OF THE DAY: highest-conviction observation

Max 250 words. Direct. Opinionated. No disclaimers.
DATE: ${new Date().toUTCString()}

DATA:\n${ctx}`,
        }],
      }),
    })

    const data = (await r.json()) as AnthropicResponse
    if (!r.ok) return NextResponse.json({ error: data.error?.message ?? 'Anthropic API error' }, { status: 500 })

    const brief = (data.content ?? [])
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('')
      .trim()

    return NextResponse.json({ brief, generatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'brief generation failed' }, { status: 500 })
  }
}
