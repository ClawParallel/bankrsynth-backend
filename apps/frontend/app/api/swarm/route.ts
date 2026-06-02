import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const GT_H = { Accept: 'application/json;version=20230302' }

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  error?: { message?: string }
}

async function fetchMarketContext(): Promise<string> {
  const [trending, global] = await Promise.allSettled([
    fetch('https://api.geckoterminal.com/api/v2/networks/base/trending_pools?include=base_token&page=1', { headers: GT_H }).then(r => r.json()),
    fetch('https://api.coingecko.com/api/v3/global').then(r => r.json()),
  ])

  type Pool = { attributes?: Record<string, unknown>; relationships?: Record<string, Record<string, Record<string, string>>> }
  type Incl = { type?: string; id?: string; attributes?: Record<string, unknown> }

  const tVal = trending.status === 'fulfilled' ? trending.value as { data?: Pool[]; included?: Incl[] } : {}
  const pools = (tVal.data ?? []).slice(0, 15)
  const included = tVal.included ?? []
  const tokenMap: Record<string, Record<string, unknown>> = {}
  for (const item of included) if (item.type === 'token' && item.id) tokenMap[item.id] = item.attributes ?? {}

  const tokenList = pools.map(p => {
    const ti = tokenMap[p.relationships?.base_token?.data?.id ?? ''] ?? {}
    const a = p.attributes ?? {}
    const pc = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
    const vu = (a.volume_usd as Record<string, string> | undefined) ?? {}
    const change = parseFloat(pc.h24 ?? '0')
    const vol = parseFloat(vu.h24 ?? '0')
    const mcap = parseFloat(String(a.fdv_usd ?? '0'))
    const price = parseFloat(String(a.base_token_price_usd ?? '0'))
    const sym = String(ti.symbol ?? (a.name as string ?? '').split('/')[0] ?? '??').toUpperCase()
    return `${sym}: price=$${price} change24h=${change.toFixed(1)}% vol=$${(vol / 1e3).toFixed(0)}K mcap=$${(mcap / 1e3).toFixed(0)}K vol/mcap=${mcap > 0 ? ((vol / mcap) * 100).toFixed(0) : '?'}%`
  }).join('\n')

  const g = global.status === 'fulfilled' ? (global.value as { data?: Record<string, unknown> })?.data : null
  let macro = 'macro unavailable'
  if (g) {
    const mcapObj = g.total_market_cap as Record<string, number> | undefined
    const volObj = g.total_volume as Record<string, number> | undefined
    const dom = g.market_cap_percentage as Record<string, number> | undefined
    const chg = g.market_cap_change_percentage_24h_usd as number | undefined
    macro = `BTC_DOM=${dom?.btc?.toFixed(1)}% TOTAL_MCAP=$${((mcapObj?.usd ?? 0) / 1e12).toFixed(2)}T VOL=$${((volObj?.usd ?? 0) / 1e9).toFixed(0)}B MCAP_CHANGE=${chg?.toFixed(2)}%`
  }

  return `TIMESTAMP: ${new Date().toUTCString()}\nMACRO: ${macro}\n\nTOP BASE TOKENS:\n${tokenList}`
}

const SKILLS: Record<string, { name: string; buildPrompt: (data: string) => string }> = {
  'narrative-tracker': {
    name: 'Narrative Tracker',
    buildPrompt: (data) => `You are a crypto narrative analyst.
Analyze the current Base ecosystem token data and identify active narratives.
For each narrative: classify as FRONT-RUN (early), RIDE (active), FADE (exhausted), or WATCH (building).
Be specific about which tokens represent each narrative.
Max 200 words. Plain text.
LIVE DATA:\n${data}`,
  },
  'token-alert': {
    name: 'Token Alert Scanner',
    buildPrompt: (data) => `You are an on-chain anomaly detector.
Scan this token data and flag anomalies:
- Unusual vol/mcap ratios (>100% is notable, >300% is extreme)
- Price spikes without volume backing
- Tokens with momentum quietly building
Format each as: TOKEN: [observation] | SIGNAL: WATCH/BUY/AVOID
Max 200 words.
DATA:\n${data}`,
  },
  'defi-monitor': {
    name: 'DeFi Monitor',
    buildPrompt: (data) => `You are a DeFi pool health analyst.
For the top Base tokens by liquidity, assess pool health:
- Rate each: HEALTHY / CAUTION / AVOID
- Flag thin liquidity pools (rug risk indicators)
- Note any unusual fee/volume patterns
Max 200 words.
DATA:\n${data}`,
  },
  'on-chain-monitor': {
    name: 'On-Chain Monitor',
    buildPrompt: (data) => `You are an on-chain intelligence analyst.
Analyze signals in the Base ecosystem:
- Where is smart money accumulating?
- Which tokens show distribution patterns?
- 3 specific actionable on-chain signals right now
Max 200 words.
DATA:\n${data}`,
  },
  'market-context': {
    name: 'Market Context',
    buildPrompt: (data) => `You are a macro crypto analyst.
Assess current market context from this live data:
- Market regime: RISK-ON / NEUTRAL / RISK-OFF
- Capital rotation: into alts or consolidating BTC?
- BTC dominance implication for next 24-48h
- 2 macro signals traders must watch now
Max 200 words.
DATA:\n${data}`,
  },
  'alpha-scanner': {
    name: 'Alpha Scanner',
    buildPrompt: (data) => `You are an alpha researcher.
Find non-obvious opportunities in Base right now:
- 2-3 tokens with strong setups but low awareness
- One early narrative before it becomes crowded
- One contrarian take
Name specific tokens. Give specific reasoning.
Max 200 words.
DATA:\n${data}`,
  },
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic key not configured' }, { status: 500 })

  const { skillId } = (await req.json()) as { skillId?: string }
  const skill = skillId ? SKILLS[skillId] : undefined
  if (!skill) return NextResponse.json({ error: `Unknown skill: ${skillId}` }, { status: 400 })

  try {
    const marketData = await fetchMarketContext()
    const prompt = skill.buildPrompt(marketData)

    const r = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = (await r.json()) as AnthropicResponse
    if (!r.ok) return NextResponse.json({ error: data.error?.message ?? 'Anthropic API error' }, { status: 500 })

    const result = (data.content ?? [])
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('')
      .trim()

    return NextResponse.json({
      ok: true,
      skillId,
      skillName: skill.name,
      result,
      model: 'claude-sonnet-4-5',
      dataTimestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'skill execution failed' }, { status: 500 })
  }
}
