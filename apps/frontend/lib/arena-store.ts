// Shared in-memory arena store via globalThis — survives hot-reloads, resets on cold start
// For multi-instance production persistence add @vercel/kv + KV_REST_API_URL

const g = globalThis as typeof globalThis & { _arenaStore?: Map<string, unknown> }
if (!g._arenaStore) g._arenaStore = new Map()
export const arenaStore = g._arenaStore

export interface Holding {
  balance: number
  avgPrice: number
  address: string
}

export interface Portfolio {
  wallet: string
  usdc: number
  holdings: Record<string, Holding>
  startValue: number
  joinedAt: number
  trades: number
}

export interface TradeRecord {
  id: string
  tokenSymbol: string
  tradeType: 'buy' | 'sell'
  usdcAmount: number
  price: number
  tokensAmount: number
  timestamp: number
}

export interface LeaderboardEntry {
  wallet: string
  pnlPct: number
  currentValue: number
}

export function storeGet<T>(key: string): T | null {
  return (arenaStore.get(key) as T) ?? null
}

export function storeSet(key: string, value: unknown): void {
  arenaStore.set(key, value)
}

export function calcPortfolioValue(portfolio: Portfolio): number {
  const holdingsValue = Object.values(portfolio.holdings).reduce(
    (sum, h) => sum + h.balance * h.avgPrice,
    0,
  )
  return portfolio.usdc + holdingsValue
}

export function buildLeaderboard(): LeaderboardEntry[] {
  const wallets = storeGet<string[]>('arena:wallets') ?? []
  const entries: LeaderboardEntry[] = wallets.reduce<LeaderboardEntry[]>((acc, wallet) => {
    const p = storeGet<Portfolio>(`arena:portfolio:${wallet}`)
    if (!p) return acc
    const currentValue = calcPortfolioValue(p)
    const pnlPct = ((currentValue - p.startValue) / p.startValue) * 100
    acc.push({ wallet, pnlPct, currentValue })
    return acc
  }, [])
  entries.sort((a, b) => b.pnlPct - a.pnlPct)
  return entries
}
