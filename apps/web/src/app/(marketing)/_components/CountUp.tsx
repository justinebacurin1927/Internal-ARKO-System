'use client'

import { useInView, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'

// Adapted from React Bits — Text Animations / Count Up (MIT)
type Props = {
  to: number
  from?: number
  duration?: number
  suffix?: string
  className?: string
}

export default function CountUp({ to, from = 0, duration = 2, suffix = '', className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const motionValue = useMotionValue(from)
  const spring = useSpring(motionValue, {
    damping: 30,
    stiffness: 120,
    duration: duration * 1000,
  })

  useEffect(() => {
    if (inView) motionValue.set(to)
  }, [inView, to, motionValue])

  useEffect(() => {
    const unsub = spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = String(Math.round(latest))
    })
    return unsub
  }, [spring])

  return (
    <span className={className}>
      <span ref={ref}>{from}</span>
      {suffix}
    </span>
  )
}
