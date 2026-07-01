'use client'

import { memo } from 'react'

export interface CategoryItem {
  name: string
  amount: number
  color: string
}

// ── Horizontal bar chart — expense breakdown by category ──
const CategoryChart = memo(function CategoryChart({
  categories,
}: {
  categories: CategoryItem[]
}) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300">
        No expense data
      </div>
    )
  }

  // Sort by amount desc, take top 5 + "Other"
  const sorted = [...categories].sort((a, b) => b.amount - a.amount)
  const top5 = sorted.slice(0, 5)
  const rest = sorted.slice(5)
  const restTotal = rest.reduce((s, c) => s + c.amount, 0)
  if (restTotal > 0) {
    top5.push({ name: 'Other', amount: restTotal, color: '#9ca3af' })
  }

  const total = categories.reduce((s, c) => s + c.amount, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300">
        No expenses recorded
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center gap-2 h-full">
      {top5.map((cat) => {
        const pct = (cat.amount / total) * 100
        return (
          <div key={cat.name} className="flex items-center gap-2">
            <span className="w-16 text-[9px] font-medium text-gray-500 truncate shrink-0 text-right">
              {cat.name}
            </span>
            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: cat.color }}
              />
            </div>
            <span className="w-12 text-[9px] font-semibold text-gray-600 text-right shrink-0 tabular-nums">
              {pct.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
})

export { CategoryChart }
