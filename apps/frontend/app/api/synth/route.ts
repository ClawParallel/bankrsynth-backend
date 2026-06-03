import { NextRequest, NextResponse } from 'next/server'

// Two payment modes only:
//   No wallet → 5 free synthesis/day (per IP) · Haiku · owner pays
//   Wallet    → $0.10 USDC.e x402 (ERC-3009, gasless) · Sonnet 4.5 · user pays
const rateLimitMap = new Map<string, number>()
const MAX_FREE_PER_DAY = 5

const USDC_SKALE_BASE = '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20'
const X402_NETWORK = 'eip155:1187947933'
const X402_PRICE = '100000' // $0.10 USDC.e (6 decimals)
const FACILITATOR = process.env.SKALE_FACILITATOR_URL || 'https://facilitator.skale.space'

// x402 PaymentRequirements for this resource. `extra.{name,version}` tells the
// facilitator the EIP-712 domain of the asset — must match the on-chain
// USDC.e values ("Bridged USDC (SKALE Bridge)" / "1") and the client's signed
// domain, or signature recovery in /verify will fail.
const PAYMENT_REQUIREMENTS = {
  scheme: 'exact',
  network: X402_NETWORK,
  asset: USDC_SKALE_BASE,
  maxAmountRequired: X402_PRICE,
  resource: `${process.env.NEXT_PUBLIC_BASE_URL}/api/synth`,
  description: 'BankrSynth AI Synthesis · $0.10 USDC.e',
  mimeType: 'application/json',
  payTo: process.env.SKALE_PAYMENT_RECIPIENT || '',
  maxTimeoutSeconds: 300,
  extra: {
    name: 'Bridged USDC (SKALE Bridge)',
    version: '1',
  },
}

const SYSTEM_PROMPT = `You are BankrSynth — an AI intelligence synthesis engine for Base ecosystem tokens.
You provide structured, concise market analysis for crypto traders.
Be direct, technical, and opinionated. No hedging. No disclaimers.
Write in plain text only — no markdown headers, no bullet symbols, no asterisks.`

const PROMPTS = {
  analyze: (ctx: string) =>
    `Write a terse fundamental brief for an active trader.
Structure (plain text, labeled):
SIGNAL: What this token is + key on-chain signal (vol/mcap ratio, liquidity vs mcap, price action)
RISKS: Top 2 risks (smart money exit, tokenomics, narrative fade, etc)
VERDICT: ACCUMULATE / WATCH / AVOID + one-clause reason
Max 180 words. No markdown.
DATA:\n${ctx}`,

  narrative: (ctx: string) =>
    `Write a tight narrative strength read.
Structure (plain text, labeled):
NARRATIVE: Bucket classification (AI agents / base meme / defi blue chip / etc)
SENTIMENT: Community signal — alive / dying / rotating + why
CATALYSTS: What could move it (or lack thereof)
GRADE: S / A / B / C / D + one-clause reason
Max 180 words. No markdown.
DATA:\n${ctx}`,

  thesis: (ctx: string) =>
    `Write an alpha thesis memo for a degen trader.
Structure (plain text, each section on new line):
THE TRADE: long/short/avoid + timeframe in one sentence
ENTRY: specific price zone or trigger condition
EXIT: target price + invalidation level
CATALYSTS: 1-3 things that could move it
CONVICTION: low/medium/high + one-clause reason scored 0-100
Max 200 words. No markdown.
DATA:\n${ctx}`,
}

function decodePayment(paymentHeader: string): unknown {
  // X-PAYMENT is the base64-encoded x402 PaymentPayload.
  return JSON.parse(atob(paymentHeader))
}

async function verifyX402(paymentHeader: string): Promise<boolean> {
  try {
    const paymentPayload = decodePayment(paymentHeader)
    const res = await fetch(`${FACILITATOR}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentPayload, paymentRequirements: PAYMENT_REQUIREMENTS }),
    })
    const text = await res.text()
    console.log('[x402] verify status:', res.status)
    console.log('[x402] verify response:', text)
    const data = JSON.parse(text) as { isValid?: boolean; invalidReason?: string }
    return data.isValid === true // NOTE: facilitator returns `isValid`, not `valid`
  } catch (e) {
    console.error('[x402] verify error:', e)
    return false
  }
}

async function settle(paymentHeader: string): Promise<void> {
  try {
    const paymentPayload = decodePayment(paymentHeader)
    const res = await fetch(`${FACILITATOR}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentPayload, paymentRequirements: PAYMENT_REQUIREMENTS }),
    })
    console.log('[x402] settle status:', res.status)
    console.log('[x402] settle response:', await res.text())
  } catch (e) {
    // settlement is best-effort; analysis already returned
    console.error('[x402] settle error:', e)
  }
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Anthropic ${res.status}`)
  return (data.content as Array<{ type: string; text: string }>)
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const fallbackKey = process.env.ANTHROPIC_FALLBACK_KEY
  if (!fallbackKey) {
    return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  }

  const body = await req.json()
  const {
    mode,
    tokenSymbol,
    tokenName,
    priceUsd = 0,
    change24h = 0,
    change1h = 0,
    volume24h = 0,
    marketCap = 0,
    liquidity = 0,
    chain = 'base',
    address,
  } = body as {
    mode: string
    tokenSymbol: string
    tokenName?: string
    priceUsd?: number
    change24h?: number
    change1h?: number
    volume24h?: number
    marketCap?: number
    liquidity?: number
    chain?: string
    address?: string
  }

  if (!['analyze', 'narrative', 'thesis'].includes(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
  }
  if (!tokenSymbol) {
    return NextResponse.json({ error: 'tokenSymbol required' }, { status: 400 })
  }

  // ── Resolve payment mode ────────────────────────────────────────────────────
  const x402 = req.headers.get('X-PAYMENT')
  let model = 'claude-haiku-4-5-20251001'
  let isPaid = false

  if (x402) {
    const valid = await verifyX402(x402)
    if (!valid) {
      return NextResponse.json(
        { error: 'payment_required', paymentRequirements: PAYMENT_REQUIREMENTS },
        { status: 402, headers: { 'X-Payment-Required': JSON.stringify(PAYMENT_REQUIREMENTS) } },
      )
    }
    model = 'claude-sonnet-4-5'
    isPaid = true
  } else {
    const ip = clientIp(req)
    const today = new Date().toISOString().split('T')[0]
    const rlKey = `rl:${ip}:${today}`
    const count = rateLimitMap.get(rlKey) || 0

    if (count >= MAX_FREE_PER_DAY) {
      return NextResponse.json(
        {
          error: `Free limit reached (${MAX_FREE_PER_DAY}/day). Connect wallet to pay $0.10 USDC.`,
          x402Required: true,
          remaining: 0,
        },
        { status: 429 },
      )
    }
    rateLimitMap.set(rlKey, count + 1)
  }

  // ── Macro context ───────────────────────────────────────────────────────────
  let macroCtx = ''
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/global', {
      next: { revalidate: 300 },
    })
    if (cgRes.ok) {
      const d = (await cgRes.json()).data
      const btcDom = (d.market_cap_percentage?.btc as number | undefined)?.toFixed(1) ?? '?'
      const mcap = ((d.total_market_cap?.usd as number) / 1e12).toFixed(2)
      const vol = ((d.total_volume?.usd as number) / 1e9).toFixed(0)
      macroCtx = `\nMACRO: total_mcap=$${mcap}T, vol24h=$${vol}B, btc_dominance=${btcDom}%`
    }
  } catch {
    // non-critical: continue without macro context
  }

  const fmtP = (n: number) => {
    if (!n || !isFinite(n)) return '$0'
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
    if (n >= 1) return '$' + n.toFixed(4)
    return '$' + n.toPrecision(4)
  }
  const fmtC = (n: number) => (n >= 0 ? '+' : '') + (n?.toFixed(2) ?? '0') + '%'

  const ctx = [
    `Token: ${tokenSymbol}${tokenName && tokenName !== tokenSymbol ? ` (${tokenName})` : ''}`,
    `Chain: ${chain}${address ? ` · CA: ${address.slice(0, 6)}...${address.slice(-4)}` : ''}`,
    `Price: ${fmtP(priceUsd)}`,
    `24h change: ${fmtC(change24h)}`,
    `1h change: ${fmtC(change1h)}`,
    `24h volume: ${fmtP(volume24h)}`,
    `Market cap / FDV: ${fmtP(marketCap)}`,
    `Pool liquidity: ${fmtP(liquidity)}`,
    `Vol/MCap ratio: ${marketCap > 0 ? ((volume24h / marketCap) * 100).toFixed(1) + '%' : 'n/a'}`,
    macroCtx,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = PROMPTS[mode as keyof typeof PROMPTS](ctx)

  // ── Synthesize ──────────────────────────────────────────────────────────────
  try {
    const analysis = await callAnthropic(fallbackKey, model, prompt)
    if (!analysis) {
      return NextResponse.json({ error: 'empty response' }, { status: 500 })
    }

    // Settle the payment only after a successful synthesis.
    if (isPaid && x402) await settle(x402)

    let remaining: number | null = null
    if (!isPaid) {
      const ip = clientIp(req)
      const today = new Date().toISOString().split('T')[0]
      const used = rateLimitMap.get(`rl:${ip}:${today}`) || 0
      remaining = Math.max(0, MAX_FREE_PER_DAY - used)
    }

    return NextResponse.json({
      analysis,
      mode,
      symbol: tokenSymbol,
      model,
      isPaid,
      cost: isPaid ? '$0.10 USDC · SKALE Base · gasless' : 'free',
      remaining,
      timestamp: Date.now(),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'synthesis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
