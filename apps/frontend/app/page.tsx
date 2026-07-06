'use client'
import dynamic from 'next/dynamic'

const CryptoSphere = dynamic(() => import('@/components/CryptoSphere'), { ssr: false })

export default function Home() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: '56px', overflow: 'hidden' }}>
      {/* Full-screen 3D token-cloud visualization */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
        <CryptoSphere mode="sphere" />
      </div>

      {/* Brand footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          textAlign: 'center',
          padding: '10px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.15em',
          color: 'rgba(0,255,65,0.3)',
          pointerEvents: 'none',
        }}
      >
        SynthVirtual · synthterminal.app · $SYNTH · Built on Base · Launched on Virtuals Protocol
      </div>
    </div>
  )
}
