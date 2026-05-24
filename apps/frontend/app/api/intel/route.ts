import { NextResponse } from 'next/server'

export async function GET() {
  const [cgGlobal, cgTrending, gtBase] = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/global').then((r) => r.json()),
    fetch('https://api.coingecko.com/api/v3/search/trending').then((r) => r.json()),
    fetch('https://api.geckoterminal.com/api/v2/networks/base/trending_pools?page=1', {
      headers: { Accept: 'application/json;version=20230302' },
    }).then((r) => r.json()),
  ])

  const global = cgGlobal.status === 'fulfilled' ? (cgGlobal.value?.data as Record<string, unknown> | undefined) : null
  const trending =
    cgTrending.status === 'fulfilled'
      ? ((cgTrending.value?.coins as unknown[]) ?? []).slice(0, 10)
      : []
  const basePools =
    gtBase.status === 'fulfilled'
      ? ((gtBase.value?.data as unknown[]) ?? []).slice(0, 10)
      : []

  if (!global && !trending.length && !basePools.length) {
    return NextResponse.json({ error: 'All data sources unavailable' }, { status: 503 })
  }

  type GlobalData = {
    total_market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    market_cap_percentage?: { btc?: number; eth?: number }
    market_cap_change_percentage_24h_usd?: number
    active_cryptocurrencies?: number
  }

  type CoinItem = {
    item?: {
      symbol?: string
      name?: string
      market_cap_rank?: number
      thumb?: string
      score?: number
    }
  }

  type PoolItem = {
    attributes?: {
      name?: string
      base_token_price_usd?: string
      price_change_percentage?: { h24?: string }
      volume_usd?: { h24?: string }
      reserve_in_usd?: string
    }
  }

  const g = global as GlobalData | null

  return NextResponse.json({
    global: g
      ? {
          totalMcap: g.total_market_cap?.usd,
          vol24h: g.total_volume?.usd,
          btcDominance: g.market_cap_percentage?.btc,
          ethDominance: g.market_cap_percentage?.eth,
          mcapChange24h: g.market_cap_change_percentage_24h_usd,
          activeCryptos: g.active_cryptocurrencies,
        }
      : null,
    trending: (trending as CoinItem[]).map((c) => ({
      symbol: c.item?.symbol,
      name: c.item?.name,
      marketCapRank: c.item?.market_cap_rank,
      thumb: c.item?.thumb,
      score: c.item?.score,
    })),
    basePools: (basePools as PoolItem[]).map((p) => ({
      symbol: p.attributes?.name?.split('/')[0]?.trim(),
      price: parseFloat(p.attributes?.base_token_price_usd ?? '0'),
      change24h: parseFloat(p.attributes?.price_change_percentage?.h24 ?? '0'),
      volume24h: parseFloat(p.attributes?.volume_usd?.h24 ?? '0'),
      liquidity: parseFloat(p.attributes?.reserve_in_usd ?? '0'),
    })),
    timestamp: Date.now(),
  })
}
