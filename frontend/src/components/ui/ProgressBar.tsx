interface ProgressSegment {
  value: number
  color: string
  label?: string
}

interface ProgressBarProps {
  segments: ProgressSegment[]
  markers?: number[]
  className?: string
}

export function ProgressBar({ segments, markers, className = '' }: ProgressBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </div>
      {markers && (
        <div className="absolute inset-0 flex items-center justify-between px-0.5 pointer-events-none">
          {markers.map((pos, i) => (
            <div
              key={i}
              className="h-2.5 w-0.5 rounded-full bg-white/60"
              style={{ marginLeft: `${pos}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; value: number }[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-text-tertiary">{item.label}</span>
          <span className="text-xs font-medium text-text-secondary">
            {Math.round((item.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}
