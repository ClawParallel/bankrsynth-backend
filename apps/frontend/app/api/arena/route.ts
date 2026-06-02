import { NextRequest, NextResponse } from 'next/server'
import {
  storeGet, storeSet, buildLeaderboard,
  Portfolio, TradeRecord, LeaderboardEntry,
} from '@/lib/arena-store'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const wallet = searchParams.get('wallet')
  const period = searchParams.get('period') ?? 'weekly'

  if (action === 'portfolio' && wallet) {
    const portfolio = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    return NextResponse.json(portfolio ?? null)
  }

  if (action === 'leaderboard') {
    const cached = storeGet<LeaderboardEntry[]>(`arena:leaderboard:${period}`)
    const lb = cached ?? buildLeaderboard()
    return NextResponse.json({ leaderboard: lb, period })
  }

  if (action === 'trades' && wallet) {
    const trades = storeGet<TradeRecord[]>(`arena:trades:${wallet}`) ?? []
    return NextResponse.json({ trades })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action: string
    wallet?: string
    tokenSymbol?: string
    tokenAddress?: string
    tradeType?: 'buy' | 'sell'
    usdcAmount?: number
  }
  const { action, wallet } = body

  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  if (action === 'join') {
    const existing = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    if (existing) return NextResponse.json({ error: 'already joined' }, { status: 400 })

    const portfolio: Portfolio = {
      wallet,
      usdc: 10000,
      holdings: {},
      startValue: 10000,
      joinedAt: Date.now(),
      trades: 0,
    }
    storeSet(`arena:portfolio:${wallet}`, portfolio)

    const wallets = storeGet<string[]>('arena:wallets') ?? []
    if (!wallets.includes(wallet)) {
      wallets.push(wallet)
      storeSet('arena:wallets', wallets)
    }

    const lb = buildLeaderboard()
    storeSet('arena:leaderboard:weekly', lb)
    storeSet('arena:leaderboard:monthly', lb)

    return NextResponse.json({ ok: true, portfolio })
  }

  if (action === 'trade') {
    const { tokenSymbol, tokenAddress, tradeType, usdcAmount } = body
    if (!tokenSymbol || !tokenAddress || !tradeType || usdcAmount == null) {
      return NextResponse.json({ error: 'missing trade params' }, { status: 400 })
    }

    const portfolio = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    if (!portfolio) return NextResponse.json({ error: 'join arena first' }, { status: 400 })

    // Fetch live price
    let livePrice = 0
    try {
      const r = await fetch(`${GT}/simple/networks/base/token_price/${tokenAddress}`, { headers: GT_H })
      const d = (await r.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } }
      livePrice = parseFloat(d.data?.attributes?.token_prices?.[tokenAddress.toLowerCase()] ?? '0')
    } catch {
      return NextResponse.json({ error: 'price unavailable — try again' }, { status: 503 })
    }

    if (!livePrice || livePrice === 0) {
      return NextResponse.json({ error: 'token price not available on GeckoTerminal' }, { status: 400 })
    }

    const amount = Number(usdcAmount)
    if (isNaN(amount) || amount < 10) {
      return NextResponse.json({ error: 'minimum trade: $10 USDC' }, { status: 400 })
    }

    if (tradeType === 'buy') {
      if (portfolio.usdc < amount) {
        return NextResponse.json(
          { error: `insufficient USDC (have $${portfolio.usdc.toFixed(2)})` },
          { status: 400 },
        )
      }
      const tokensReceived = amount / livePrice
      portfolio.usdc -= amount
      const h = portfolio.holdings[tokenSymbol]
      if (h) {
        const total = h.balance + tokensReceived
        h.avgPrice = (h.balance * h.avgPrice + tokensReceived * livePrice) / total
        h.balance = total
        h.address = tokenAddress
      } else {
        portfolio.holdings[tokenSymbol] = { balance: tokensReceived, avgPrice: livePrice, address: tokenAddress }
      }
    } else if (tradeType === 'sell') {
      const h = portfolio.holdings[tokenSymbol]
      if (!h || h.balance <= 0) {
        return NextResponse.json({ error: `no ${tokenSymbol} to sell` }, { status: 400 })
      }
      const tokensToSell = amount / livePrice
      if (tokensToSell > h.balance * 1.0001) {
        return NextResponse.json({ error: 'insufficient token balance' }, { status: 400 })
      }
      h.balance = Math.max(0, h.balance - tokensToSell)
      portfolio.usdc += amount
      if (h.balance < 0.000001) delete portfolio.holdings[tokenSymbol]
    }

    portfolio.trades++
    storeSet(`arena:portfolio:${wallet}`, portfolio)

    const trades = storeGet<TradeRecord[]>(`arena:trades:${wallet}`) ?? []
    trades.unshift({
      id: `t_${Date.now()}`,
      tokenSymbol,
      tradeType,
      usdcAmount: amount,
      price: livePrice,
      tokensAmount: amount / livePrice,
      timestamp: Date.now(),
    })
    storeSet(`arena:trades:${wallet}`, trades.slice(0, 50))

    const lb = buildLeaderboard()
    storeSet('arena:leaderboard:weekly', lb)
    storeSet('arena:leaderboard:monthly', lb)

    return NextResponse.json({
      ok: true,
      trade: { tokenSymbol, tradeType, usdcAmount: amount, price: livePrice, tokensAmount: amount / livePrice },
      portfolio,
    })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
