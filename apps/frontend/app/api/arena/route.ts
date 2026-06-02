import { NextRequest, NextResponse } from 'next/server'
import { kv_get, kv_set } from '@/lib/redis'

const GT = 'https://api.geckoterminal.com/api/v2'
const GT_H = { Accept: 'application/json;version=20230302' }
const STARTING_CAPITAL = 10000
const MIN_TRADE = 10

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
  joinedAt: number
  trades: number
}

interface TradeRecord {
  id: string
  tokenSymbol: string
  tokenAddress: string
  tradeType: 'buy' | 'sell'
  usdcAmount: number
  tokensAmount: number
  price: number
  timestamp: number
}

interface LeaderboardEntry {
  wallet: string
  displayName: string
  currentValue: number
  startValue: number
  pnlPercent: number
  pnlUsd: number
  trades: number
  rank: number
}

async function getLivePrice(address: string): Promise<number> {
  const r = await fetch(
    `${GT}/simple/networks/base/token_price/${address}`,
    { headers: GT_H },
  )
  const d = (await r.json()) as { data?: { attributes?: { token_prices?: Record<string, string> } } }
  return parseFloat(d.data?.attributes?.token_prices?.[address.toLowerCase()] ?? '0')
}

async function getPortfolioValue(portfolio: Portfolio): Promise<number> {
  let total = portfolio.usdc
  for (const holding of Object.values(portfolio.holdings)) {
    if (holding.balance <= 0 || !holding.address) continue
    try {
      const price = await getLivePrice(holding.address)
      total += holding.balance * (price || holding.avgPrice)
    } catch {
      total += holding.balance * holding.avgPrice
    }
  }
  return total
}

function getResetInfo(period: 'weekly' | 'monthly') {
  const now = new Date()
  if (period === 'weekly') {
    const day = now.getUTCDay()
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7
    const next = new Date(now)
    next.setUTCDate(now.getUTCDate() + daysUntilMonday)
    next.setUTCHours(0, 0, 0, 0)
    return { nextReset: next.toISOString(), msUntilReset: next.getTime() - now.getTime() }
  }
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { nextReset: nextMonth.toISOString(), msUntilReset: nextMonth.getTime() - now.getTime() }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const wallet = searchParams.get('wallet')
  const period = (searchParams.get('period') ?? 'weekly') as 'weekly' | 'monthly'

  if (action === 'portfolio' && wallet) {
    const portfolio = await kv_get<Portfolio>(`arena:portfolio:${wallet}`)
    if (!portfolio) return NextResponse.json(null)
    const currentValue = await getPortfolioValue(portfolio)
    return NextResponse.json({ ...portfolio, currentValue })
  }

  if (action === 'leaderboard') {
    const lb = (await kv_get<LeaderboardEntry[]>(`arena:leaderboard:${period}`)) ?? []
    return NextResponse.json({ leaderboard: lb, period, ...getResetInfo(period) })
  }

  if (action === 'trades' && wallet) {
    const trades = (await kv_get<TradeRecord[]>(`arena:trades:${wallet}`)) ?? []
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
    const existing = await kv_get(`arena:portfolio:${wallet}`)
    if (existing) return NextResponse.json({ error: 'already joined' }, { status: 400 })

    const portfolio: Portfolio = {
      wallet,
      usdc: STARTING_CAPITAL,
      holdings: {},
      startValue: STARTING_CAPITAL,
      joinedAt: Date.now(),
      trades: 0,
    }
    await kv_set(`arena:portfolio:${wallet}`, portfolio)

    const participants = (await kv_get<string[]>('arena:participants')) ?? []
    if (!participants.includes(wallet)) {
      participants.push(wallet)
      await kv_set('arena:participants', participants)
    }

    return NextResponse.json({ ok: true, portfolio })
  }

  if (action === 'trade') {
    const { tokenSymbol, tokenAddress, tradeType, usdcAmount } = body
    if (!tokenSymbol || !tokenAddress || !tradeType || usdcAmount == null) {
      return NextResponse.json({ error: 'missing trade params' }, { status: 400 })
    }

    const portfolio = await kv_get<Portfolio>(`arena:portfolio:${wallet}`)
    if (!portfolio) return NextResponse.json({ error: 'join arena first' }, { status: 400 })

    let livePrice = 0
    try {
      livePrice = await getLivePrice(tokenAddress)
    } catch {
      return NextResponse.json({ error: 'price unavailable — try again' }, { status: 503 })
    }
    if (!livePrice) return NextResponse.json({ error: 'token price not available on GeckoTerminal' }, { status: 400 })

    const amount = Number(usdcAmount)
    if (isNaN(amount) || amount < MIN_TRADE) {
      return NextResponse.json({ error: `minimum trade: $${MIN_TRADE} USDC` }, { status: 400 })
    }

    if (tradeType === 'buy') {
      if (portfolio.usdc < amount) {
        return NextResponse.json(
          { error: `insufficient USDC ($${portfolio.usdc.toFixed(2)} available)` },
          { status: 400 },
        )
      }
      const tokensReceived = amount / livePrice
      portfolio.usdc -= amount
      const h = portfolio.holdings[tokenSymbol]
      if (h) {
        const totalCost = h.balance * h.avgPrice + amount
        h.balance += tokensReceived
        h.avgPrice = totalCost / h.balance
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
        return NextResponse.json(
          { error: `insufficient ${tokenSymbol} (have ${h.balance.toFixed(4)})` },
          { status: 400 },
        )
      }
      h.balance = Math.max(0, h.balance - tokensToSell)
      portfolio.usdc += amount
      if (h.balance < 0.000001) delete portfolio.holdings[tokenSymbol]
    }

    portfolio.trades++
    await kv_set(`arena:portfolio:${wallet}`, portfolio)

    const trades = (await kv_get<TradeRecord[]>(`arena:trades:${wallet}`)) ?? []
    trades.unshift({
      id: `t_${Date.now()}`,
      tokenSymbol,
      tokenAddress,
      tradeType,
      usdcAmount: amount,
      tokensAmount: amount / livePrice,
      price: livePrice,
      timestamp: Date.now(),
    })
    await kv_set(`arena:trades:${wallet}`, trades.slice(0, 100))

    return NextResponse.json({
      ok: true,
      trade: { tokenSymbol, tradeType, usdcAmount: amount, price: livePrice, tokensReceived: amount / livePrice },
      portfolio,
    })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
