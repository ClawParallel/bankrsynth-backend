'use client'
import { useState } from 'react'

const SKILLS = [
  { id: 'narrative-tracker', name: 'Narrative Tracker', icon: '◈', desc: 'FRONT-RUN / RIDE / FADE signals' },
  { id: 'token-alert',       name: 'Token Alert',       icon: '⚡', desc: 'anomaly detection on Base' },
  { id: 'defi-monitor',      name: 'DeFi Monitor',      icon: '⬡', desc: 'pool health · rug risk · TVL' },
  { id: 'on-chain-monitor',  name: 'On-Chain Monitor',  icon: '🔍', desc: 'whale flows · smart money' },
  { id: 'market-context',    name: 'Market Context',    icon: '📊', desc: 'macro regime · BTC dominance' },
  { id: 'alpha-scanner',     name: 'Alpha Scanner',     icon: '🎯', desc: 'hidden opportunities · early alpha' },
]

export default function SwarmPage() {
  const [results, setResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ranAt, setRanAt] = useState<Record<string, string>>({})

  async function runSkill(skillId: string) {
    setLoading(prev => ({ ...prev, [skillId]: true }))
    setErrors(prev => ({ ...prev, [skillId]: '' }))
    try {
      const r = await fetch('/api/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      })
      const d = (await r.json()) as { result?: string; error?: string }
      if (!r.ok || d.error) throw new Error(d.error ?? 'skill failed')
      setResults(prev => ({ ...prev, [skillId]: d.result ?? '' }))
      setRanAt(prev => ({ ...prev, [skillId]: new Date().toLocaleTimeString() }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [skillId]: e instanceof Error ? e.message : 'failed' }))
    } finally {
      setLoading(prev => ({ ...prev, [skillId]: false }))
    }
  }

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>SYNTHVIRTUAL://</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,3vw,22px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
            ⬟ AGENT SWARM
          </h1>
          <p style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.1em', marginTop: '6px' }}>
            6 autonomous skills · powered by claude-sonnet-4-5 · live Base data
          </p>
        </div>

        {/* Skills grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '14px' }}>
          {SKILLS.map(skill => {
            const isLoading = loading[skill.id]
            const result = results[skill.id]
            const error = errors[skill.id]
            return (
              <div key={skill.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div className="corner corner-tl" />

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{skill.icon}</span>
                  <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em' }}>{skill.name}</span>
                  <button
                    onClick={() => runSkill(skill.id)}
                    disabled={isLoading}
                    style={{
                      padding: '5px 14px',
                      background: isLoading ? 'transparent' : 'rgba(0,255,65,0.06)',
                      border: `1px solid ${isLoading ? 'rgba(0,255,65,0.15)' : 'rgba(0,255,65,0.4)'}`,
                      color: isLoading ? 'rgba(0,255,65,0.4)' : 'var(--green)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.15em',
                      cursor: isLoading ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isLoading ? '● running...' : '▶ RUN'}
                  </button>
                </div>

                <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)', marginBottom: '12px' }}>{skill.desc}</div>

                {isLoading && (
                  <div style={{ fontSize: '10px', color: 'rgba(0,255,65,0.45)', padding: '8px 0' }}>
                    fetching live data → calling claude-sonnet-4-5<span style={{ animation: 'blink 0.7s step-end infinite' }}>...</span>
                  </div>
                )}

                {error && (
                  <div style={{ fontSize: '10px', color: '#ff4466', padding: '8px 0' }}>error: {error}</div>
                )}

                {result && !isLoading && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.15em', marginBottom: '8px' }}>
                      claude-sonnet-4-5 · {ranAt[skill.id]}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(0,255,65,0.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--green)', paddingLeft: '12px' }}>
                      {result}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
