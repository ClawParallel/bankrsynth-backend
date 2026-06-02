import { NextRequest, NextResponse } from 'next/server'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }
const DS = 'https://api.dexscreener.com'

interface TokenResult {
  id: string
  symbol: string
  name: string
  address: string
  priceUsd: number
  change24h: number
  volume24h: number
  liquidity: number
}

const isAddress = (q: string) => /^0x[a-fA-F0-9]{40}$/.test(q)

type DsToken = { address?: string; symbol?: string; name?: string }
type DsPair = {
  chainId?: string
  baseToken?: DsToken
  quoteToken?: DsToken
  priceUsd?: string
  priceChange?: { h24?: number | string }
  volume?: { h24?: number | string }
  liquidity?: { usd?: number | string }
}

function mapFromBase(p: DsPair): TokenResult | null {
  const bt = p.baseToken
  if (!bt?.address) return null
  return {
    id: `gt:base_${bt.address.toLowerCase()}`,
    symbol: (bt.symbol ?? '??').toUpperCase().slice(0, 12),
    name: (bt.name ?? bt.symbol ?? '').slice(0, 60),
    address: bt.address,
    priceUsd: parseFloat(String(p.priceUsd ?? '0')),
    change24h: parseFloat(String(p.priceChange?.h24 ?? '0')),
    volume24h: parseFloat(String(p.volume?.h24 ?? '0')),
    liquidity: parseFloat(String(p.liquidity?.usd ?? '0')),
  }
}

async function searchDexScreener(q: string): Promise<TokenResult[]> {
  const r = await fetch(`${DS}/latest/dex/search?q=${encodeURIComponent(q)}`)
  if (!r.ok) return []
  const d = (await r.json()) as { pairs?: DsPair[] }
  const pairs = (d.pairs ?? []).filter(p => p.chainId === 'base')
  // best pair per base-token address (by liquidity)
  const best = new Map<string, DsPair>()
  for (const p of pairs) {
    const addr = p.baseToken?.address?.toLowerCase()
    if (!addr) continue
    const cur = best.get(addr)
    if (!cur || parseFloat(String(p.liquidity?.usd ?? '0')) > parseFloat(String(cur.liquidity?.usd ?? '0'))) {
      best.set(addr, p)
    }
  }
  return [...best.values()]
    .map(mapFromBase)
    .filter((t): t is TokenResult => !!t && t.symbol !== '??')
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 15)
}

async function lookupByAddress(addr: string): Promise<TokenResult[]> {
  // 1. DexScreener token pairs (richest data) — prefer pairs where this token is the base
  try {
    const r = await fetch(`${DS}/latest/dex/tokens/${addr}`)
    if (r.ok) {
      const d = (await r.json()) as { pairs?: DsPair[] }
      const basePairs = (d.pairs ?? [])
        .filter(p => p.chainId === 'base' && p.baseToken?.address?.toLowerCase() === addr.toLowerCase())
        .sort((a, b) => parseFloat(String(b.liquidity?.usd ?? '0')) - parseFloat(String(a.liquidity?.usd ?? '0')))
      const mapped = basePairs.map(mapFromBase).filter((t): t is TokenResult => !!t)
      if (mapped.length) return [mapped[0]]
    }
  } catch { /* fall through */ }

  // 2. GeckoTerminal fallback — token info + direct USD price
  try {
    const [infoRes, priceRes] = await Promise.all([
      fetch(`${GT}/networks/base/tokens/${addr}`, { headers: GT_H }),
      fetch(`${GT}/simple/networks/base/token_price/${addr}`, { headers: GT_H }),
    ])
    const info = infoRes.ok ? (await infoRes.json()) as { data?: { attributes?: Record<string, unknown> } } : null
    const priceD = priceRes.ok ? (await priceRes.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } } : null
    const a = info?.data?.attributes
    const price = parseFloat(priceD?.data?.attributes?.token_prices?.[addr.toLowerCase()] ?? '0')
    if (a?.symbol) {
      return [{
        id: `gt:base_${addr.toLowerCase()}`,
        symbol: String(a.symbol).toUpperCase().slice(0, 12),
        name: String(a.name ?? a.symbol).slice(0, 60),
        address: addr,
        priceUsd: price,
        change24h: 0,
        volume24h: parseFloat(String(a.volume_usd ? (a.volume_usd as Record<string, string>).h24 ?? '0' : '0')),
        liquidity: parseFloat(String(a.total_reserve_in_usd ?? '0')),
      }]
    }
  } catch { /* nothing */ }

  return []
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q || q.length < 2) return NextResponse.json({ tokens: [] })

  try {
    const tokens = isAddress(q) ? await lookupByAddress(q) : await searchDexScreener(q)
    return NextResponse.json({ tokens })
  } catch {
    return NextResponse.json({ tokens: [], error: 'search unavailable' }, { status: 200 })
  }
}
