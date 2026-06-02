'use client'
import { useEffect, useState } from 'react'
import { useAccount, useDisconnect, useSignMessage, useChainId } from 'wagmi'

const KEY = (addr: string) => `bsynth_verified_${addr.toLowerCase()}`

function buildMessage(address: string, chainId: number, nonce: string, issuedAt: string): string {
  const domain = typeof window !== 'undefined' ? window.location.host : 'synthterminal.app'
  const uri = typeof window !== 'undefined' ? window.location.origin : 'https://synthterminal.app'
  return [
    `${domain} wants you to verify wallet ownership:`,
    address,
    '',
    'Sign to securely access BankrSynth. This is a read-only signature — it does NOT trigger a transaction, move funds, or cost any gas.',
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

export default function WalletAuthGate() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()

  const [need, setNeed] = useState(false)
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (isConnected && address) {
      let verified = false
      try { verified = !!localStorage.getItem(KEY(address)) } catch {}
      setNeed(!verified)
      setErr('')
    } else {
      setNeed(false)
      setErr('')
    }
  }, [isConnected, address])

  async function verify() {
    if (!address) return
    setPending(true)
    setErr('')
    try {
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36)
      const issuedAt = new Date().toISOString()
      const message = buildMessage(address, chainId, nonce, issuedAt)
      const signature = await signMessageAsync({ message })

      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
      })
      const d = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'verification failed')

      try { localStorage.setItem(KEY(address), JSON.stringify({ at: issuedAt, signature })) } catch {}
      setNeed(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'verification failed'
      setErr(/reject|denied/i.test(msg) ? 'Signature rejected — please sign to continue' : msg.slice(0, 120))
    }
    setPending(false)
  }

  if (!need || !address) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,4,1,0.9)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          background: 'rgba(0,12,4,0.96)',
          border: '1px solid rgba(0,255,65,0.3)',
          boxShadow: '0 0 40px rgba(0,255,65,0.12)',
          padding: '22px',
        }}
      >
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(0,255,65,0.4)' }}>BANKRSYNTH://</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--green)', textShadow: '0 0 16px rgba(0,255,65,0.4)', marginTop: '6px' }}>
          ◈ VERIFY WALLET
        </h2>

        <p style={{ fontSize: '11px', color: 'rgba(0,255,65,0.6)', lineHeight: 1.7, marginTop: '12px' }}>
          Sign a message to verify you own this wallet and securely unlock BankrSynth.
        </p>

        <div style={{ marginTop: '10px', padding: '8px 10px', border: '1px solid rgba(0,255,65,0.12)', background: 'rgba(0,255,65,0.03)', fontSize: '10px', color: 'rgba(0,255,65,0.5)', lineHeight: 1.7 }}>
          <div>✓ Read-only — no blockchain transaction</div>
          <div>✓ Cannot move funds or spend tokens</div>
          <div>✓ Zero gas cost</div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '10px', color: 'rgba(0,255,65,0.4)', fontFamily: 'var(--font-mono)' }}>
          {address.slice(0, 10)}...{address.slice(-8)}
        </div>

        {err && (
          <div style={{ marginTop: '10px', fontSize: '10px', color: '#ff4466' }}>✗ {err}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={verify} disabled={pending} className="neon-btn" style={{ flex: 2, fontSize: '11px' }}>
            {pending ? '◈ AWAITING SIGNATURE...' : '◈ SIGN & VERIFY'}
          </button>
          <button
            onClick={() => disconnect()}
            disabled={pending}
            style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,26,60,0.3)', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            DISCONNECT
          </button>
        </div>
      </div>
    </div>
  )
}
