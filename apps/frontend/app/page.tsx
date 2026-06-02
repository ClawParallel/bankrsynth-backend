'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const CryptoSphere = dynamic(() => import('@/components/CryptoSphere'), { ssr: false })

type Mode = 'sphere' | 'helix' | 'grid' | 'network' | 'terminal'
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'sphere',   label: 'SPHERE',   icon: '◉' },
  { key: 'helix',    label: 'HELIX',    icon: '⌬' },
  { key: 'grid',     label: 'GRID',     icon: '⊞' },
  { key: 'network',  label: 'NETWORK',  icon: '⬡' },
  { key: 'terminal', label: 'TERMINAL', icon: '▸' },
]

export default function Home() {
  const [mode, setMode] = useState<Mode>('sphere')

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: '56px', overflow: 'hidden' }}>
      {/* Full-screen 3D visualization */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <CryptoSphere mode={mode} />
      </div>

      {/* Mode selector tabs — top */}
      <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', pointerEvents: 'all' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
              style={{ fontSize: '10px', padding: '6px 12px' }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
