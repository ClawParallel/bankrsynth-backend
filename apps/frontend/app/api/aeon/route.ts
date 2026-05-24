import { NextRequest, NextResponse } from 'next/server'

const AEON_REPO = process.env.AEON_GITHUB_REPO
const AEON_TOKEN = process.env.AEON_GITHUB_TOKEN

const VALID_SKILLS = [
  'narrative-tracker',
  'token-alert',
  'on-chain-monitor',
  'defi-monitor',
  'token-report',
  'market-context-refresh',
  'morning-brief',
  'wallet-digest',
]

export async function POST(req: NextRequest) {
  const { skill, payload } = (await req.json()) as { skill: string; payload?: Record<string, unknown> }

  if (!VALID_SKILLS.includes(skill)) {
    return NextResponse.json({ error: `Unknown skill: ${skill}` }, { status: 400 })
  }

  if (!AEON_REPO || !AEON_TOKEN) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Aeon not configured. Set AEON_GITHUB_REPO and AEON_GITHUB_TOKEN.',
    })
  }

  const res = await fetch(`https://api.github.com/repos/${AEON_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `token ${AEON_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: `run-skill-${skill}`,
      client_payload: { skill, ...(payload ?? {}) },
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ status: 'error', message: 'Failed to trigger Aeon' }, { status: 500 })
  }

  return NextResponse.json({
    status: 'triggered',
    skill,
    message: `Aeon ${skill} running. Results in ~2min.`,
  })
}

export async function GET(req: NextRequest) {
  const skill = req.nextUrl.searchParams.get('skill')

  if (!AEON_REPO || !AEON_TOKEN) {
    return NextResponse.json({ output: null, configured: false })
  }

  const today = new Date().toISOString().split('T')[0]
  const res = await fetch(
    `https://api.github.com/repos/${AEON_REPO}/contents/memory/logs/${today}.md`,
    {
      headers: {
        Authorization: `token ${AEON_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  )

  if (!res.ok) return NextResponse.json({ output: null, skill, date: today, configured: true })

  const data = await res.json()
  const content = Buffer.from(data.content as string, 'base64').toString('utf-8')
  return NextResponse.json({ output: content, skill, date: today, configured: true })
}
