import { NextRequest, NextResponse } from 'next/server'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

const BUCKET_ENDPOINTS: Record<string, string> = {
  trending: `${GT}/networks/base/trending_pools?include=base_token&page=1`,
  new_launches: `${GT}/networks/base/new_pools?include=base_token&page=1`,
  high_volume: `${GT}/networks/base/pools?network=base&sort=h24_volume_usd_desc&include=base_token&page=1`,
  ai_agents: `${GT}/networks/base/trending_pools?include=base_token&page=1`,
  bankr_eco: `${GT}/networks/base/pools?network=base&sort=h24_volume_usd_desc&include=base_token&page=1`,
}

const AI_KW = ['ai', 'agent', 'gpt', 'virtual', 'bnkr', 'aeon', 'aixbt', 'neural', 'synth']
const BANKR_SYM = [
  'bnkr', 'aero', 'brett', 'degen', 'toshi', 'virtual', 'aixbt', 'cbbtc', 'morpho', 'bankr',
]

type TokenAttrs = {
  name?: string
  symbol?: string
  image_url?: string
}

type PoolAttrs = {
  name?: string
  base_token_price_usd?: string
  price_change_percentage?: { h24?: string; h1?: string }
  volume_usd?: { h24?: string }
  market_cap_usd?: string
  fdv_usd?: string
  reserve_in_usd?: string
}

type Pool = {
  id?: string
  attributes?: PoolAttrs
  relationships?: { base_token?: { data?: { id?: string } } }
}

type Included = {
  type?: string
  id?: string
  attributes?: TokenAttrs
}

export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get('bucket') || 'trending'
  const endpoint = BUCKET_ENDPOINTS[bucket] ?? BUCKET_ENDPOINTS.trending

  const res = await fetch(endpoint, { headers: GT_H, next: { revalidate: 60 } })
  if (!res.ok) return NextResponse.json({ error: 'GeckoTerminal unavailable' }, { status: 503 })

  const data = await res.json()
  const pools: Pool[] = (data.data as Pool[]) ?? []
  const included: Included[] = (data.included as Included[]) ?? []

  const tokenMap: Record<string, TokenAttrs> = {}
  for (const item of included) {
    if (item.type === 'token' && item.id) tokenMap[item.id] = item.attributes ?? {}
  }

  let tokens = pools
    .map((p) => {
      const baseId = p.relationships?.base_token?.data?.id
      const ti = baseId ? (tokenMap[baseId] ?? {}) : {}
      const a = p.attributes ?? {}
      const address = baseId?.split('_').slice(1).join('_') ?? null
      const sym = ((ti.symbol ?? a.name?.split('/')[0]?.trim() ?? '??') as string)
        .toUpperCase()
        .slice(0, 12)

      return {
        id: `gt:base_${address ?? sym}`,
        symbol: sym,
        name: ((ti.name ?? a.name ?? sym) as string).slice(0, 60),
        address,
        priceUsd: parseFloat(a.base_token_price_usd ?? '0'),
        change24h: parseFloat(a.price_change_percentage?.h24 ?? '0'),
        change1h: parseFloat(a.price_change_percentage?.h1 ?? '0'),
        volume24h: parseFloat(a.volume_usd?.h24 ?? '0'),
        marketCap: parseFloat(a.market_cap_usd ?? a.fdv_usd ?? '0'),
        liquidity: parseFloat(a.reserve_in_usd ?? '0'),
        image: ti.image_url ?? null,
        poolUrl: `https://www.geckoterminal.com/base/pools/${p.id?.split('_').slice(1).join('_')}`,
      }
    })
    .filter((t) => t.symbol && t.priceUsd > 0)

  if (bucket === 'ai_agents') {
    tokens = tokens.filter((t) => AI_KW.some((k) => t.symbol.toLowerCase().includes(k)))
  }
  if (bucket === 'bankr_eco') {
    tokens = tokens.filter((t) => BANKR_SYM.some((k) => t.symbol.toLowerCase() === k))
  }

  return NextResponse.json({ tokens, bucket, count: tokens.length, timestamp: Date.now() })
}
