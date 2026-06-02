'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import BYOKModal from './BYOKModal'
import { loadBYOK, PROVIDERS, getFreeUsage, FREE_LIMIT, type BYOKConfig } from '@/lib/byok'

const modules = [
  { href: '/synth',    label: 'SYNTH',    icon: '◉' },
  { href: '/intel',    label: 'INTEL',    icon: '◎' },
  { href: '/terminal', label: 'TERMINAL', icon: '▶' },
  { href: '/arena',    label: 'ARENA',    icon: '⚔' },
  { href: '/swarm',    label: 'SWARM',    icon: '⬟' },
  { href: '/repos',    label: 'REPOS',    icon: '⬢' },
]

export default function Nav() {
  const path = usePathname()
  const [clock, setClock] = useState('--:--:--')
  const [blockNum, setBlockNum] = useState(19847301)
  const [menuOpen, setMenuOpen] = useState(false)
  const [byok, setBYOK] = useState<BYOKConfig | null>(null)
  const [showBYOK, setShowBYOK] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState(FREE_LIMIT)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000)
    const b = setInterval(() => setBlockNum(n => n + 1), 12400)
    return () => { clearInterval(t); clearInterval(b) }
  }, [])

  useEffect(() => {
    const update = () => {
      setBYOK(loadBYOK())
      setFreeRemaining(getFreeUsage().remaining)
    }
    update()
    const t = setInterval(update, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [path])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

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
                style={{ fontSize: '9px', padding: '4px 8px', letterSpacing: '0.1em', minHeight: 'unset' }}>
                {icon} {label}
              </button>
            </Link>
          ))}
        </div>

        <div className="nav-right">
          {/* Live clock / block — desktop only */}
          <div className="hide-mobile flex items-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', gap: '6px', marginRight: '2px' }}>
            <div className="flex items-center gap-1.5">
              <div className="status-dot" />
              <span style={{ color: 'rgba(0,255,65,0.5)', fontSize: '9px' }}>LIVE</span>
            </div>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>│</span>
            <span style={{ color: 'rgba(0,200,255,0.5)', fontSize: '9px' }}>#{blockNum.toLocaleString()}</span>
          </div>

          {/* Free counter / provider badge */}
          <span
            className="free-counter hide-mobile"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: byok ? 'rgba(0,255,65,0.6)' : freeRemaining > 0 ? 'rgba(0,255,65,0.45)' : 'rgba(255,165,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: byok ? 'var(--green)' : freeRemaining > 0 ? 'rgba(0,255,65,0.5)' : 'rgba(255,165,0,0.8)', boxShadow: byok ? '0 0 6px var(--green)' : 'none', flexShrink: 0 }} />
            {byok
              ? (PROVIDERS[byok.provider]?.label?.split(' ')[0] ?? 'KEY')
              : freeRemaining > 0
                ? `free (${freeRemaining}/${FREE_LIMIT})`
                : 'limit reached'}
          </span>

          {/* API key button */}
          <button
            className="api-key-btn hide-mobile"
            onClick={() => setShowBYOK(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(0,255,65,0.45)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              padding: '4px 6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,255,65,0.45)')}
          >
            ⚙ api key
          </button>

          {/* Connect wallet */}
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              if (!mounted) return null
              if (!account) return (
                <button onClick={openConnectModal} className="wallet-btn">
                  connect wallet
                </button>
              )
              return (
                <button onClick={openAccountModal} className="wallet-btn connected">
                  <span className="wallet-dot" />
                  {chain?.name && chain.name !== 'Base' && (
                    <span className="chain-name">{chain.name} ·</span>
                  )}
                  {account.displayName}
                </button>
              )
            }}
          </ConnectButton.Custom>

          {/* Mobile hamburger */}
          <button
            className={`sm:hidden flex flex-col ${menuOpen ? 'hamburger-open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', gap: '4px', padding: '8px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
            <span className="hamburger-bar" style={{ width: '18px' }} />
            <span className="hamburger-bar" style={{ width: '14px' }} />
            <span className="hamburger-bar" style={{ width: '18px' }} />
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        className={`mobile-drawer-backdrop sm:hidden ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Holographic slide-out drawer */}
      <div className={`mobile-drawer sm:hidden ${menuOpen ? 'open' : ''}`} role="navigation">
        {/* Drawer header */}
        <div className="mobile-drawer-header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '14px', letterSpacing: '0.2em' }}>
              <span style={{ color: 'var(--green)', textShadow: '0 0 20px var(--green)' }}>BANKR</span>
              <span style={{ color: 'var(--red)', textShadow: '0 0 20px var(--red)' }}>SYNTH</span>
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(0,255,65,0.3)', letterSpacing: '0.15em', marginTop: '3px' }}>
              ◉ {clock} │ BLK #{blockNum.toLocaleString()}
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: 'none', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.6)', cursor: 'pointer', padding: '6px 10px', fontSize: '12px', borderRadius: '2px', minHeight: '36px' }}>
            ✕
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1 }}>
          {modules.map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`mobile-drawer-nav-item ${path === href ? 'active' : ''}`}>
              <span className="drawer-glyph" style={{ color: path === href ? 'var(--green)' : 'rgba(0,255,65,0.4)' }}>{icon}</span>
              <span className="drawer-label">{label}</span>
              {path === href && (
                <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.15em' }}>● ACTIVE</span>
              )}
            </Link>
          ))}
        </div>

        {/* Drawer footer */}
        <div className="mobile-drawer-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div className="status-dot" style={{ width: '6px', height: '6px' }} />
            <span>NODE: 0xF4a9 — BASE MAINNET</span>
          </div>
          <div style={{ color: 'rgba(0,255,65,0.2)' }}>AI-NATIVE AUTONOMOUS TERMINAL</div>
        </div>
      </div>
      {showBYOK && (
        <BYOKModal onClose={() => { setShowBYOK(false); setBYOK(loadBYOK()) }} />
      )}
    </>
  )
}
