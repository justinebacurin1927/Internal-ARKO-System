'use client'

import { useEffect, useRef } from 'react'

// Adapted from React Bits — Backgrounds / Squares (MIT)
type Props = {
  direction?: 'right' | 'left' | 'up' | 'down' | 'diagonal'
  speed?: number
  squareSize?: number
  borderColor?: string
  hoverFillColor?: string
  className?: string
}

export default function Squares({
  direction = 'diagonal',
  speed = 0.4,
  squareSize = 44,
  borderColor = 'rgba(184,255,46,0.16)',
  hoverFillColor = 'rgba(184,255,46,0.10)',
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>(0)
  const offset = useRef({ x: 0, y: 0 })
  const hover = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const startX = Math.floor(offset.current.x / squareSize) * squareSize
      const startY = Math.floor(offset.current.y / squareSize) * squareSize

      for (let x = startX; x < width + squareSize; x += squareSize) {
        for (let y = startY; y < height + squareSize; y += squareSize) {
          const px = x - (offset.current.x % squareSize)
          const py = y - (offset.current.y % squareSize)

          if (
            hover.current &&
            Math.floor((hover.current.x + offset.current.x) / squareSize) * squareSize === x &&
            Math.floor((hover.current.y + offset.current.y) / squareSize) * squareSize === y
          ) {
            ctx.fillStyle = hoverFillColor
            ctx.fillRect(px, py, squareSize, squareSize)
          }

          ctx.strokeStyle = borderColor
          ctx.strokeRect(px, py, squareSize, squareSize)
        }
      }
    }

    const update = () => {
      const s = Math.max(speed, 0.1)
      switch (direction) {
        case 'right':
          offset.current.x -= s
          break
        case 'left':
          offset.current.x += s
          break
        case 'up':
          offset.current.y += s
          break
        case 'down':
          offset.current.y -= s
          break
        default:
          offset.current.x -= s
          offset.current.y -= s
      }
      draw()
      requestRef.current = requestAnimationFrame(update)
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      hover.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => {
      hover.current = null
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      draw()
    } else {
      requestRef.current = requestAnimationFrame(update)
    }

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(requestRef.current)
    }
  }, [direction, speed, squareSize, borderColor, hoverFillColor])

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} />
}
