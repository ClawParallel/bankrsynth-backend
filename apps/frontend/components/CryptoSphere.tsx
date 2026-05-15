'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 2800

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float time;
  void main(){
    vColor = aColor;
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    float d = length(mvp.xyz);
    vAlpha = clamp(1.5 - d/600.0, 0.2, 1.0);
    gl_PointSize = aSize * (300.0 / d);
    gl_Position = projectionMatrix * mvp;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord - vec2(0.5);
    float r = length(uv);
    if(r > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, r);
    float core = smoothstep(0.15, 0.0, r);
    gl_FragColor = vec4(vColor, (glow*0.6 + core*0.4) * vAlpha);
  }
`

type Mode = 'sphere' | 'helix' | 'grid' | 'network' | 'terminal'

export default function CryptoSphere({ mode }: { mode: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)

  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000)
    camera.position.z = 450

    scene.add(new THREE.AmbientLight(0x001a05, 2))
    const gL = new THREE.PointLight(0x00ff41, 2, 600); gL.position.set(0, 0, 200); scene.add(gL)
    const rL = new THREE.PointLight(0xff1a3c, 1.5, 500); rL.position.set(200, 100, -100); scene.add(rL)
    const cL = new THREE.PointLight(0x00e5ff, 1, 400); cL.position.set(-200, -100, 100); scene.add(cL)

    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const phases = new Float32Array(PARTICLE_COUNT)
    const types = new Uint8Array(PARTICLE_COUNT)
    const targets = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      phases[i] = Math.random() * Math.PI * 2
      const r = Math.random()
      types[i] = r < 0.6 ? 0 : r < 0.85 ? 1 : 2
      sizes[i] = types[i] === 2 ? 2.5 + Math.random() * 3 : 1 + Math.random() * 2
      const phi = Math.acos(-1 + 2 * Math.random())
      const theta = Math.random() * Math.PI * 2
      const rad = 180 + Math.random() * 40
      positions[i*3] = rad * Math.sin(phi) * Math.cos(theta)
      positions[i*3+1] = rad * Math.sin(phi) * Math.sin(theta)
      positions[i*3+2] = rad * Math.cos(phi)
      if (types[i] === 2) { colors[i*3]=1; colors[i*3+1]=0.1; colors[i*3+2]=0.2 }
      else if (types[i] === 1) { colors[i*3]=0; colors[i*3+1]=0.9; colors[i*3+2]=1 }
      else { colors[i*3]=0; colors[i*3+1]=1; colors[i*3+2]=0.25 }
      targets[i*3] = positions[i*3]; targets[i*3+1] = positions[i*3+1]; targets[i*3+2] = positions[i*3+2]
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { time: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    })

    const particles = new THREE.Points(geo, mat)
    scene.add(particles)

    const networkRandAng = new Float32Array(PARTICLE_COUNT)
    const networkRandRad = new Float32Array(PARTICLE_COUNT)
    const networkRandZ = new Float32Array(PARTICLE_COUNT)
    const terminalRandZ = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      networkRandAng[i] = Math.random() * Math.PI * 2
      networkRandRad[i] = 80 * Math.random()
      networkRandZ[i] = (Math.random() - 0.5) * 200
      terminalRandZ[i] = -200 + Math.random() * 100
    }

    function getTarget(m: Mode, i: number): [number, number, number] {
      if (m === 'sphere') {
        const phi = Math.acos(-1 + 2 * (i / PARTICLE_COUNT))
        const theta = (i * 2.399) * Math.PI * 2
        return [190 * Math.sin(phi) * Math.cos(theta), 190 * Math.sin(phi) * Math.sin(theta), 190 * Math.cos(phi)]
      }
      if (m === 'helix') {
        const t = i / PARTICLE_COUNT
        return [130 * Math.cos(t * Math.PI * 20), (t - 0.5) * 480, 130 * Math.sin(t * Math.PI * 20)]
      }
      if (m === 'grid') {
        const side = Math.ceil(Math.cbrt(PARTICLE_COUNT))
        return [((i % side) / side - 0.5) * 380, (Math.floor(i / side) % side / side - 0.5) * 380, (Math.floor(i / side / side) / side - 0.5) * 380]
      }
      if (m === 'network') {
        const cluster = Math.floor(i / (PARTICLE_COUNT / 8))
        const cx = (cluster % 4 - 1.5) * 220
        const cy = (Math.floor(cluster / 4) - 0.5) * 220
        return [cx + networkRandRad[i] * Math.cos(networkRandAng[i]), cy + networkRandRad[i] * Math.sin(networkRandAng[i]), networkRandZ[i]]
      }
      const cols = 80, rows = Math.ceil(PARTICLE_COUNT / cols)
      return [(i % cols / cols - 0.5) * 680, (Math.floor(i / cols) / rows - 0.5) * 480, terminalRandZ[i]]
    }

    function arrangeParticles(m: Mode) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = getTarget(m, i)
        targets[i*3] = t[0]; targets[i*3+1] = t[1]; targets[i*3+2] = t[2]
      }
    }

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(195, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, wireframe: true, transparent: true, opacity: 0.04 })
    ))

    const crystalGeo = new THREE.IcosahedronGeometry(45, 1)
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xff1a3c, emissive: 0xcc0020, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 })
    const crystal = new THREE.Mesh(crystalGeo, crystalMat)
    scene.add(crystal)

    const ringGeo = new THREE.RingGeometry(198, 200, 128)
    const ring1 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.15, side: THREE.DoubleSide }))
    ring1.rotation.x = Math.PI * 0.15; scene.add(ring1)
    const ring2 = new THREE.Mesh(ringGeo.clone(), new THREE.MeshBasicMaterial({ color: 0xff1a3c, transparent: true, opacity: 0.1, side: THREE.DoubleSide }))
    ring2.rotation.x = Math.PI * 0.55; ring2.rotation.y = Math.PI * 0.3; scene.add(ring2)

    let isDragging = false, prevMx = 0, prevMy = 0, manualRotX = 0, manualRotY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMx = e.clientX; prevMy = e.clientY }
    const onMouseMove = (e: MouseEvent) => { if (!isDragging) return; manualRotY += (e.clientX - prevMx) * 0.005; manualRotX += (e.clientY - prevMy) * 0.005; prevMx = e.clientX; prevMy = e.clientY }
    const onMouseUp = () => { isDragging = false }
    const onTouchStart = (e: TouchEvent) => { isDragging = true; prevMx = e.touches[0].clientX; prevMy = e.touches[0].clientY }
    const onTouchMove = (e: TouchEvent) => { if (!isDragging) return; manualRotY += (e.touches[0].clientX - prevMx) * 0.005; manualRotX += (e.touches[0].clientY - prevMy) * 0.005; prevMx = e.touches[0].clientX; prevMy = e.touches[0].clientY; e.preventDefault() }
    const onTouchEnd = () => { isDragging = false }
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }
    window.addEventListener('resize', onResize)

    let currentMode: Mode = modeRef.current
    arrangeParticles(currentMode)
    let autoRotY = 0, time = 0
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      time += 0.008
      mat.uniforms.time.value = time

      if (modeRef.current !== currentMode) {
        currentMode = modeRef.current
        arrangeParticles(currentMode)
      }

      autoRotY += 0.003
      particles.rotation.y = autoRotY + manualRotY
      particles.rotation.x = manualRotX
      ring1.rotation.z = time * 0.08
      ring2.rotation.y = time * 0.12
      crystal.rotation.x = time * 0.4; crystal.rotation.y = time * 0.6; crystal.rotation.z = time * 0.3
      crystalMat.emissiveIntensity = Math.sin(time * 2) * 0.15 + 0.7

      const pos = geo.attributes.position.array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const wave = Math.sin(time * 1.2 + phases[i]) * 0.8
        pos[i*3] += (targets[i*3] + wave - pos[i*3]) * 0.1
        pos[i*3+1] += (targets[i*3+1] + wave - pos[i*3+1]) * 0.1
        pos[i*3+2] += (targets[i*3+2] - pos[i*3+2]) * 0.1
      }
      geo.attributes.position.needsUpdate = true

      gL.position.x = Math.sin(time * 0.5) * 300
      gL.position.z = Math.cos(time * 0.5) * 300
      camera.position.y = Math.sin(time * 0.2) * 8
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'auto' }}
    />
  )
}
