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
    </div>
  )
}
