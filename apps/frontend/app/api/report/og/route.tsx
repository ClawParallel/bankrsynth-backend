import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get('token') ?? 'TOKEN'

  // Fetch token data directly from GeckoTerminal (no internal fetch)
  const GT = 'https://api.geckoterminal.com/api/v2'
  const GT_H = { Accept: 'application/json;version=20230302' }

  let symbol = tokenId.toUpperCase()
  let price = 0
  let change = 0
  let mcap = 0
  let verdict = 'WATCH'
  let verdictColor = '#ffb000'

  try {
    const isAddress = tokenId.startsWith('0x')
    if (isAddress) {
      const r = await fetch(`${GT}/networks/base/tokens/${tokenId}?include=top_pools`, { headers: GT_H })
      if (r.ok) {
        const d = await r.json() as { data?: { attributes?: Record<string, unknown> }; included?: Array<{ attributes?: Record<string, unknown> }> }
        const t = d.data?.attributes ?? {}
        const pool = d.included?.[0]?.attributes ?? {}
        symbol = String(t.symbol ?? tokenId).toUpperCase()
        price = parseFloat(String(pool.base_token_price_usd ?? '0'))
        const pc = (pool.price_change_percentage as Record<string, string> | undefined) ?? {}
        change = parseFloat(pc.h24 ?? '0')
        mcap = parseFloat(String(t.fdv_usd ?? pool.fdv_usd ?? '0'))
      }
    } else {
      const r = await fetch(`${GT}/networks/base/trending_pools?include=base_token&page=1`, { headers: GT_H })
      if (r.ok) {
        const d = await r.json() as { data?: Array<Record<string, unknown>>; included?: Array<Record<string, unknown>> }
        const pools = d.data ?? []
        const included = d.included ?? []
        const tokenMap: Record<string, Record<string, unknown>> = {}
        for (const item of included) {
          if (item.type === 'token' && item.id) tokenMap[String(item.id)] = (item.attributes as Record<string, unknown>) ?? {}
        }
        const match = pools.find(p => {
          const rel = p.relationships as Record<string, Record<string, Record<string, string>>> | undefined
          const ti = tokenMap[rel?.base_token?.data?.id ?? ''] ?? {}
          return String(ti.symbol ?? '').toUpperCase() === tokenId.toUpperCase()
        })
        if (match) {
          const rel = match.relationships as Record<string, Record<string, Record<string, string>>> | undefined
          const ti = tokenMap[rel?.base_token?.data?.id ?? ''] ?? {}
          const a = (match.attributes as Record<string, unknown>) ?? {}
          symbol = String(ti.symbol ?? '').toUpperCase() || tokenId.toUpperCase()
          price = parseFloat(String(a.base_token_price_usd ?? '0'))
          const pc = (a.price_change_percentage as Record<string, string> | undefined) ?? {}
          change = parseFloat(pc.h24 ?? '0')
          mcap = parseFloat(String(a.market_cap_usd ?? a.fdv_usd ?? '0'))
        }
      }
    }
  } catch { /* use defaults */ }

  verdictColor = verdict === 'ACCUMULATE' ? '#00ff41' : verdict === 'AVOID' ? '#ff3355' : '#ffb000'

  const fmtMcap = (n: number) => {
    if (!n) return 'N/A'
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
    return '$' + n.toFixed(0)
  }

  const priceStr = price > 0
    ? price < 0.001 ? '$' + price.toPrecision(4)
    : price < 1 ? '$' + price.toFixed(6)
    : '$' + price.toFixed(4)
    : '—'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#010a04',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            backgroundImage: 'radial-gradient(circle, #00ff41 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#00ff41', display: 'flex' }} />

        {/* Brand */}
        <div style={{ color: '#1a5c2e', fontSize: '13px', letterSpacing: '4px', marginBottom: '28px', display: 'flex' }}>
          BANKRSYNTH INTELLIGENCE REPORT · synthterminal.app
        </div>

        {/* Token + price row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '28px', marginBottom: '14px' }}>
          <div style={{ fontSize: '88px', fontWeight: 900, color: '#ffffff', lineHeight: 1, display: 'flex' }}>
            ${symbol}
          </div>
          <div style={{ fontSize: '44px', color: change >= 0 ? '#00ff41' : '#ff3355', marginBottom: '10px', display: 'flex' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>

        {/* Price + chain */}
        <div style={{ fontSize: '22px', color: '#00c032', marginBottom: '28px', display: 'flex', gap: '20px' }}>
          <span>{priceStr}</span>
          <span style={{ color: '#1a5c2e' }}>·</span>
          <span>MCap {fmtMcap(mcap)}</span>
          <span style={{ color: '#1a5c2e' }}>·</span>
          <span style={{ color: '#1a5c2e' }}>Base Mainnet</span>
        </div>

        {/* Verdict badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: `${verdictColor}18`,
            border: `2px solid ${verdictColor}`,
            padding: '14px 28px',
            width: 'fit-content',
            marginBottom: '28px',
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: verdictColor, display: 'flex' }} />
          <div style={{ color: verdictColor, fontSize: '26px', fontWeight: 700, letterSpacing: '4px', display: 'flex' }}>
            {verdict}
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { label: '24H CHANGE', value: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, color: change >= 0 ? '#00ff41' : '#ff3355' },
            { label: 'AI VERDICT', value: verdict, color: verdictColor },
            { label: 'NETWORK', value: 'BASE', color: '#00c032' },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: '#1a5c2e', letterSpacing: '2px', display: 'flex' }}>{m.label}</div>
              <div style={{ fontSize: '16px', color: m.color, fontWeight: 700, display: 'flex' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '48px',
            right: '48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#1a5c2e', fontSize: '12px', letterSpacing: '2px', display: 'flex' }}>
            Generated by BankrSynth · AI Intelligence Layer for Base
          </div>
          <div style={{ color: '#00ff41', fontSize: '12px', letterSpacing: '2px', display: 'flex' }}>
            synthterminal.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
