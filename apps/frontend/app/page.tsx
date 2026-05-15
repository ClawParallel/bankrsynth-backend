'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import MiniChart from '@/components/ui/MiniChart'
import TerminalLog from '@/components/ui/TerminalLog'
import TxStream from '@/components/ui/TxStream'
import AiMetrics from '@/components/ui/AiMetrics'

const CryptoSphere = dynamic(() => import('@/components/CryptoSphere'), { ssr: false })

type Mode = 'sphere' | 'helix' | 'grid' | 'network' | 'terminal'
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'sphere', label: 'SPHERE', icon: '◉' },
  { key: 'helix', label: 'HELIX', icon: '⌬' },
  { key: 'grid', label: 'GRID', icon: '⊞' },
  { key: 'network', label: 'NETWORK', icon: '⬡' },
  { key: 'terminal', label: 'TERMINAL', icon: '▸' },
]

export default function Home() {
  const [mode, setMode] = useState<Mode>('sphere')

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: '56px', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <CryptoSphere mode={mode} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', pointerEvents: 'all', marginBottom: '12px' }}>
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

      <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'min(700px, 90vw)', zIndex: 10 }}>
        <div className="glass-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
            {[
              { num: '$2.91T', label: 'TOTAL MKT CAP', color: 'var(--green)' },
              { num: '$847B', label: '24H VOLUME', color: 'var(--red)' },
              { num: '52.4%', label: 'BTC DOMINANCE', color: 'var(--green)' },
              { num: '74', label: 'FEAR & GREED', color: 'var(--cyan)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(14px,2vw,20px)', fontWeight: 700, color: s.color, textShadow: `0 0 20px ${s.color}` }}>{s.num}</div>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sm:hidden" style={{ padding: '16px', zIndex: 10, position: 'relative' }}>
        <div className="glass-panel" style={{ marginBottom: '12px' }}>
          <div className="panel-title">SYSTEM STATUS</div>
          <div className="metric-row"><span className="metric-label">BASE NETWORK</span><span className="metric-val">ONLINE</span></div>
          <div className="metric-row"><span className="metric-label">AGENT</span><span className="metric-val cyan">ACTIVE</span></div>
          <div className="metric-row"><span className="metric-label">TPS</span><span className="metric-val">4,193</span></div>
        </div>
        <div className="glass-panel">
          <div className="panel-title">SYS LOG</div>
          <TerminalLog maxLines={5} />
        </div>
      </div>
    </div>
  )
}
