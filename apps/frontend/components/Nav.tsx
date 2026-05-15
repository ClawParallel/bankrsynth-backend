'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import WalletButton from './WalletButton'

const modules = [
  { href: '/launch',   label: 'LAUNCH',   icon: '◈' },
  { href: '/agent',    label: 'AGENT',    icon: '⬡' },
  { href: '/synth',    label: 'SYNTH',    icon: '◉' },
  { href: '/repos',    label: 'REPOS',    icon: '⬢' },
  { href: '/swarm',    label: 'SWARM',    icon: '⬟' },
  { href: '/terminal', label: 'TERMINAL', icon: '▶' },
  { href: '/intel',    label: 'INTEL',    icon: '◎' },
]

export default function Nav() {
  const path = usePathname()
  const [clock, setClock] = useState('--:--:--')
  const [blockNum, setBlockNum] = useState(19847301)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000)
    const b = setInterval(() => setBlockNum(n => n + 1), 12400)
    return () => { clearInterval(t); clearInterval(b) }
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [path])

  return (
    <>
      <nav className="nav-bar">
        <Link href="/" className="no-underline flex-shrink-0">
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(12px,1.8vw,18px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px var(--green)' }}>BANKR</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(12px,1.8vw,18px)', letterSpacing: '0.2em', color: 'var(--red)', textShadow: '0 0 20px var(--red)' }}>SYNTH</span>
            <div className="hide-mobile" style={{ fontSize: '8px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em', marginTop: '1px' }}>
              AI-NATIVE AUTONOMOUS TERMINAL ◆ NODE: 0xF4a9
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center" style={{ gap: '2px', flexWrap: 'nowrap' }}>
          {modules.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="no-underline">
              <button className={`mode-btn ${path === href ? 'active' : ''}`}
                style={{ fontSize: '9px', padding: '4px 8px', letterSpacing: '0.1em' }}>
                {icon} {label}
              </button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hide-mobile flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            <div className="flex items-center gap-1.5">
              <div className="status-dot" />
              <span style={{ color: 'rgba(0,255,65,0.5)', fontSize: '9px' }}>LIVE</span>
            </div>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>│</span>
            <span style={{ color: 'rgba(0,255,65,0.6)', fontSize: '9px' }}>{clock}</span>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>│</span>
            <span style={{ color: 'rgba(0,200,255,0.5)', fontSize: '9px' }}>#{blockNum.toLocaleString()}</span>
          </div>

          <WalletButton />

          {/* Mobile hamburger */}
          <button className="sm:hidden flex flex-col p-1" onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', gap: '4px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: i === 1 ? '14px' : '18px', height: '2px', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', transition: 'all 0.2s' }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="fixed sm:hidden" style={{ top: '56px', left: 0, right: 0, zIndex: 50, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid rgba(0,255,65,0.15)', backdropFilter: 'blur(12px)', maxHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(0,255,65,0.08)' }}>
            {modules.map(({ href, label, icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="no-underline">
                <div style={{
                  padding: '16px 16px',
                  fontSize: '11px', letterSpacing: '0.15em',
                  fontFamily: 'var(--font-mono)',
                  color: path === href ? 'var(--green)' : 'rgba(0,255,65,0.45)',
                  borderLeft: path === href ? '2px solid var(--green)' : '2px solid transparent',
                  borderBottom: '1px solid rgba(0,255,65,0.06)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  <span>{label}</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ padding: '10px 16px', fontSize: '9px', color: 'rgba(0,255,65,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            ◉ {clock} │ BLK #{blockNum.toLocaleString()}
          </div>
        </div>
      )}
    </>
  )
}
