'use client'
export default function LaunchError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-wrapper" style={{ padding: '80px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', gap: '12px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(255,26,60,0.5)' }}>// LAUNCH ERROR</div>
      <div style={{ fontSize: '12px', color: '#ff4466', maxWidth: '400px', textAlign: 'center' }}>{error.message}</div>
      <button onClick={reset} style={{ background: 'none', border: '1px solid rgba(0,255,65,0.3)', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 16px', cursor: 'pointer', letterSpacing: '0.15em' }}>↺ RETRY</button>
    </main>
  )
}
