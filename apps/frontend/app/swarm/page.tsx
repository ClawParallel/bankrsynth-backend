'use client'
import { useState, useEffect } from 'react'

interface Agent {
  id: number
  name: string
  status: 'ACTIVE' | 'STANDBY'
  role: string
}

interface Task {
  id: string
  text: string
  ts: number
  status: 'queued' | 'triggered' | 'error'
  message?: string
}

const AGENTS: Agent[] = [
  { id: 1,  name: 'Scan Agent',      status: 'ACTIVE',   role: 'trending_base monitoring · GeckoTerminal' },
  { id: 2,  name: 'Narrative Agent', status: 'ACTIVE',   role: 'narrative_scan · meta detection · Aeon' },
  { id: 3,  name: 'Thesis Agent',    status: 'ACTIVE',   role: 'alpha_generation · long/short picks' },
  { id: 4,  name: 'Sentiment Agent', status: 'ACTIVE',   role: 'LunarCrush v4 · Galaxy Score · social feed' },
  { id: 5,  name: 'Swap Agent',      status: 'STANDBY',  role: 'awaiting signal · handoff to BankrBot' },
  { id: 6,  name: 'Monitor Agent',   status: 'ACTIVE',   role: 'on_chain_watch · whale detection · Base' },
  { id: 7,  name: 'Analysis Agent',  status: 'ACTIVE',   role: 'vol/mcap ratio · liquidity depth · on-chain' },
  { id: 8,  name: 'Social Agent',    status: 'ACTIVE',   role: 'X/Twitter · Reddit · Polymarket signals' },
  { id: 9,  name: 'Repos Agent',     status: 'ACTIVE',   role: 'gitlawb health · push notifications' },
  { id: 10, name: 'Intel Agent',     status: 'ACTIVE',   role: 'macro: BTC dominance · fear/greed · regime' },
  { id: 11, name: 'Alert Agent',     status: 'ACTIVE',   role: 'threshold alerts · cross-chain signals' },
  { id: 12, name: 'Swarm Agent',     status: 'ACTIVE',   role: 'orchestration · inter-agent coordination' },
]

const TASK_SKILLS: Record<string, string> = {
  'narrative': 'narrative-tracker',
  'alert': 'token-alert',
  'monitor': 'on-chain-monitor',
  'defi': 'defi-monitor',
  'report': 'token-report',
  'market': 'market-context-refresh',
  'brief': 'morning-brief',
  'wallet': 'wallet-digest',
}

function detectSkill(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [key, skill] of Object.entries(TASK_SKILLS)) {
    if (lower.includes(key)) return skill
  }
  return null
}

const MIROSHARK_CONFIGURED = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_MIROSHARK_URL

export default function SwarmPage() {
  const [taskInput, setTaskInput] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bsynth_tasks')
      if (saved) setTasks(JSON.parse(saved) as Task[])
    } catch {
      // ignore localStorage errors
    }
  }, [])

  function persistTasks(t: Task[]) {
    setTasks(t)
    try { localStorage.setItem('bsynth_tasks', JSON.stringify(t.slice(0, 20))) } catch { /* ignore */ }
  }

  async function deployTask() {
    if (!taskInput.trim() || deploying) return
    setDeploying(true)

    const skill = detectSkill(taskInput)
    const newTask: Task = {
      id: Date.now().toString(),
      text: taskInput.trim(),
      ts: Date.now(),
      status: 'queued',
    }
    persistTasks([newTask, ...tasks])
    setTaskInput('')

    if (skill) {
      try {
        const r = await fetch('/api/aeon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill, payload: { task: taskInput.trim() } }),
        })
        const d = (await r.json()) as { status?: string; message?: string }
        persistTasks([{ ...newTask, status: d.status === 'triggered' ? 'triggered' : 'error', message: d.message }, ...tasks])
      } catch {
        persistTasks([{ ...newTask, status: 'error', message: 'network error' }, ...tasks])
      }
    } else {
      persistTasks([{ ...newTask, status: 'triggered', message: 'Connecting to swarm... task queued' }, ...tasks])
    }

    setDeploying(false)
  }

  const activeCount = AGENTS.filter((a) => a.status === 'ACTIVE').length

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 48px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>BANKRSYNTH://</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,3vw,22px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)', marginTop: '4px' }}>
            ⬢ AI SWARM — AUTONOMOUS AGENT ORCHESTRATION
          </h1>
        </div>

        {/* Telemetry bar */}
        <div className="glass-panel" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '20px 32px' }}>
          <div className="corner corner-tl" />
          {[
            { label: 'ACTIVE AGENTS', value: `${activeCount}/${AGENTS.length}`, color: 'var(--green)' },
            { label: 'STANDBY', value: AGENTS.filter((a) => a.status === 'STANDBY').length.toString(), color: 'var(--gold)' },
            { label: 'TASKS DEPLOYED', value: tasks.length.toString(), color: 'var(--cyan)' },
            { label: 'SWARM STATUS', value: 'ONLINE', color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.35)', marginBottom: '2px' }}>{label}</p>
              <p style={{ fontSize: '18px', fontFamily: 'var(--font-display)', color, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Agent grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {AGENTS.map((agent, i) => {
            const isActive = agent.status === 'ACTIVE'
            const color = isActive ? 'var(--green)' : 'var(--gold)'
            return (
              <div
                key={agent.id}
                className="glass-panel"
                style={{ border: `1px solid ${isActive ? 'rgba(0,255,65,0.2)' : 'rgba(255,215,0,0.15)'}`, padding: '12px' }}
              >
                <div className="corner corner-tl" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color, fontFamily: 'var(--font-display)' }}>{agent.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: color,
                        boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                        animation: isActive ? 'pulse 2s infinite' : 'none',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                    <span style={{ fontSize: '8px', color, letterSpacing: '0.15em' }}>{agent.status}</span>
                  </div>
                </div>
                <p style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)', lineHeight: 1.5 }}>{agent.role}</p>
              </div>
            )
          })}
        </div>

        {/* Task deployment panel */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <div className="corner corner-tl" />
          <div className="panel-title">◈ DEPLOY TASK</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && deployTask()}
              placeholder="Deploy a task in plain English... (e.g. 'narrative scan for AI tokens')"
              style={{ flex: 1, background: 'rgba(0,10,3,0.9)', border: '1px solid rgba(0,255,65,0.25)', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px 10px', outline: 'none' }}
            />
            <button
              onClick={deployTask}
              disabled={deploying || !taskInput.trim()}
              style={{ padding: '8px 16px', background: taskInput.trim() ? 'rgba(0,255,65,0.06)' : 'transparent', border: `1px solid ${taskInput.trim() ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.15)'}`, color: taskInput.trim() ? 'var(--green)' : 'rgba(0,255,65,0.3)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', cursor: taskInput.trim() ? 'pointer' : 'not-allowed' }}
            >
              {deploying ? '...' : 'DEPLOY'}
            </button>
          </div>
          <p style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)' }}>
            Keywords auto-routed to Aeon: narrative · alert · monitor · defi · report · market · brief · wallet
          </p>

          {tasks.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(0,255,65,0.08)', paddingTop: '10px' }}>
              <p style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(0,255,65,0.35)', marginBottom: '6px' }}>RECENT TASKS</p>
              {tasks.slice(0, 8).map((t) => (
                <div key={t.id} style={{ display: 'flex', gap: '10px', fontSize: '10px', padding: '4px 0', borderBottom: '1px solid rgba(0,255,65,0.04)', alignItems: 'flex-start' }}>
                  <span style={{ color: 'rgba(0,255,65,0.25)', flexShrink: 0, fontSize: '9px' }}>{new Date(t.ts).toLocaleTimeString()}</span>
                  <span
                    style={{
                      padding: '1px 5px', fontSize: '8px', letterSpacing: '0.1em', flexShrink: 0,
                      border: `1px solid ${t.status === 'triggered' ? 'rgba(0,255,65,0.3)' : t.status === 'error' ? 'rgba(255,60,60,0.3)' : 'rgba(255,215,0,0.3)'}`,
                      color: t.status === 'triggered' ? 'var(--green)' : t.status === 'error' ? '#ff4466' : 'var(--gold)',
                    }}
                  >
                    {t.status.toUpperCase()}
                  </span>
                  <span style={{ color: 'rgba(0,255,65,0.6)' }}>{t.text}</span>
                  {t.message && <span style={{ color: 'rgba(0,255,65,0.3)', marginLeft: 'auto', fontSize: '9px', flexShrink: 0 }}>{t.message}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MiroShark section */}
        <div className="glass-panel">
          <div className="corner corner-tl" />
          <div className="panel-title">◈ MIROSHARK — SWARM SIMULATION</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(0,255,65,0.7)', marginBottom: '4px' }}>200 AI agents · narrative stress test</p>
              <p style={{ fontSize: '10px', color: 'rgba(0,255,65,0.4)' }}>Multi-agent conviction scoring for any token narrative</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span
                style={{
                  padding: '3px 10px', fontSize: '9px', letterSpacing: '0.15em',
                  border: `1px solid ${MIROSHARK_CONFIGURED ? 'rgba(0,255,65,0.3)' : 'rgba(255,60,60,0.3)'}`,
                  color: MIROSHARK_CONFIGURED ? 'var(--green)' : '#ff4466',
                }}
              >
                {MIROSHARK_CONFIGURED ? '● AVAILABLE' : '● OFFLINE'}
              </span>
              {!MIROSHARK_CONFIGURED && (
                <a
                  href="https://github.com/aaronjmars/MiroShark"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '9px', color: 'rgba(0,200,255,0.5)', textDecoration: 'none' }}
                >
                  Connect at github.com/aaronjmars/MiroShark →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
