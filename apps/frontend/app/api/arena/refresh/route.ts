import { NextResponse } from 'next/server'
import { kv_get, kv_set } from '@/lib/redis'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

interface Holding {
  balance: number
  avgPrice: number
  address: string
}

interface Portfolio {
  wallet: string
  usdc: number
  holdings: Record<string, Holding>
  startValue: number
  trades: number
}

export async function GET() {
  const participants = (await kv_get<string[]>('arena:participants')) ?? []
  if (!participants.length) return NextResponse.json({ ok: true, count: 0 })

  // Collect all unique token addresses across all portfolios
  const portfolioMap = new Map<string, Portfolio>()
  const uniqueAddresses = new Set<string>()

  for (const wallet of participants.slice(0, 100)) {
    const p = await kv_get<Portfolio>(`arena:portfolio:${wallet}`)
    if (!p) continue
    portfolioMap.set(wallet, p)
    for (const h of Object.values(p.holdings)) {
      if (h.address && h.balance > 0) uniqueAddresses.add(h.address.toLowerCase())
    }
  }

  // Batch-fetch live prices (GT accepts comma-separated addresses, max ~30 per call)
  const livePrices = new Map<string, number>()
  const addressArr = [...uniqueAddresses]

  for (let i = 0; i < addressArr.length; i += 30) {
    const batch = addressArr.slice(i, i + 30).join(',')
    try {
      const r = await fetch(`${GT}/simple/networks/base/token_price/${batch}`, { headers: GT_H })
      if (r.ok) {
        const d = (await r.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } }
        const prices = d.data?.attributes?.token_prices ?? {}
        for (const [addr, price] of Object.entries(prices)) {
          livePrices.set(addr.toLowerCase(), parseFloat(price))
        }
      }
    } catch { /* use avgPrice fallback */ }
  }

  // Recalculate portfolio values
  const entries = []
  for (const [wallet, p] of portfolioMap) {
    let holdingsValue = 0
    for (const h of Object.values(p.holdings)) {
      if (!h.balance || h.balance <= 0) continue
      const price = h.address ? (livePrices.get(h.address.toLowerCase()) ?? h.avgPrice) : h.avgPrice
      holdingsValue += h.balance * price
    }
    const currentValue = p.usdc + holdingsValue
    const startVal = p.startValue || 10000
    entries.push({
      wallet,
      displayName: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      currentValue,
      startValue: startVal,
      pnlPercent: ((currentValue - startVal) / startVal) * 100,
      pnlUsd: currentValue - startVal,
      trades: p.trades || 0,
      rank: 0,
    })
  }

  entries.sort((a, b) => b.pnlPercent - a.pnlPercent)
  entries.forEach((e, i) => { e.rank = i + 1 })

  await kv_set('arena:leaderboard:weekly', entries, 3600)
  await kv_set('arena:leaderboard:monthly', entries, 3600)

  return NextResponse.json({ ok: true, count: entries.length, ts: Date.now() })
}
