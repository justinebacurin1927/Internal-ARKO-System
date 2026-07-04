export type MetricStatus = 'healthy' | 'warning' | 'neutral'

const statusStyles: Record<MetricStatus, { border: string; glow: string; indicator: string; badge: string; spark: string }> = {
  healthy: {
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/5',
    indicator: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600',
    spark: '#5FA87A',
  },
  warning: {
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/5',
    indicator: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600',
    spark: '#C9954A',
  },
  neutral: {
    border: 'border-stone-200',
    glow: 'shadow-stone-200/5',
    indicator: 'bg-stone-400',
    badge: 'bg-stone-100 text-stone-500',
    spark: '#A8A29E',
  },
}

const statusStylesLight: Record<MetricStatus, { border: string; glow: string; indicator: string; badge: string; spark: string }> = {
  healthy: {
    border: 'border-emerald-200',
    glow: 'shadow-emerald-200/5',
    indicator: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
    spark: '#5FA87A',
  },
  warning: {
    border: 'border-amber-200',
    glow: 'shadow-amber-200/5',
    indicator: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700',
    spark: '#C9954A',
  },
  neutral: {
    border: 'border-border-subtle',
    glow: 'shadow-border-subtle/30',
    indicator: 'bg-stone-400',
    badge: 'bg-accent-50 text-text-secondary',
    spark: '#A8A29E',
  },
}

interface MetricCardProps {
  name: string
  value: string
  trend: 'up' | 'down'
  trendLabel?: string
  status: MetricStatus
  /** Whether an upward trend means "good news". If false, an up arrow is shown in the warning color. */
  upIsGood?: boolean
  sparklineData: number[]
  /** Light mode variant */
  light?: boolean
}

/** Inline SVG sparkline — no dependencies. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null

  const w = 80
  const h = 20
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const path = `M ${points.join(' L ')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-4" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-grad-${data[0]}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${w} ${h} L 0 ${h} Z`}
        fill={`url(#spark-grad-${data[0]})`}
        opacity="0.4"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MetricCard({ name, value, trend, trendLabel, status, upIsGood = true, sparklineData, light }: MetricCardProps) {
  const s = light ? statusStylesLight[status] : statusStyles[status]

  const trendIsPositive =
    (trend === 'up' && upIsGood) || (trend === 'down' && !upIsGood)

  const trendColor = trendIsPositive
    ? light ? 'text-emerald-600' : 'text-emerald-400'
    : status === 'healthy'
      ? light ? 'text-red-600' : 'text-red-400'
      : light ? 'text-amber-600' : 'text-amber-400'

  return (
    <div
      className={`group relative rounded-xl border ${s.border} ${light ? 'bg-white shadow-sm' : 'bg-zinc-900/90 shadow-lg'} ${s.glow} transition-all duration-200 ${light ? 'hover:border-accent-300' : 'hover:border-zinc-600'}`}
    >
      {/* Top row: name + indicator dot */}
      <div className="mb-1 flex items-center justify-between px-3 pt-3">
        <span
          className={`text-[10px] font-medium uppercase tracking-wider ${light ? 'text-text-secondary' : 'text-zinc-400'}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {name}
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.indicator}`} />
      </div>

      {/* Value row */}
      <div className="mb-0.5 flex items-baseline gap-2 px-3">
        <span className={`text-base font-bold tracking-tight ${light ? 'text-text-primary' : 'text-white'}`}>{value}</span>
        <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trendColor}`}>
          <span className="text-[10px]">{trend === 'up' ? '▲' : '▼'}</span>
          {trendLabel && <span>{trendLabel}</span>}
        </span>
      </div>

      {/* Sparkline */}
      <div className="px-3 pb-3 pt-1.5">
        <Sparkline data={sparklineData} color={s.spark} />
      </div>
    </div>
  )
}
