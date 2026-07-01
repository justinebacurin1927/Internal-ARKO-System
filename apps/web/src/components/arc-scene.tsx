'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Procedural stone texture generator ──────────────────────────────

function createStoneTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  // Simple value noise
  const seed = Array.from({ length: 64 }, () => Math.random())
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x) % 8
    const iy = Math.floor(y) % 8
    const fx = x - Math.floor(x)
    const fy = y - Math.floor(y)
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const n00 = seed[iy * 8 + ix]
    const n10 = seed[iy * 8 + ((ix + 1) % 8)]
    const n01 = seed[((iy + 1) % 8) * 8 + ix]
    const n11 = seed[((iy + 1) % 8) * 8 + ((ix + 1) % 8)]
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy)
  }

  const fbm = (x: number, y: number, octaves: number) => {
    let val = 0
    let amp = 1
    let freq = 1
    for (let i = 0; i < octaves; i++) {
      val += amp * noise(x * freq, y * freq)
      amp *= 0.5
      freq *= 2
    }
    return val
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const n = fbm(x / size * 6, y / size * 6, 5)
      // Warm gray stone: base 140–180, modulated by noise
      const base = 155 + (n - 0.5) * 60
      const r = base + 15
      const g = base + 5
      const b = base - 10
      data[i] = Math.max(0, Math.min(255, r))
      data[i + 1] = Math.max(0, Math.min(255, g))
      data[i + 2] = Math.max(0, Math.min(255, b))
      data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 3)
  return texture
}

function createStoneBump(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  const seed = Array.from({ length: 64 }, () => Math.random())
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x) % 8
    const iy = Math.floor(y) % 8
    const fx = x - Math.floor(x)
    const fy = y - Math.floor(y)
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const n00 = seed[iy * 8 + ix]
    const n10 = seed[iy * 8 + ((ix + 1) % 8)]
    const n01 = seed[((iy + 1) % 8) * 8 + ix]
    const n11 = seed[((iy + 1) % 8) * 8 + ((ix + 1) % 8)]
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy)
  }
  const fbm = (x: number, y: number, oct: number) => {
    let v = 0; let a = 1; let f = 1
    for (let i = 0; i < oct; i++) { v += a * noise(x * f, y * f); a *= 0.5; f *= 2 }
    return v
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const n = fbm(x / size * 8, y / size * 8, 5)
      const v = Math.max(0, Math.min(255, (n - 0.2) * 400))
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 3)
  return tex
}

// ─── Cherry blossom petal texture ───────────────────────────────────

function petalTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255, 183, 197, 0.9)')
  gradient.addColorStop(0.4, 'rgba(255, 150, 180, 0.7)')
  gradient.addColorStop(1, 'rgba(255, 140, 170, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(canvas)
}

// ─── Stone Arch geometry ────────────────────────────────────────────

const ARCH = {
  outerW: 2.6,   // half-width of outer shape
  outerH: 3.5,   // height of outer shape (from base)
  innerW: 1.4,   // half-width of opening
  innerH: 2.0,   // height of pillar (straight section before arch)
  rise: 0.8,     // additional arch rise above the straight section
  depth: 0.9,    // extrusion depth
  base: 0.3,     // base platform height
}

function buildArchGeometry() {
  const { outerW, outerH, innerW, innerH, rise, base } = ARCH

  const shape = new THREE.Shape()
  // Outer contour (counter-clockwise)
  shape.moveTo(-outerW, 0)
  shape.lineTo(-outerW, outerH)
  // Slight arch at top of outer shape too
  shape.quadraticCurveTo(0, outerH + rise * 0.3, outerW, outerH)
  shape.lineTo(outerW, 0)
  shape.lineTo(-outerW, 0)

  // Inner hole (clockwise — THREE uses CCW for outer, CW for holes)
  const hole = new THREE.Path()
  hole.moveTo(-innerW, base)
  hole.lineTo(-innerW, innerH)
  // Arch: quadratic curve from left pillar top to right pillar top
  hole.quadraticCurveTo(0, innerH + rise, innerW, innerH)
  hole.lineTo(innerW, base)
  hole.lineTo(-innerW, base)

  shape.holes.push(hole)

  const extrudeSettings = {
    depth: ARCH.depth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.04,
    bevelSegments: 4,
  }

  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

// ─── Scene components ───────────────────────────────────────────────

function StoneArch() {
  const ref = useRef<THREE.Mesh>(null!)
  const geo = useMemo(buildArchGeometry, [])

  const [colorMap, bumpMap] = useMemo(() => {
    return [createStoneTexture(), createStoneBump()]
  }, [])

  return (
    <mesh
      ref={ref}
      geometry={geo}
      position={[0, 0, -ARCH.depth / 2]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        roughness={0.85}
        metalness={0.05}
        color="#c8bda8"
      />
    </mesh>
  )
}

/** Base platform (stone floor) */
function StoneFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[6, 48]} />
      <meshStandardMaterial
        color="#2a2826"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  )
}

/** Cherry blossom tree branches (stylized) */
function CherryBranch({ position, rotation }: { position: [number, number, number], rotation: number }) {
  const colors = useMemo(
    () => [
      `hsl(340, ${55 + Math.random() * 25}%, ${70 + Math.random() * 15}%)`,
      `hsl(340, ${55 + Math.random() * 25}%, ${70 + Math.random() * 15}%)`,
      `hsl(340, ${55 + Math.random() * 25}%, ${70 + Math.random() * 15}%)`,
    ],
    [],
  )

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Branch */}
      <mesh position={[0.8, 0.3, 0]} rotation={[0.2, 0, 0.5]}>
        <cylinderGeometry args={[0.03, 0.06, 0.6, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      {/* Blossom clusters */}
      {[[0.9, 0.5, 0], [0.7, 0.4, 0.1], [1.0, 0.35, -0.05]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color={colors[i]} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Falling cherry-blossom petal particles */
function Petals() {
  const ref = useRef<THREE.Points>(null!)
  const texture = useMemo(petalTexture, [])
  const COUNT = 350

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const vel = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = Math.random() * 8 - 1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12
      vel[i * 3] = (Math.random() - 0.5) * 0.004
      vel[i * 3 + 1] = -(0.004 + Math.random() * 0.006)
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.004
    }
    return [pos, vel]
  }, [])

  useFrame(() => {
    const p = ref.current.geometry.attributes.position.array as Float32Array
    const t = Date.now() * 0.001
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] += velocities[i * 3] + Math.sin(t + i * 0.1) * 0.0004
      p[i * 3 + 1] += velocities[i * 3 + 1]
      p[i * 3 + 2] += velocities[i * 3 + 2] + Math.cos(t + i * 0.1) * 0.0003
      if (p[i * 3 + 1] < -0.5) {
        p[i * 3] = (Math.random() - 0.5) * 14
        p[i * 3 + 1] = 5 + Math.random() * 3
        p[i * 3 + 2] = (Math.random() - 0.5) * 12
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.18}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ─── Main scene export ──────────────────────────────────────────────

export function ArcScene() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 1.8, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
        shadows
        className="h-full w-full"
      >
        <color attach="background" args={['#0a0a0a']} />

        {/* Ambient */}
        <ambientLight intensity={0.3} color="#b8a090" />

        {/* Key light — warm, from upper-right, casting shadows */}
        <directionalLight
          position={[4, 6, 3]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Fill — cool, from behind-left */}
        <directionalLight position={[-3, 2, -4]} intensity={0.25} color="#88bbaa" />

        {/* Green accent rim — from below, grazing the arch */}
        <spotLight
          position={[0, -1, 3]}
          angle={0.5}
          penumbra={1}
          intensity={0.3}
          color="#22c55e"
          distance={10}
        />

        {/* Moonlight/ambient top */}
        <directionalLight position={[0, 8, -2]} intensity={0.15} color="#446688" />

        {/* Scene */}
        <StoneFloor />
        <StoneArch />

        {/* Cherry blossom branches — one on each side */}
        <CherryBranch position={[-3.2, 1.0, -0.5]} rotation={0.3} />
        <CherryBranch position={[3.2, 0.8, 0.5]} rotation={-0.2} />

        {/* Petals */}
        <Petals />

        {/* Fog */}
        <fog attach="fog" args={['#0a0a0a', 4, 14]} />
      </Canvas>
    </div>
  )
}
