import { NextResponse } from 'next/server'
import { storeGet, storeSet, Portfolio, LeaderboardEntry } from '@/lib/arena-store'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

export async function GET() {
  const wallets = storeGet<string[]>('arena:wallets') ?? []

  if (wallets.length === 0) {
    return NextResponse.json({ ok: true, leaderboard: [], wallets: 0 })
  }

  // Collect unique token addresses across all portfolios
  const addrToSymbol = new Map<string, string>()
  for (const wallet of wallets) {
    const p = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    if (!p) continue
    for (const [symbol, h] of Object.entries(p.holdings)) {
      if (h.address && !addrToSymbol.has(h.address.toLowerCase())) {
        addrToSymbol.set(h.address.toLowerCase(), symbol)
      }
    }
  }

  // Batch-fetch live prices (GeckoTerminal accepts comma-separated addresses)
  const livePrices = new Map<string, number>()
  const addresses = [...addrToSymbol.keys()]

  for (let i = 0; i < addresses.length; i += 30) {
    const batch = addresses.slice(i, i + 30).join(',')
    try {
      const r = await fetch(`${GT}/simple/networks/base/token_price/${batch}`, { headers: GT_H })
      if (r.ok) {
        const d = (await r.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } }
        const prices = d.data?.attributes?.token_prices ?? {}
        for (const [addr, price] of Object.entries(prices)) {
          livePrices.set(addr.toLowerCase(), parseFloat(price))
        }
      }
    } catch { /* use stored avgPrice as fallback */ }
  }

  // Recalculate portfolio values with live prices
  const entries: LeaderboardEntry[] = []
  for (const wallet of wallets) {
    const p = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    if (!p) continue

    let holdingsValue = 0
    for (const h of Object.values(p.holdings)) {
      const price = h.address
        ? (livePrices.get(h.address.toLowerCase()) ?? h.avgPrice)
        : h.avgPrice
      holdingsValue += h.balance * price
    }

    const currentValue = p.usdc + holdingsValue
    const pnlPct = ((currentValue - p.startValue) / p.startValue) * 100
    entries.push({ wallet, pnlPct, currentValue })
  }

  entries.sort((a, b) => b.pnlPct - a.pnlPct)

  storeSet('arena:leaderboard:weekly', entries)
  storeSet('arena:leaderboard:monthly', entries)

  return NextResponse.json({ ok: true, leaderboard: entries, wallets: wallets.length, ts: Date.now() })
}
