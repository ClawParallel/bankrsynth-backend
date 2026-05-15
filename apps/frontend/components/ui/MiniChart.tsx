'use client'
import { useEffect, useRef } from 'react'

export default function MiniChart({ isRed = false }: { isRed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const bars = ref.current.querySelectorAll('.chart-bar')
    const update = () => bars.forEach(b => {
      (b as HTMLElement).style.height = `${20 + Math.random() * 80}%`
    })
    update()
    const t = setInterval(update, 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div ref={ref} className="mini-chart">
      {Array.from({ length: 18 }, (_, i) => (
        <div key={i} className={`chart-bar ${isRed ? 'red-bar' : ''}`} style={{ height: `${20 + Math.random() * 80}%` }} />
      ))}
    </div>
  )
}
