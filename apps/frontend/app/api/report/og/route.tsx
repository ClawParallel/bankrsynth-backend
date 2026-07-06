import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token    = searchParams.get('token')    || 'TOKEN'
  const symbol   = searchParams.get('symbol')   || token.toUpperCase()
  const price    = searchParams.get('price')    || '0'
  const change   = parseFloat(searchParams.get('change') || '0')
  const verdict  = searchParams.get('verdict')  || 'WATCH'
  const analysis = searchParams.get('analysis') || ''

  const verdictColor = verdict === 'ACCUMULATE' ? '#00ff41'
    : verdict === 'AVOID'      ? '#ff3355'
    : '#ffb000'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: '#010a04',
          display: 'flex', flexDirection: 'column',
          padding: '48px', fontFamily: 'monospace',
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1,
          backgroundImage: 'radial-gradient(circle, #00ff41 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          display: 'flex',
        }} />

        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#00ff41', display: 'flex' }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <svg width="36" height="36" viewBox="0 0 200 200" style={{ display: 'flex' }}>
            <circle cx="100" cy="100" r="88" fill="none" stroke="#00ff41" strokeWidth="6" />
            <path d="M54 56 L100 146 L146 56" fill="none" stroke="#00ff41" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="100" cy="160" r="6" fill="#00ff41" />
          </svg>
          <div style={{ color: '#1a4a28', fontSize: '13px', letterSpacing: '4px', display: 'flex' }}>
            SYNTHVIRTUAL INTELLIGENCE REPORT
          </div>
        </div>

        {/* Symbol + change */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '8px' }}>
          <div style={{ fontSize: '80px', fontWeight: 900, color: '#fff', lineHeight: 1, display: 'flex' }}>
            ${symbol}
          </div>
          <div style={{ fontSize: '40px', color: change >= 0 ? '#00ff41' : '#ff3355', marginBottom: '8px', display: 'flex' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>

        {/* Price */}
        <div style={{ fontSize: '22px', color: '#00c032', marginBottom: '24px', display: 'flex' }}>
          ${price} · Base Mainnet
        </div>

        {/* Verdict badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: `${verdictColor}18`,
          border: `2px solid ${verdictColor}`,
          padding: '14px 24px', width: 'fit-content', marginBottom: '24px',
        }}>
          <div style={{ color: verdictColor, fontSize: '26px', fontWeight: 700, letterSpacing: '4px', display: 'flex' }}>
            {verdict}
          </div>
        </div>

        {/* Analysis snippet */}
        {analysis && (
          <div style={{ color: '#1a4a28', fontSize: '15px', lineHeight: 1.6, maxWidth: '900px', display: 'flex' }}>
            {analysis.slice(0, 220)}{analysis.length > 220 ? '...' : ''}
          </div>
        )}

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: '24px', left: '48px', right: '48px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <div style={{ color: '#1a4a28', fontSize: '11px', letterSpacing: '2px', display: 'flex' }}>
            SynthVirtual · $SYNTH · Launched on Virtuals Protocol
          </div>
          <div style={{ color: '#00ff41', fontSize: '11px', letterSpacing: '2px', display: 'flex' }}>
            synthterminal.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
