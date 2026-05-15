'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import WalletButton from './WalletButton'

const modules = [
  { href: '/launch', label: 'LAUNCH', icon: '◈' },
  { href: '/agent', label: 'AGENT', icon: '⬡' },
  { href: '/terminal', label: 'TERMINAL', icon: '◉' },
  { href: '/intel', label: 'INTEL', icon: '◎' },
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

  return (
    <>
      <nav className="nav-bar">
        <Link href="/" className="no-underline flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(14px,2vw,20px)', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px var(--green)' }}>
              BANKR
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(14px,2vw,20px)', letterSpacing: '0.2em', color: 'var(--red)', textShadow: '0 0 20px var(--red)' }}>
              SYNTH
            </span>
            <div className="hide-mobile" style={{ fontSize: '8px', color: 'rgba(0,255,65,0.4)', letterSpacing: '0.2em', marginTop: '2px' }}>
              DECENTRALIZED COMMAND INTERFACE ◆ NODE: 0xF4a9
            </div>
          </div>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {modules.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="no-underline">
              <button
                className={`mode-btn ${path === href ? 'active' : ''}`}
                style={{ fontSize: '10px', padding: '4px 12px' }}
              >
                {icon} {label}
              </button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hide-mobile flex items-center gap-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <div className="flex items-center gap-1.5">
              <div className="status-dot" />
              <span style={{ color: 'rgba(0,255,65,0.5)' }}>LIVE</span>
            </div>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>│</span>
            <span style={{ color: 'rgba(0,255,65,0.6)' }}>{clock}</span>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>│</span>
            <span style={{ color: 'rgba(0,200,255,0.5)', fontSize: '10px' }}>BLK #{blockNum.toLocaleString()}</span>
          </div>

          <WalletButton />

          <button
            className="sm:hidden flex flex-col gap-[4px] p-1 group"
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block',
                width: i === 1 ? '14px' : '18px',
                height: '2px',
                background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
                transition: 'width 0.2s, box-shadow 0.2s',
              }} />
            ))}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed sm:hidden z-50" style={{ top: '56px', left: 0, right: 0, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid rgba(0,255,65,0.2)', backdropFilter: 'blur(12px)' }}>
          {modules.map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="no-underline">
              <div style={{
                padding: '14px 20px',
                fontSize: '11px',
                letterSpacing: '0.2em',
                fontFamily: 'var(--font-mono)',
                color: path === href ? 'var(--green)' : 'rgba(0,255,65,0.45)',
                borderLeft: path === href ? '2px solid var(--green)' : '2px solid transparent',
                borderBottom: '1px solid rgba(0,255,65,0.08)',
              }}>
                {icon} {label}
              </div>
            </Link>
          ))}
          <div style={{ padding: '12px 20px', fontSize: '10px', color: 'rgba(0,255,65,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}>
            <span style={{ color: 'rgba(0,255,65,0.5)' }}>◉ {clock}</span>
            {'  '}BLK #{blockNum.toLocaleString()}
          </div>
        </div>
      )}
    </>
  )
}
