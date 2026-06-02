'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

type Mode = 'sphere' | 'helix' | 'grid' | 'network' | 'terminal'

interface TokenLite { symbol: string; change: number }

// Used only if the live token API is unreachable — so the cloud is never empty.
const FALLBACK: TokenLite[] = [
  { symbol: 'BNKR', change: 12.4 }, { symbol: 'AERO', change: -3.2 }, { symbol: 'BRETT', change: 8.7 },
  { symbol: 'DEGEN', change: -6.1 }, { symbol: 'TOSHI', change: 21.5 }, { symbol: 'VIRTUAL', change: 4.3 },
  { symbol: 'AIXBT', change: -11.8 }, { symbol: 'AEON', change: 38.5 }, { symbol: 'MORPHO', change: 2.1 },
  { symbol: 'CBBTC', change: 0.4 }, { symbol: 'KEYCAT', change: 54.2 }, { symbol: 'MIGGLES', change: -9.4 },
  { symbol: 'DRB', change: 17.9 }, { symbol: 'MOCHI', change: -22.6 }, { symbol: 'BENJI', change: 6.8 },
  { symbol: 'HIGHER', change: 31.0 }, { symbol: 'NORMIE', change: -14.3 }, { symbol: 'SPEC', change: 9.2 },
  { symbol: 'ORBIT', change: 354.3 }, { symbol: 'BASEETH', change: 0.3 }, { symbol: 'WELL', change: -4.7 },
  { symbol: 'PRIME', change: 5.6 }, { symbol: 'DACKIE', change: -18.1 }, { symbol: 'TYBG', change: 27.4 },
  { symbol: 'ZRO', change: -2.9 }, { symbol: 'OX', change: 13.3 }, { symbol: 'B3', change: 41.7 },
  { symbol: 'CLANKER', change: -7.5 }, { symbol: 'DOGINME', change: 19.8 }, { symbol: 'FAI', change: -5.2 },
]

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function makeCardTexture(symbol: string, change: number): THREE.CanvasTexture {
  const W = 256, H = 112
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const pos = change >= 0
  const color = pos ? '#00ff41' : '#ff2d55'
  const bg = pos ? 'rgba(0,16,6,0.82)' : 'rgba(18,0,5,0.82)'

  ctx.clearRect(0, 0, W, H)

  // Card body + neon border with glow
  const pad = 10
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 22
  ctx.fillStyle = bg
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 8)
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.restore()

  // Ticker
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.fillStyle = '#e8ffee'
  ctx.font = 'bold 38px "Share Tech Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(symbol.slice(0, 8), W / 2, H / 2 - 14)

  // Percentage
  ctx.fillStyle = color
  ctx.shadowBlur = 12
  ctx.font = '30px "Share Tech Mono", monospace'
  const pct = `${pos ? '+' : ''}${change.toFixed(1)}%`
  ctx.fillText(pct, W / 2, H / 2 + 26)

  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

export default function CryptoSphere(_props: { mode?: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const navRef = useRef(router)
  navRef.current = router

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let animId = 0
    const cleanupFns: (() => void)[] = []

    const isMobile = window.innerWidth < 768
    const CARD_COUNT = isMobile ? 130 : 290
    const RADIUS = isMobile ? 150 : 185

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000)
    camera.position.z = isMobile ? 560 : 470

    const group = new THREE.Group()
    scene.add(group)

    // ── Parallax starfield (depth + atmosphere) ──
    const STAR_COUNT = isMobile ? 350 : 700
    const starPos = new Float32Array(STAR_COUNT * 3)
    const starCol = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const phi = Math.acos(-1 + 2 * Math.random())
      const theta = Math.random() * Math.PI * 2
      const r = 700 + Math.random() * 900
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
      const cyan = Math.random() > 0.7
      starCol[i * 3] = cyan ? 0.0 : 0.0
      starCol[i * 3 + 1] = cyan ? 0.9 : 1.0
      starCol[i * 3 + 2] = cyan ? 1.0 : 0.4
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
    const starMat = new THREE.PointsMaterial({ size: 2.4, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
    const starfield = new THREE.Points(starGeo, starMat)
    scene.add(starfield)

    // interaction state
    let isDragging = false, prevX = 0, prevY = 0
    let downX = 0, downY = 0, moved = false
    let manualRotX = 0, manualRotY = 0
    let targetZ = camera.position.z
    let hoveredIdx = -1
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    const sprites: THREE.Sprite[] = []
    const basePos: THREE.Vector3[] = []
    const phases: number[] = []
    const baseScale: { w: number; h: number }[] = []
    const tmp = new THREE.Vector3()

    async function init() {
      // Pull real Base token data so the cloud reflects the live market
      let tokens: TokenLite[] = []
      try {
        const buckets = ['trending', 'high_volume', 'new_launches']
        const lists = await Promise.all(
          buckets.map(b => fetch(`/api/tokens?bucket=${b}`).then(r => r.json()).catch(() => ({}))),
        ) as Array<{ tokens?: Array<{ symbol?: string; change24h?: number }> }>
        const map = new Map<string, TokenLite>()
        for (const l of lists) {
          for (const t of l.tokens ?? []) {
            if (t.symbol && !map.has(t.symbol)) map.set(t.symbol, { symbol: t.symbol, change: t.change24h ?? 0 })
          }
        }
        tokens = [...map.values()]
      } catch { /* fall through */ }
      if (tokens.length < 12) tokens = FALLBACK
      if (disposed) return

      // Cache one texture per unique token symbol; share across duplicate cards.
      const texCache = new Map<string, THREE.CanvasTexture>()
      const getTex = (t: TokenLite) => {
        let tex = texCache.get(t.symbol)
        if (!tex) { tex = makeCardTexture(t.symbol, t.change); texCache.set(t.symbol, tex) }
        return tex
      }

      // Fibonacci sphere distribution with mild jitter for a dense, overlapping cloud
      const golden = Math.PI * (3 - Math.sqrt(5))
      for (let i = 0; i < CARD_COUNT; i++) {
        const t = tokens[i % tokens.length]
        const y = 1 - (i / (CARD_COUNT - 1)) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const theta = golden * i
        const jitter = 0.92 + Math.random() * 0.16
        const rad = RADIUS * jitter
        const px = Math.cos(theta) * r * rad
        const py = y * rad
        const pz = Math.sin(theta) * r * rad

        const mat = new THREE.SpriteMaterial({ map: getTex(t), transparent: true, depthWrite: false, depthTest: true })
        const sprite = new THREE.Sprite(mat)
        // Bigger movers slightly larger — heatmap feel
        const mul = Math.min(1.55, 1 + Math.min(Math.abs(t.change), 300) / 320)
        const w = (isMobile ? 30 : 38) * mul
        const h = w * (112 / 256)
        sprite.scale.set(w, h, 1)
        sprite.position.set(px, py, pz)
        sprite.userData = { symbol: t.symbol }
        group.add(sprite)

        sprites.push(sprite)
        basePos.push(new THREE.Vector3(px, py, pz))
        baseScale.push({ w, h })
        phases.push(Math.random() * Math.PI * 2)
      }

      cleanupFns.push(() => {
        for (const s of sprites) { s.material.dispose() }
        for (const tex of texCache.values()) tex.dispose()
      })
    }

    // ── interaction ──
    function pickSprite(x: number, y: number): THREE.Sprite | null {
      const rect = canvas!.getBoundingClientRect()
      ndc.x = ((x - rect.left) / rect.width) * 2 - 1
      ndc.y = -((y - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(sprites, false)
      return hits.length ? (hits[0].object as THREE.Sprite) : null
    }

    const onDown = (x: number, y: number) => { isDragging = true; prevX = x; prevY = y; downX = x; downY = y; moved = false }
    const onMove = (x: number, y: number) => {
      if (!isDragging) return
      if (Math.hypot(x - downX, y - downY) > 5) moved = true
      manualRotY += (x - prevX) * 0.005
      manualRotX += (y - prevY) * 0.005
      manualRotX = Math.max(-1.2, Math.min(1.2, manualRotX))
      prevX = x; prevY = y
    }
    const onUp = (x: number, y: number) => {
      const wasClick = isDragging && !moved
      isDragging = false
      if (wasClick) {
        const s = pickSprite(x, y)
        if (s?.userData?.symbol) {
          navRef.current.push(`/synth?token=${encodeURIComponent(s.userData.symbol as string)}`)
        }
      }
    }

    const md = (e: MouseEvent) => onDown(e.clientX, e.clientY)
    const mm = (e: MouseEvent) => {
      onMove(e.clientX, e.clientY)
      if (!isDragging) {
        const s = pickSprite(e.clientX, e.clientY)
        const idx = s ? sprites.indexOf(s) : -1
        hoveredIdx = idx
        canvas!.style.cursor = idx >= 0 ? 'pointer' : 'grab'
      } else {
        canvas!.style.cursor = 'grabbing'
      }
    }
    const mu = (e: MouseEvent) => onUp(e.clientX, e.clientY)
    const ts = (e: TouchEvent) => onDown(e.touches[0].clientX, e.touches[0].clientY)
    const tm = (e: TouchEvent) => { onMove(e.touches[0].clientX, e.touches[0].clientY); if (isDragging && moved) e.preventDefault() }
    const te = (e: TouchEvent) => { const t = e.changedTouches[0]; onUp(t.clientX, t.clientY) }
    const wheel = (e: WheelEvent) => { e.preventDefault(); targetZ = Math.max(220, Math.min(900, targetZ + e.deltaY * 0.35)) }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('mousedown', md)
    canvas.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    canvas.addEventListener('touchstart', ts, { passive: true })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', te)
    canvas.addEventListener('wheel', wheel, { passive: false })

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    let autoRotY = 0, time = 0
    function animate() {
      animId = requestAnimationFrame(animate)
      time += 0.008

      // gentle auto-rotation + drag
      autoRotY += 0.0018
      group.rotation.y = autoRotY + manualRotY
      group.rotation.x = manualRotX

      // starfield slow counter-parallax
      starfield.rotation.y = -autoRotY * 0.4
      starfield.rotation.x = Math.sin(time * 0.05) * 0.1

      // breathing
      const breathe = 1 + Math.sin(time * 0.6) * 0.02
      group.scale.setScalar(breathe)

      // smooth zoom
      camera.position.z += (targetZ - camera.position.z) * 0.08
      camera.position.y = Math.sin(time * 0.18) * 6
      camera.lookAt(0, 0, 0)

      group.updateMatrixWorld(true)

      // per-card float + atmospheric depth fade + hover highlight
      for (let i = 0; i < sprites.length; i++) {
        const b = basePos[i]
        const fl = Math.sin(time * 0.9 + phases[i]) * 2.2
        sprites[i].position.set(b.x, b.y + fl, b.z)
        sprites[i].getWorldPosition(tmp)
        const dist = tmp.distanceTo(camera.position)
        const near = camera.position.z - RADIUS
        const far = camera.position.z + RADIUS
        const f = (dist - near) / (far - near) // 0 near .. 1 far
        const hovered = i === hoveredIdx
        sprites[i].material.opacity = hovered ? 1 : Math.max(0.22, Math.min(1, 1.05 - f * 0.85))
        const bs = baseScale[i]
        const sc = hovered ? 1.28 : 1
        sprites[i].scale.set(bs.w * sc, bs.h * sc, 1)
      }

      renderer.render(scene, camera)
    }

    init().then(() => { if (!disposed) animate() })

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mouseup', mu)
      canvas.removeEventListener('mousedown', md)
      canvas.removeEventListener('mousemove', mm)
      canvas.removeEventListener('touchstart', ts)
      canvas.removeEventListener('touchmove', tm)
      canvas.removeEventListener('touchend', te)
      canvas.removeEventListener('wheel', wheel)
      starGeo.dispose()
      starMat.dispose()
      cleanupFns.forEach(fn => fn())
      renderer.dispose()
    }
  }, [])

  return (
    <>
      {/* Base black */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#000000' }} />

      {/* Drifting aurora nebula */}
      <div className="viz-aurora" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* Cyberpunk green grid */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      {/* Radial vignette for depth */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.82) 100%)',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'auto' }}
      />
    </>
  )
}
