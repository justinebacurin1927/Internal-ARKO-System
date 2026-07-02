import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  trend?: {
    direction: 'up' | 'down'
    label: string
  }
  icon?: React.ReactNode
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-sm font-semibold">{title}</span>
        {icon && <span className="text-text-tertiary">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-bold text-text-primary leading-none">{value}</span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            trend.direction === 'up' ? 'text-pos' : 'text-neg'
          }`}>
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}
