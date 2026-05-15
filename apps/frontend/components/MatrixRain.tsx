'use client'
import { useEffect, useRef } from 'react'

export default function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*ΩΨΦΞΛΘΣΔαβγ₿◆◇▲▶●○□■'
    let W: number, H: number, cols: number, drops: number[]

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      cols = Math.floor(W / 14)
      drops = Array(cols).fill(1)
    }
    resize()
    window.addEventListener('resize', resize)

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = Math.random() > 0.9 ? '#00ff41' : '#007a1f'
        ctx.font = `${12 + Math.random() * 2}px 'Share Tech Mono', monospace`
        ctx.fillText(ch, i * 14, drops[i] * 14)
        if (drops[i] * 14 > H && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }, 45)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="matrix-canvas" />
}
