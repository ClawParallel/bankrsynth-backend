'use client'
import { useEffect, useState, useCallback } from 'react'

interface Repo {
  name: string
  objects?: number
  nodes?: number
  storage?: string
  signature?: string
  url?: string
  live?: boolean
}

interface NodeStatus {
  online: number
  total: number
  locations?: string[]
}

interface ReposData {
  did?: string
  repos?: Repo[]
  nodeStatus?: NodeStatus
  source?: string
  timestamp?: number
  error?: string
}

export default function ReposPage() {
  const [data, setData] = useState<ReposData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRepos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/repos')
      if (!r.ok) { setError(`Failed to load repos (${r.status})`); setLoading(false); return }
      const d = (await r.json()) as ReposData
      if (d.error) { setError(d.error); setLoading(false); return }
      setData(d)
    } catch {
      setError('Repository API unavailable')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRepos() }, [fetchRepos])

  const isLive = data?.source === 'live'

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>SYNTHVIRTUAL://</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,3vw,22px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
              ◈ GITLAWB — REPO ORCHESTRATION
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {data && (
              <span style={{ fontSize: '9px', padding: '3px 8px', border: `1px solid ${isLive ? 'rgba(0,255,65,0.3)' : 'rgba(255,215,0,0.3)'}`, color: isLive ? 'var(--green)' : 'var(--gold)', letterSpacing: '0.1em' }}>
                {isLive ? '● LIVE' : '● STATIC'}
              </span>
            )}
            <button onClick={fetchRepos} style={{ fontSize: '9px', padding: '5px 12px', background: 'transparent', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.5)', cursor: 'pointer', letterSpacing: '0.15em', fontFamily: 'var(--font-mono)' }}>↺ SYNC</button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '12px', padding: '8px 12px', border: '1px solid rgba(255,60,60,0.3)', color: '#ff4466', fontSize: '11px' }}>✗ {error}</div>
        )}

        {loading && (
          <div className="glass-panel">
            <div className="corner corner-tl" />
            <div className="panel-title">CONNECTING TO GITLAWB</div>
            <p className="muted" style={{ fontSize: '11px' }}>&gt; fetching repository index…</p>
            <span className="cursor-blink" style={{ color: 'var(--green)' }}>_</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* DID panel */}
            {data.did && (
              <div className="glass-panel" style={{ marginBottom: '16px' }}>
                <div className="corner corner-tl" />
                <div className="panel-title">◈ DECENTRALIZED IDENTITY — DID</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(0,255,65,0.45)' }}>DID</span>
                  <span style={{ color: 'var(--cyan)', wordBreak: 'break-all', letterSpacing: '0.04em', fontSize: '10px' }}>{data.did}</span>
                  <span style={{ color: 'rgba(0,255,65,0.45)' }}>SOURCE</span>
                  <span style={{ color: isLive ? 'var(--green)' : 'var(--gold)' }}>{data.source?.toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* Node health */}
            {data.nodeStatus && (
              <div className="glass-panel" style={{ marginBottom: '16px' }}>
                <div className="corner corner-tl" />
                <div className="panel-title">NODE HEALTH</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[...Array(data.nodeStatus.total)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: i < data.nodeStatus!.online ? 'var(--green)' : 'rgba(0,255,65,0.15)',
                          boxShadow: i < data.nodeStatus!.online ? '0 0 8px var(--green)' : 'none',
                          animation: i < data.nodeStatus!.online ? 'pulse 2s infinite' : 'none',
                          animationDelay: `${i * 0.3}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--green)' }}>{data.nodeStatus.online}/{data.nodeStatus.total} online</span>
                  {data.nodeStatus.locations && (
                    <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)' }}>{data.nodeStatus.locations.join(' · ')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Repo cards */}
            {data.repos && data.repos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {data.repos.map((repo, i) => (
                  <div key={i} className="glass-panel">
                    <div className="corner corner-tl" />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>
                          ◈ {repo.name}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite', animationDelay: `${i * 0.5}s` }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '10px', marginBottom: '10px' }}>
                      {repo.objects !== undefined && (
                        <><span style={{ color: 'rgba(0,255,65,0.4)' }}>OBJECTS</span><span>{repo.objects}</span></>
                      )}
                      {repo.nodes !== undefined && (
                        <><span style={{ color: 'rgba(0,255,65,0.4)' }}>NODES</span><span>{repo.nodes}</span></>
                      )}
                      {repo.storage && (
                        <><span style={{ color: 'rgba(0,255,65,0.4)' }}>STORAGE</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ padding: '1px 5px', border: '1px solid rgba(0,200,255,0.3)', color: 'var(--cyan)', fontSize: '8px', letterSpacing: '0.1em' }}>{repo.storage}</span>
                        </span></>
                      )}
                      {repo.signature && (
                        <><span style={{ color: 'rgba(0,255,65,0.4)' }}>SIG</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ padding: '1px 5px', border: '1px solid rgba(255,215,0,0.3)', color: 'var(--gold)', fontSize: '8px', letterSpacing: '0.1em' }}>{repo.signature}</span>
                        </span></>
                      )}
                    </div>

                    {repo.url && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '9px', color: 'rgba(0,200,255,0.5)', wordBreak: 'break-all', textDecoration: 'none', display: 'block', marginBottom: '6px' }}
                      >
                        {repo.url}
                      </a>
                    )}

                    <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', borderTop: '1px solid rgba(0,255,65,0.06)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>IPFS · Ed25519</span>
                      <span style={{ color: 'var(--green)' }}>◈ ONLINE</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
