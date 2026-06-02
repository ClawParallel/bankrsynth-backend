'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { useLiveBlockNumber, useLiveMarket } from '@/hooks/useLiveData'

const CryptoSphere = dynamic(() => import('@/components/CryptoSphere'), { ssr: false })

type Mode = 'sphere' | 'helix' | 'grid' | 'network' | 'terminal'
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'sphere',   label: 'SPHERE',   icon: '◉' },
  { key: 'helix',    label: 'HELIX',    icon: '⌬' },
  { key: 'grid',     label: 'GRID',     icon: '⊞' },
  { key: 'network',  label: 'NETWORK',  icon: '⬡' },
  { key: 'terminal', label: 'TERMINAL', icon: '▸' },
]

const FEATURE_CARDS = [
  { icon: '▶', title: 'AI TERMINAL', sub: 'Ask anything about Base tokens, markets, DeFi', href: '/terminal', accent: 'var(--green)' },
  { icon: '⚔', title: 'ARENA',      sub: 'Paper trade Base tokens · compete weekly',       href: '/arena',    accent: 'var(--gold)' },
  { icon: '◉', title: 'SYNTH',      sub: 'AI thesis · narrative · fundamental analysis',   href: '/synth',    accent: 'var(--green)' },
  { icon: '◎', title: 'INTEL',      sub: 'Macro context · trending · market brief',        href: '/intel',    accent: 'var(--cyan)' },
]

function fmtMcap(n: number | undefined): string {
  if (!n || !isFinite(n)) return '—'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B'
  return '$' + n.toFixed(2)
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('sphere')
  const { blockNumber, loading: blockLoading } = useLiveBlockNumber()
  const market = useLiveMarket()

  const stats = [
    { num: market?.totalMcap  ? fmtMcap(market.totalMcap)             : '—',   label: 'TOTAL MKT CAP', color: 'var(--green)' },
    { num: market?.vol24h     ? fmtMcap(market.vol24h)                : '—',   label: '24H VOLUME',    color: 'var(--red)'   },
    { num: market?.btcDominance ? market.btcDominance.toFixed(1) + '%' : '—',   label: 'BTC DOM',       color: 'var(--gold)'  },
    { num: blockLoading || !blockNumber ? '—' : '#' + blockNumber.toLocaleString(), label: 'BASE BLOCK', color: 'var(--cyan)' },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: '56px', overflow: 'hidden' }}>
      {/* Full-screen 3D visualization */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <CryptoSphere mode={mode} />
      </div>

      {/* Desktop overlay content */}
      <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px', pointerEvents: 'none' }}>
        {/* Mode buttons — top left */}
        <div className="hide-mobile" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', pointerEvents: 'all', marginBottom: '0' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Centered feature cards */}
        <div
          className="hide-mobile"
          style={{
            position: 'absolute', left: '50%', top: '60px',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            pointerEvents: 'all', zIndex: 20, width: 'min(620px, 90vw)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
            {FEATURE_CARDS.map(c => (
              <Link key={c.href} href={c.href} style={{ textDecoration: 'none', flex: 1 }}>
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(0,6,2,0.75)',
                    border: '1px solid rgba(0,255,65,0.18)',
                    backdropFilter: 'blur(8px)',
                    transition: 'border-color 0.2s, background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,255,65,0.45)'
                    e.currentTarget.style.background = 'rgba(0,12,4,0.85)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,255,65,0.18)'
                    e.currentTarget.style.background = 'rgba(0,6,2,0.75)'
                  }}
                >
                  <div style={{ fontSize: '15px', color: c.accent, marginBottom: '5px', textShadow: `0 0 10px ${c.accent}` }}>
                    {c.icon} <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em' }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', lineHeight: 1.5 }}>{c.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.45)' }}>
              5 free AI syntheses/day · no wallet needed
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', marginTop: '2px' }}>
              Groq API key for unlimited · BYOK always free
            </div>
          </div>
        </div>
      </div>

      {/* Live stats bar — bottom center, always visible */}
      <div
        className="home-stats-bar"
        style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'min(700px, 90vw)', zIndex: 10 }}
      >
        <div className="glass-panel">
          <div
            className="home-stats-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}
          >
            {stats.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(11px,1.8vw,18px)', fontWeight: 700, color: s.color, textShadow: `0 0 16px ${s.color}` }}>
                  {s.num}
                </div>
                <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.38)', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden" style={{ padding: '10px 12px', paddingBottom: '110px', zIndex: 10, position: 'relative' }}>
        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
              style={{ fontSize: '9px', padding: '8px 10px', minHeight: 'unset', flex: '1', minWidth: '58px' }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* 2×2 metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {stats.map(s => (
            <div key={s.label} className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: s.color }}>{s.num}</div>
              <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.38)', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 2×2 feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {FEATURE_CARDS.map(c => (
            <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
              <div className="glass-panel" style={{ padding: '10px', minHeight: '70px' }}>
                <div style={{ fontSize: '11px', color: c.accent, marginBottom: '4px' }}>{c.icon} <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700 }}>{c.title}</span></div>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', lineHeight: 1.4 }}>{c.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
