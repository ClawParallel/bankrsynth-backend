import { NextRequest, NextResponse } from 'next/server'
import { kv_get, kv_set } from '@/lib/redis'

// Public, global leaderboard — always read live from Redis, never cached.
export const dynamic = 'force-dynamic'

// Real-wallet leaderboard. Each trader's value comes from their actual Base
// holdings (computed client-side from Blockscout + GeckoTerminal and posted here).
// P&L% is measured against a baseline snapshot that resets weekly/monthly.

interface Trader {
  wallet: string
  currentValue: number
  weeklyBaseline: number
  weeklyBaselineAt: number
  monthlyBaseline: number
  monthlyBaselineAt: number
  joinedAt: number
  lastSeen: number
}

function weekStartUtc(now: number): number {
  const d = new Date(now)
  const diff = (d.getUTCDay() + 6) % 7 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}
function monthStartUtc(now: number): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}
function short(w: string): string { return `${w.slice(0, 6)}...${w.slice(-4)}` }

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') ?? 'weekly') as 'weekly' | 'monthly'
  const wallets = (await kv_get<string[]>('arena:traders')) ?? []

  const entries = []
  for (const w of wallets) {
    const t = await kv_get<Trader>(`arena:trader:${w}`)
    if (!t) continue
    const baseline = period === 'monthly' ? t.monthlyBaseline : t.weeklyBaseline
    const pnlPercent = baseline > 0 ? ((t.currentValue - baseline) / baseline) * 100 : 0
    entries.push({
      wallet: w,
      displayName: short(w),
      currentValue: t.currentValue,
      pnlPercent,
      rank: 0,
    })
  }

  entries.sort((a, b) => b.pnlPercent - a.pnlPercent)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return NextResponse.json({ leaderboard: entries.slice(0, 100), period, traders: wallets.length })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { action?: string; wallet?: string; value?: number }
  const { action, wallet, value } = body

  if (action === 'register' && wallet && typeof value === 'number' && isFinite(value)) {
    const now = Date.now()
    const ws = weekStartUtc(now)
    const ms = monthStartUtc(now)
    let t = await kv_get<Trader>(`arena:trader:${wallet}`)

    if (!t) {
      t = {
        wallet,
        currentValue: value,
        weeklyBaseline: value,
        weeklyBaselineAt: now,
        monthlyBaseline: value,
        monthlyBaselineAt: now,
        joinedAt: now,
        lastSeen: now,
      }
      const list = (await kv_get<string[]>('arena:traders')) ?? []
      if (!list.includes(wallet)) {
        list.push(wallet)
        await kv_set('arena:traders', list)
      }
    } else {
      // Reset period baseline if the boundary has passed since it was set
      if (t.weeklyBaselineAt < ws || t.weeklyBaseline <= 0) {
        t.weeklyBaseline = value
        t.weeklyBaselineAt = now
      }
      if (t.monthlyBaselineAt < ms || t.monthlyBaseline <= 0) {
        t.monthlyBaseline = value
        t.monthlyBaselineAt = now
      }
      t.currentValue = value
      t.lastSeen = now
    }

    await kv_set(`arena:trader:${wallet}`, t)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
