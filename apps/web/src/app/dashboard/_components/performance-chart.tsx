'use client'

import { memo } from 'react'

// ── Cubic bezier smoothing ────────────────────────────────
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const t = 0.3
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = p2.y - (p3.y - p1.y) * t
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

// ── Helpers ───────────────────────────────────────────────
function formatChartCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

// ── Props ─────────────────────────────────────────────────
interface PerformanceChartProps {
  incomeData: number[]
  expenseData: number[]
  labels: string[]
}

// ── Component ─────────────────────────────────────────────
const PerformanceChart = memo(function PerformanceChart({
  incomeData,
  expenseData,
  labels,
}: PerformanceChartProps) {
  if (labels.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300 select-none">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-light text-gray-200">—</span>
          <span>No data yet</span>
        </div>
      </div>
    )

  // ── Layout geometry ──────────────────────────────────
  const vw = 560
  const vh = 180
  const padL = 42
  const padR = 12
  const padT = 8
  const padB = 22
  const chartW = vw - padL - padR
  const chartH = vh - padT - padB
  const chartL = padL
  const chartT = padT

  // Y-axis range
  const allValues = [...incomeData, ...expenseData]
  const dataMax = Math.max(...allValues, 1)
  const paddedMax = dataMax * 1.15
  const yScale = (v: number) => chartT + chartH - (v / paddedMax) * chartH

  // X spacing
  const xStep = chartW / Math.max(labels.length - 1, 1)

  // Build point arrays
  const incomePts = incomeData.map((v, i) => ({
    x: chartL + i * xStep,
    y: yScale(v),
    val: v,
    label: labels[i],
  }))
  const expensePts = expenseData.map((v, i) => ({
    x: chartL + i * xStep,
    y: yScale(v),
    val: v,
    label: labels[i],
  }))

  // Y-axis ticks (auto)
  const tickCount = 4
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (paddedMax / tickCount) * i)

  return (
    <div className="relative w-full h-full select-none">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid */}
        {yTicks.map((v) => {
          const y = yScale(v)
          return (
            <g key={v}>
              <line
                x1={chartL}
                y1={y}
                x2={chartL + chartW}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <text
                x={chartL - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-400"
                fontSize="8"
                fontFamily="Inter, Sora, system-ui, sans-serif"
                fontWeight="500"
              >
                {formatChartCurrency(v)}
              </text>
            </g>
          )
        })}

        {/* Income line */}
        <path
          d={smoothPath(incomePts)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {incomeData.map((v, i) => (
          <circle
            key={`i${i}`}
            cx={chartL + i * xStep}
            cy={yScale(v)}
            r="2.5"
            fill="#22c55e"
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* Expense line */}
        <path
          d={smoothPath(expensePts)}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {expenseData.map((v, i) => (
          <circle
            key={`e${i}`}
            cx={chartL + i * xStep}
            cy={yScale(v)}
            r="2.5"
            fill="#f97316"
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis labels */}
        {labels
          .filter((_, i) => i === 0 || i === labels.length - 1 || i % 2 === 0)
          .map((l, i, arr) => {
            const idx = arr.length === 1 ? 0 : labels.indexOf(l)
            return (
              <text
                key={idx}
                x={chartL + idx * xStep}
                y={chartT + chartH + 14}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="8"
                fontFamily="Inter, Sora, system-ui, sans-serif"
                fontWeight="500"
              >
                {l}
              </text>
            )
          })}
      </svg>

      {/* Legend chips */}
      <div className="absolute top-0 right-0 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1 rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Income
        </div>
        <div className="flex items-center gap-1 rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full border border-orange-500 bg-orange-400" />
          Expenses
        </div>
      </div>
    </div>
  )
})

export { PerformanceChart }
