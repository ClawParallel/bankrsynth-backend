'use client'
import { useEffect, useState } from 'react'

const DEFAULT_BARS = [
  { label: 'NEURAL', value: 87 },
  { label: 'SYNAPSE', value: 63 },
  { label: 'QUANTUM', value: 94 },
  { label: 'ENTROPY', value: 41 },
  { label: 'MESH', value: 78 },
]

export default function AiMetrics({ bars = DEFAULT_BARS }: { bars?: { label: string; value: number }[] }) {
  const [vals, setVals] = useState(bars.map(b => b.value))

  useEffect(() => {
    const t = setInterval(() => {
      setVals(prev => prev.map(v => Math.max(10, Math.min(99, v + (Math.random() - 0.5) * 12))))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      {bars.map((b, i) => (
        <div key={b.label} className="ai-bar-row">
          <span className="ai-bar-label">{b.label}</span>
          <div className="ai-bar-track">
            <div className="ai-bar-fill" style={{ width: `${vals[i]}%`, transition: 'width 2s' }} />
          </div>
          <span className="ai-bar-val">{Math.round(vals[i])}%</span>
        </div>
      ))}
    </div>
  )
}
