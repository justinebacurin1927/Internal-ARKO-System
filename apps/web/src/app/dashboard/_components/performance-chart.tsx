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

  // Guard: need at least 2 months to compute growth rate
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

  // ── Compute month-over-month net growth rate (%) ──────
  const plotRates: number[] = []
  const plotLabels: string[] = []

  for (let i = 1; i < labels.length; i++) {
    const prevNet = (incomeData[i - 1] ?? 0) - (expenseData[i - 1] ?? 0)
    const currNet = (incomeData[i] ?? 0) - (expenseData[i] ?? 0)
    const growth = prevNet !== 0 ? ((currNet - prevNet) / Math.abs(prevNet)) * 100 : 0
    plotRates.push(parseFloat(growth.toFixed(2)))
    plotLabels.push(labels[i])
  }

  if (plotRates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-gray-300 select-none">
        <span>No growth data yet</span>
      </div>
    )
  }

  // ── Check if all values are flat (identical) ─────────
  const isFlat = plotRates.every((r) => r === plotRates[0])

  // ── Compute KPI metrics ──────────────────────────────
  const avgGrowth = plotRates.reduce((s, r) => s + r, 0) / plotRates.length
  const variance = plotRates.length > 1
    ? plotRates.reduce((s, r) => s + (r - avgGrowth) ** 2, 0) / (plotRates.length - 1)
    : 0
  const stdDev = Math.sqrt(variance)
  const sharpe = stdDev > 0 ? avgGrowth / stdDev : 0

  // ── Layout geometry ──────────────────────────────────
  const vw = 560
  const vh = 180
  const padL = 40
  const padR = 10
  const padT = 6
  const padB = 22
  const chartW = vw - padL - padR
  const chartH = vh - padT - padB
  const chartL = padL
  const chartT = padT

  // Y-axis range: auto with -1/+4 default, or offset if flat
  const rawMin = Math.min(0, ...plotRates)
  const rawMax = Math.max(0, ...plotRates)

  let dataMin: number, dataMax: number
  if (isFlat) {
    // When data is flat (all same value), center it with padding
    const val = plotRates[0]
    dataMin = val - 2
    dataMax = val + 2.5
  } else {
    dataMin = rawMin >= 0 ? -1 : rawMin - Math.max(Math.abs(rawMin) * 0.2, 0.5)
    dataMax = rawMax <= 0 ? 4 : rawMax + Math.max(rawMax * 0.2, 0.5)
  }
  const yMin = Math.floor(dataMin)
  const yMax = Math.ceil(dataMax)
  const yRange = Math.max(yMax - yMin, 3)
  const yScale = (v: number) => chartT + chartH - ((v - yMin) / yRange) * chartH

  // X spacing
  const xStep = chartW / Math.max(plotRates.length - 1, 1)

  // ── Build point array ────────────────────────────────
  const pts = plotRates.map((v, i) => ({
    x: chartL + i * xStep,
    y: yScale(v),
    val: v,
    label: plotLabels[i],
  }))

  const benchmarkY = yScale(0)
  const hoverPt = hoverIdx >= 0 && hoverIdx < pts.length ? pts[hoverIdx] : null

  // Y-axis ticks (every integer %)
  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v++) yTicks.push(v)

  // ── Mouse handler ────────────────────────────────────
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const i = Math.round(pct * (pts.length - 1))
    setHoverIdx(Math.max(0, Math.min(i, pts.length - 1)))
  }, [pts.length])

  const onLeave = useCallback(() => setHoverIdx(-1), [])

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
        {/* Horizontal grid — no vertical lines */}
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
                x={chartL - 5}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-400"
                fontSize="8"
                fontFamily="Inter, Sora, system-ui, sans-serif"
                fontWeight="500"
              >
                {v > 0 ? `+${v}%` : `${v}%`}
              </text>
            </g>
          )
        })}

        {/* Benchmark 0% line (dashed gray) */}
        <line
          x1={chartL}
          y1={benchmarkY}
          x2={chartL + chartW}
          y2={benchmarkY}
          stroke="#d1d5db"
          strokeWidth="1"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />

        {/* Primary data line (solid dark charcoal) */}
        <path
          d={smoothPath(pts)}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {pts.map((pt, i) => {
          const active = hoverIdx === i
          const pos = pt.val >= 0
          return (
            <g key={i}>
              {active && (
                <>
                  <circle
                    cx={pt.x} cy={pt.y} r="14"
                    fill="none" stroke={pos ? '#16a34a' : '#dc2626'}
                    strokeWidth="0.5" opacity="0.25"
                  />
                  <circle
                    cx={pt.x} cy={pt.y} r="9"
                    fill="none" stroke={pos ? '#16a34a' : '#dc2626'}
                    strokeWidth="0.75" opacity="0.4"
                  />
                  <line
                    x1={pt.x} y1={pt.y}
                    x2={pt.x} y2={chartT + chartH}
                    stroke="#9ca3af"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.5"
                  />
                  <circle
                    cx={pt.x} cy={chartT + chartH} r="2"
                    fill="#9ca3af" opacity="0.6"
                  />
                </>
              )}
              <circle
                cx={pt.x} cy={pt.y}
                r={active ? 4.5 : 2.5}
                fill={active ? '#1f2937' : '#4b5563'}
                stroke="#fff"
                strokeWidth={active ? 2 : 1.5}
              />
            </g>
          )
        })}

        {/* X-axis labels */}
        {pts.map((pt, i) => {
          const show = i === 0 || i === pts.length - 1 || i % 2 === 0
          if (!show) return null
          return (
            <text
              key={i}
              x={pt.x}
              y={chartT + chartH + 14}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize="8"
              fontFamily="Inter, Sora, system-ui, sans-serif"
              fontWeight="500"
            >
              {pt.label}
            </text>
          )
        })}
      </svg>

      {/* ══ Absolute-positioned tooltip (DOM, not SVG) ═══ */}
      {hoverPt && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${Math.max(2, Math.min(hoverPt.x / vw * 100, 85))}%`,
            top: `${Math.max(4, hoverPt.y / vh * 100 - 22)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className="rounded-md px-2 py-1 text-center shadow-lg"
              style={{ background: '#0f0f0f' }}
            >
              <div
                className="text-[10px] font-bold leading-tight"
                style={{
                  color: hoverPt.val >= 0 ? '#22c55e' : '#f87171',
                  fontFamily: 'Inter, Sora, system-ui, sans-serif',
                }}
              >
                {hoverPt.val >= 0 ? '+' : ''}{hoverPt.val.toFixed(2)}%
              </div>
              <div
                className="text-[7px] font-medium leading-tight mt-px"
                style={{ color: '#9ca3af', fontFamily: 'Inter, Sora, system-ui, sans-serif' }}
              >
                {hoverPt.label}
              </div>
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
        <div
          className="rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed"
          style={{ color: '#374151' }}
        >
          Alpha{' '}
          <span className={avgGrowth >= 0 ? 'text-green-600' : 'text-red-500'}>
            {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
          </span>
        </div>
        <div
          className="rounded-full bg-gray-100/90 px-2 py-0.5 text-[9px] font-semibold leading-relaxed"
          style={{ color: '#374151' }}
        >
          Sharpe{' '}
          <span className={sharpe >= 1 ? 'text-green-600' : 'text-amber-600'}>
            {sharpe.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
})

export { PerformanceChart }
