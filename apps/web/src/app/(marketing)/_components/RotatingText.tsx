'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

// Adapted from React Bits — Text Animations / Rotating Text (MIT)
type Props = {
  texts: string[]
  interval?: number
  className?: string
}

export default function RotatingText({ texts, interval = 2200, className = '' }: Props) {
  const [index, setIndex] = useState(0)

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % texts.length)
  }, [texts.length])

  useEffect(() => {
    const id = setInterval(next, interval)
    return () => clearInterval(id)
  }, [next, interval])

  const letters = useMemo(() => Array.from(texts[index]), [texts, index])

  return (
    <span className={`inline-flex overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span key={index} className="inline-flex" aria-label={texts[index]}>
          {letters.map((char, i) => (
            <motion.span
              key={`${index}-${i}`}
              className="inline-block"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-110%', opacity: 0 }}
              transition={{
                delay: i * 0.025,
                type: 'spring',
                damping: 24,
                stiffness: 320,
              }}
            >
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
