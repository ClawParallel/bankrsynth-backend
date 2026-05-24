import { NextRequest, NextResponse } from 'next/server'

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

async function callOpenAICompat(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl: string,
  provider: string,
): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://bankrsynth.com'
    headers['X-Title'] = 'BankrSynth'
  }
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `${provider} ${res.status}`)
  return (data.choices?.[0]?.message?.content as string | undefined)?.trim() ?? ''
}

async function callGoogle(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Google ${res.status}`)
  return (
    (data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined)?.trim() ?? ''
  )
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key')
  const provider = req.headers.get('X-Provider') || 'anthropic'
  const model = req.headers.get('X-Model') || 'claude-sonnet-4-5'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'No API key. Configure your key in Settings (top right).' },
      { status: 401 },
    )
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

  try {
    let analysis = ''
    const baseUrls: Record<string, string> = {
      openai: 'https://api.openai.com',
      groq: 'https://api.groq.com/openai',
      xai: 'https://api.x.ai',
      openrouter: 'https://openrouter.ai/api',
    }

    if (provider === 'anthropic') {
      analysis = await callAnthropic(apiKey, model, prompt)
    } else if (provider === 'google') {
      analysis = await callGoogle(apiKey, model, prompt)
    } else if (baseUrls[provider]) {
      analysis = await callOpenAICompat(apiKey, model, prompt, baseUrls[provider], provider)
    } else {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Empty response from LLM' }, { status: 500 })
    }

    return NextResponse.json({
      analysis,
      mode,
      symbol: tokenSymbol,
      provider,
      model,
      timestamp: Date.now(),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'synthesis failed'
    const isAuthError =
      msg.includes('401') ||
      msg.toLowerCase().includes('invalid') ||
      msg.toLowerCase().includes('api key') ||
      msg.toLowerCase().includes('unauthorized')
    return NextResponse.json(
      { error: isAuthError ? 'Invalid API key — check your key in Settings.' : msg },
      { status: isAuthError ? 401 : 500 },
    )
  }
}
