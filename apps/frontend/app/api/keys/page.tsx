'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function KeysPage() {
  const [key, setKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const newKey = `bsynth_${hex}`
    setKey(newKey)
    localStorage.setItem('bsynth_api_key', newKey)
  }

  async function copy() {
    if (!key) return
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // On mount, restore any existing key from this browser.
  useEffect(() => {
    const stored = localStorage.getItem('bsynth_api_key')
    if (stored) setKey(stored)
  }, [])

  return (
    <main className="page-wrapper" style={{ padding: '64px 16px 64px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <div style={{ marginBottom: '8px' }}>
          <Link
            href="/api"
            style={{ fontSize: '10px', color: 'rgba(0,200,255,0.6)', textDecoration: 'none', letterSpacing: '0.1em' }}
          >
            ← /api docs
          </Link>
        </div>

        <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.35)' }}>BANKRSYNTH://API/KEYS</p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(16px,3vw,24px)',
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: 'var(--green)',
            textShadow: '0 0 20px rgba(0,255,65,0.4)',
            marginTop: '6px',
            marginBottom: '8px',
          }}
        >
          // FREE API KEY
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,255,65,0.6)', lineHeight: 1.6, marginBottom: '20px' }}>
          No signup. No email. Click generate.
          <br />
          Get 20 calls/day instead of 3.
        </p>

        {!key ? (
          <button
            onClick={generate}
            className="mode-btn active"
            style={{ fontSize: '12px', padding: '12px 28px', letterSpacing: '0.2em' }}
          >
            GENERATE KEY →
          </button>
        ) : (
          <div className="glass-panel">
            <div className="corner corner-tl" />
            <div className="panel-title">YOUR API KEY</div>
            <div
              style={{
                fontSize: 'clamp(11px,2.6vw,15px)',
                color: 'var(--cyan)',
                letterSpacing: '0.05em',
                wordBreak: 'break-all',
                padding: '12px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(0,200,255,0.2)',
                marginBottom: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {key}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={copy}
                className="mode-btn active"
                style={{ fontSize: '11px', padding: '8px 20px', letterSpacing: '0.2em', minHeight: 'unset' }}
              >
                {copied ? '✓ COPIED' : 'COPY'}
              </button>
              <button
                onClick={generate}
                style={{
                  fontSize: '10px',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(0,255,65,0.2)',
                  color: 'rgba(0,255,65,0.5)',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                generate new key
              </button>
            </div>

            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(0,255,65,0.1)',
                fontSize: '11px',
                color: 'rgba(0,255,65,0.55)',
                lineHeight: 1.7,
              }}
            >
              Add to your requests:
              <div
                style={{
                  marginTop: '6px',
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(0,255,65,0.12)',
                  color: 'var(--gold)',
                  wordBreak: 'break-all',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                X-API-Key: {key}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '10px', color: 'rgba(0,255,65,0.35)', lineHeight: 1.7 }}>
          Key is stored in your browser only (localStorage). It is not registered on any server — it simply unlocks the
          20 calls/day tier when sent in the X-API-Key header.
        </div>
      </div>
    </main>
  )
}
