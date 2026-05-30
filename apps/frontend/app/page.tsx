'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import MiniChart from '@/components/ui/MiniChart'
import TerminalLog from '@/components/ui/TerminalLog'
import TxStream from '@/components/ui/TxStream'
import AiMetrics from '@/components/ui/AiMetrics'
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

function fmtP(n: number | undefined): string {
  if (!n || !isFinite(n)) return '...'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  return '$' + n.toFixed(2)
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('sphere')
  const { blockNumber, loading: blockLoading } = useLiveBlockNumber()
  const market = useLiveMarket()

  const statsBar = [
    {
      num: market?.totalMcap ? fmtP(market.totalMcap) : '...',
      label: 'TOTAL MKT CAP',
      color: 'var(--green)',
    },
    {
      num: market?.vol24h ? fmtP(market.vol24h) : '...',
      label: '24H VOLUME',
      color: 'var(--red)',
    },
    {
      num: market?.btcDominance ? market.btcDominance.toFixed(1) + '%' : '...',
      label: 'BTC DOMINANCE',
      color: 'var(--green)',
    },
    {
      num: blockLoading ? '...' : '#' + blockNumber.toLocaleString(),
      label: 'BASE BLOCK',
      color: 'var(--cyan)',
    },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: '56px', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <CryptoSphere mode={mode} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none', padding: '12px 16px' }}>
        <div className="hide-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', pointerEvents: 'all', marginBottom: '12px' }}>
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

        {/* Center CTA + feature cards */}
        <div className="hide-mobile" style={{ position: 'absolute', left: '50%', top: '80px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', pointerEvents: 'all', zIndex: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.5)' }}>5 free syntheses/day · no wallet needed</div>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', marginTop: '2px' }}>Groq API key for unlimited · BYOK always free</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { icon: '◉', title: 'SYNTH', sub: 'AI thesis · narrative · analyze', href: '/synth' },
              { icon: '◎', title: 'INTEL', sub: 'macro context · market brief', href: '/intel' },
              { icon: '▶', title: 'TERMINAL', sub: 'all commands · live data', href: '/terminal' },
            ].map(c => (
              <a key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '10px 14px', background: 'rgba(0,8,2,0.7)', border: '1px solid rgba(0,255,65,0.2)', backdropFilter: 'blur(4px)', width: '140px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,255,65,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,255,65,0.2)')}>
                  <div style={{ fontSize: '14px', color: 'var(--green)', marginBottom: '4px' }}>{c.icon} {c.title}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', lineHeight: 1.4 }}>{c.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'all', gap: '12px' }}>
          <div className="hide-mobile" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="glass-panel">
              <div className="corner corner-tl" /><div className="corner corner-br" />
              <div className="panel-title">WALLET CORE</div>
              <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', marginBottom: '8px', animation: 'addrShift 4s infinite', fontFamily: 'var(--font-mono)' }}>0x7F3a...B92c</div>
              <div className="metric-row"><span className="metric-label">ETH BAL</span><span className="metric-val">14.2931</span></div>
              <div className="metric-row"><span className="metric-label">cmETH</span><span className="metric-val red">891.44</span></div>
              <div className="metric-row"><span className="metric-label">SOL</span><span className="metric-val gold">203.17</span></div>
              <div className="metric-row"><span className="metric-label">USD VAL</span><span className="metric-val cyan">$47,291</span></div>
              <MiniChart />
            </div>

            <div className="glass-panel">
              <div className="corner corner-tl" />
              <div className="panel-title">AI SYSTEM METRICS</div>
              <AiMetrics />
            </div>

            <div className="glass-panel">
              <div className="panel-title">SYS LOG</div>
              <TerminalLog />
            </div>
          </div>

          <div className="hide-mobile" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="glass-panel red-panel">
              <div className="corner corner-tl" style={{ borderColor: 'rgba(255,26,60,0.4)' }} />
              <div className="panel-title red">cmETH CRYSTAL CORE</div>
              <div className="metric-row"><span className="metric-label">PRICE</span><span className="metric-val red">$2,847.33</span></div>
              <div className="metric-row"><span className="metric-label">24H</span><span className="metric-val">+4.7%</span></div>
              <div className="metric-row"><span className="metric-label">ENERGY</span><span className="metric-val red">91.4 THz</span></div>
              <div className="metric-row"><span className="metric-label">SHARDS</span><span className="metric-val red">1,337</span></div>
              <MiniChart isRed />
              <div className="prog-wrap">
                <div className="prog-label"><span>CRYSTAL RESONANCE</span><span>91%</span></div>
                <div className="prog-track"><div className="prog-fill red-fill" style={{ width: '91%' }} /></div>
              </div>
            </div>

            <div className="glass-panel">
              <div className="panel-title">NETWORK</div>
              <div className="metric-row"><span className="metric-label">PEERS</span><span className="metric-val">2,847</span></div>
              <div className="metric-row"><span className="metric-label">TPS</span><span className="metric-val cyan">4,193</span></div>
              <div className="metric-row"><span className="metric-label">LATENCY</span><span className="metric-val">12ms</span></div>
            </div>

            <div className="glass-panel">
              <div className="panel-title">TX STREAM</div>
              <TxStream />
            </div>
          </div>
        </div>
      </div>

      {/* Live stats bar */}
      <div className="home-stats-bar" style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'min(700px, 90vw)', zIndex: 10 }}>
        <div className="glass-panel">
          <div className="home-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
            {statsBar.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(12px,1.8vw,18px)', fontWeight: 700, color: s.color, textShadow: `0 0 20px ${s.color}` }}>{s.num}</div>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden" style={{ padding: '12px', paddingBottom: '100px', zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
              style={{ fontSize: '9px', padding: '8px 10px', minHeight: 'unset', flex: '1', minWidth: '60px' }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div className="glass-panel">
            <div className="panel-title" style={{ marginBottom: '6px' }}>MARKET</div>
            <div className="metric-row"><span className="metric-label">MCAP</span><span className="metric-val" style={{ fontSize: '10px' }}>{market?.totalMcap ? fmtP(market.totalMcap) : '...'}</span></div>
            <div className="metric-row"><span className="metric-label">BTC DOM</span><span className="metric-val cyan" style={{ fontSize: '10px' }}>{market?.btcDominance ? market.btcDominance.toFixed(1) + '%' : '...'}</span></div>
            <div className="metric-row"><span className="metric-label">BLOCK</span><span className="metric-val" style={{ fontSize: '10px' }}>#{blockLoading ? '...' : blockNumber.toLocaleString()}</span></div>
          </div>
          <div className="glass-panel red-panel">
            <div className="corner corner-tl" style={{ borderColor: 'rgba(255,26,60,0.4)' }} />
            <div className="panel-title red" style={{ marginBottom: '6px' }}>cmETH</div>
            <div className="metric-row"><span className="metric-label">PRICE</span><span className="metric-val red" style={{ fontSize: '11px' }}>$2,847</span></div>
            <div className="metric-row"><span className="metric-label">24H</span><span className="metric-val" style={{ fontSize: '11px' }}>+4.7%</span></div>
            <div className="metric-row"><span className="metric-label">ENERGY</span><span className="metric-val red" style={{ fontSize: '11px' }}>91 THz</span></div>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-title">SYS LOG</div>
          <TerminalLog maxLines={6} />
        </div>
      </div>
    </div>
  )
}
