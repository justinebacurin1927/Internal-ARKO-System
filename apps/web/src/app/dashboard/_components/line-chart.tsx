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

// ── Line chart (400×140 viewBox, fills container) ─────────
const LineChart = memo(function LineChart({
  incomeData,
  expenseData,
  labels,
}: {
  incomeData: number[]
  expenseData: number[]
  labels: string[]
}) {
  if (labels.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300">
        No data
      </div>
    )

  const w = 400,
    h = 140,
    pad = 10
  const max = Math.max(...incomeData, ...expenseData, 1)
  const xStep = (w - pad * 2) / Math.max(labels.length - 1, 1)
  const scale = (v: number) => h - pad - ((v / max) * (h - pad * 2))

  const incomePts = incomeData.map((v, i) => ({ x: pad + i * xStep, y: scale(v) }))
  const expensePts = expenseData.map((v, i) => ({ x: pad + i * xStep, y: scale(v) }))

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad + (h - pad * 2) * (1 - frac)
        return (
          <line
            key={frac}
            x1={pad}
            y1={y}
            x2={w - pad}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        )
      })}
      {/* Income line */}
      <path
        d={smoothPath(incomePts)}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {incomeData.map((v, i) => (
        <circle
          key={`i${i}`}
          cx={pad + i * xStep}
          cy={scale(v)}
          r="3"
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {expenseData.map((v, i) => (
        <circle
          key={`e${i}`}
          cx={pad + i * xStep}
          cy={scale(v)}
          r="3"
          fill="#f97316"
          stroke="white"
          strokeWidth="1.5"
        />
      ))}
      {/* X-axis labels */}
      {labels
        .filter((_, i) => i % 2 === 0 || i === labels.length - 1)
        .map((l, i, arr) => {
          const idx = i === arr.length - 1 ? labels.length - 1 : i * 2
          return (
            <text
              key={idx}
              x={pad + idx * xStep}
              y={h - 2}
              textAnchor="middle"
              className="fill-gray-400 text-[8px]"
            >
              {l}
            </text>
          )
        })}
    </svg>
  )
})

export { LineChart }
