import type { ReactNode } from 'react'

// Adapted from React Bits — Animations / Star Border (MIT). Pure CSS, no deps.
type Props = {
  as?: 'a' | 'button'
  href?: string
  color?: string
  speed?: string
  className?: string
  disabled?: boolean
  children: ReactNode
}

export default function StarBorder({
  as = 'button',
  href,
  color = '#b8ff2e',
  speed = '5s',
  className = '',
  disabled = false,
  children,
}: Props) {
  const wrapperClass = `relative inline-block overflow-hidden py-[1px] transition-transform hover:-translate-y-0.5 ${className}`
  const inner = (
    <>
      <span
        className="absolute right-[-25%] bottom-[-11px] z-0 h-[50%] w-[300%] rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animation: `star-movement-bottom ${speed} linear infinite alternate`,
        }}
      />
      <span
        className="absolute top-[-11px] left-[-25%] z-0 h-[50%] w-[300%] rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animation: `star-movement-top ${speed} linear infinite alternate`,
        }}
      />
      <span className="display relative z-10 block border-2 border-acid bg-ink px-8 py-4 text-sm text-acid">
        {children}
      </span>
    </>
  )

  if (as === 'a') {
    return (
      <a href={href} className={wrapperClass}>
        {inner}
      </a>
    )
  }
  return (
    <button type="submit" disabled={disabled} className={`${wrapperClass} disabled:opacity-60`}>
      {inner}
    </button>
  )
}
