import { NextRequest, NextResponse } from 'next/server'

const MIROSHARK_URL = process.env.MIROSHARK_URL

export async function POST(req: NextRequest) {
  const { document: doc, agentCount = 100, turns = 20, tokenSymbol } = (await req.json()) as {
    document: string
    agentCount?: number
    turns?: number
    tokenSymbol?: string
  }

  if (!MIROSHARK_URL) {
    return NextResponse.json({
      status: 'unavailable',
      message: 'MiroShark not configured. Deploy at github.com/aaronjmars/MiroShark',
      convictionBoost: 0,
    })
  }

  try {
    const res = await fetch(`${MIROSHARK_URL}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: doc,
        config: { agentCount, turns, smartModel: 'claude-sonnet-4-5' },
      }),
    })
    if (!res.ok) throw new Error('MiroShark error')
    const { simulationId } = (await res.json()) as { simulationId: string }
    return NextResponse.json({ simulationId, status: 'running', tokenSymbol })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'MiroShark error'
    return NextResponse.json({ status: 'error', message: msg, convictionBoost: 0 })
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id || !MIROSHARK_URL) {
    return NextResponse.json({ status: 'unavailable' })
  }

  try {
    const r = await fetch(`${MIROSHARK_URL}/api/simulate/${id}/report`)
    if (!r.ok) return NextResponse.json({ status: 'pending' })
    const report = (await r.json()) as {
      viralProbability?: number
      sentimentCurve?: number[]
    }
    const viralScore = report.viralProbability ?? 0.5
    return NextResponse.json({
      status: 'complete',
      viralProbability: viralScore,
      convictionBoost: Math.round(viralScore * 15),
      sentimentPeak: Math.max(...(report.sentimentCurve ?? [50])),
      report,
    })
  } catch {
    return NextResponse.json({ status: 'pending' })
  }
}
