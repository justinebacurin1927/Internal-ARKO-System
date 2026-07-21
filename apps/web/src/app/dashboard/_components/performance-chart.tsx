'use client'

import { memo, useState, useRef, useCallback } from 'react'

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
    const t = 0.35
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
  if (n >= 1000_000) return `$${(n / 1000_000).toFixed(1)}M`
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
  const [hoverIdx, setHoverIdx] = useState(-1)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── Mouse handlers — MUST be before any early return (Rules of Hooks) ──
  const ptsCountRef = useRef(0)
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const i = Math.round(pct * (ptsCountRef.current - 1))
    setHoverIdx(Math.max(0, Math.min(i, ptsCountRef.current - 1)))
  }, [])

  const onLeave = useCallback(() => setHoverIdx(-1), [])

  // Guard: need at least 2 months to render lines
  if (labels.length < 2 || incomeData.length < 2 || expenseData.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300 select-none">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-light text-gray-200">—</span>
          <span>Loading data...</span>
        </div>
      </div>
    )
  }

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

  // Y-axis range: auto-scale to data with 15% headroom
  const allValues = [...incomeData, ...expenseData]
  const dataMax = Math.max(...allValues, 1)
  const paddedMax = dataMax * 1.15
  const yScale = (v: number) => chartT + chartH - (v / paddedMax) * chartH

  // X spacing
  const xStep = chartW / Math.max(labels.length - 1, 1)

  // ── Build point arrays ───────────────────────────────
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

  ptsCountRef.current = labels.length

  // ── Compute metric: income/expense ratio & totals ────
  const totalIncome = incomeData.reduce((s, v) => s + v, 0)
  const totalExpenses = expenseData.reduce((s, v) => s + v, 0)
  const netRatio = totalExpenses > 0 ? totalIncome / totalExpenses : totalIncome > 0 ? Infinity : 1
  const avgIncome = totalIncome / incomeData.length
  const avgExpenses = totalExpenses / expenseData.length

  // Hovered data point (for tooltip)
  const hoverInc = hoverIdx >= 0 && hoverIdx < incomePts.length ? incomePts[hoverIdx] : null
  const hoverExp = hoverIdx >= 0 && hoverIdx < expensePts.length ? expensePts[hoverIdx] : null

  // Y-axis ticks (auto: 4-5 nice labels)
  const tickCount = 4
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (paddedMax / tickCount) * i)

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vw} ${vh}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ cursor: 'crosshair' }}
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

        {/* Income line (green) */}
        <path
          d={smoothPath(incomePts)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {incomeData.map((v, i) => {
          const active = hoverIdx === i
          return (
            <circle
              key={`i${i}`}
              cx={chartL + i * xStep}
              cy={yScale(v)}
              r={active ? 4 : 2.5}
              fill={active ? '#16a34a' : '#22c55e'}
              stroke="white"
              strokeWidth={active ? 2 : 1.5}
            />
          )
        })}

        {/* Expense line (orange) */}
        <path
          d={smoothPath(expensePts)}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {expenseData.map((v, i) => {
          const active = hoverIdx === i
          return (
            <circle
              key={`e${i}`}
              cx={chartL + i * xStep}
              cy={yScale(v)}
              r={active ? 4 : 2.5}
              fill={active ? '#ea580c' : '#f97316'}
              stroke="white"
              strokeWidth={active ? 2 : 1.5}
            />
          )
        })}

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

      {/* ══ Tooltip (hover) ═══ */}
      {(hoverInc || hoverExp) && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${Math.max(2, Math.min((hoverInc ?? hoverExp)!.x / vw * 100, 85))}%`,
            top: `${Math.max(4, Math.min((hoverInc ?? hoverExp)!.y / vh * 100 - 28, 60))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="rounded-md px-2.5 py-1.5 text-center shadow-lg" style={{ background: '#0f0f0f' }}>
              <div className="text-[9px] font-medium leading-tight" style={{ color: '#9ca3af', fontFamily: 'Inter, Sora, system-ui, sans-serif' }}>
                {hoverInc?.label}
              </div>
              {hoverInc && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-[10px] font-bold leading-tight text-green-400">
                    +{formatChartCurrency(hoverInc.val)}
                  </span>
                </div>
              )}
              {hoverExp && (
                <div className="flex items-center gap-1.5 mt-px">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-[10px] font-bold leading-tight text-orange-400">
                    -{formatChartCurrency(hoverExp.val)}
                  </span>
                </div>
              )}
            </div>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid #0f0f0f',
              }}
            />
          </div>
        </div>
      )}

      {/* ══ KPI chips (top-right) ═══ */}
      <div className="absolute top-0 right-0 flex items-center gap-1.5 pointer-events-none">
        <div className="rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed" style={{ color: '#374151' }}>
          Avg{' '}
          <span className="text-green-600">+{formatChartCurrency(avgIncome)}</span>
          {' / '}
          <span className="text-orange-600">{formatChartCurrency(avgExpenses)}</span>
        </div>
        <div className="rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed" style={{ color: '#374151' }}>
          Ratio{' '}
          <span className={netRatio >= 1 ? 'text-green-600' : 'text-red-500'}>
            {isFinite(netRatio) ? netRatio.toFixed(2) : '∞'}x
          </span>
        </div>
      </div>

      {/* Legend (bottom-right, inside chart area) */}
      <div className="absolute bottom-1 right-1 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-semibold text-gray-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Income
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-semibold text-gray-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 border border-orange-500" />
          Expenses
        </div>
      </div>
    </div>
  )
})

export { PerformanceChart }
