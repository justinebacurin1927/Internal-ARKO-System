import { useState, useRef, type KeyboardEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { MetricCard, type MetricStatus } from '../components/ui/MetricCard'
import { Cpu, RefreshCw, Pencil } from 'lucide-react'

/* ─── Helpers ─── */

function sparkline(base: number, direction: 'up' | 'down', volatility = 0.08, points = 8): number[] {
  const arr: number[] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const dir = direction === 'up' ? -t : t
    const jitter = 1 + (Math.random() - 0.5) * volatility
    arr.push(Math.round(base * (1 + dir * 0.15) * jitter * 100) / 100)
  }
  return arr
}

function formatValue(raw: number, def: { suffix: string; decimals: number }): string {
  const abs = Math.abs(raw)
  if (def.suffix === '$' && abs >= 1_000_000) return `$${(raw / 1_000_000).toFixed(1)}M`
  if (def.suffix === '$') return `$${raw.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (def.suffix === '%') return `${raw.toFixed(def.decimals ?? 0)}%`
  if (def.suffix === 'x') return `${raw.toFixed(def.decimals ?? 1)}x`
  return `${raw}`
}

function formatTrend(raw: number, prev: number, def: { key: string; suffix: string }): { value: string; direction: 'up' | 'down' } {
  if (prev === 0) return { value: '', direction: 'up' }
  const diff = raw - prev
  const pct = Math.abs(Math.round((diff / prev) * 100))
  if (def.key === 'churn' || def.key === 'dilution') {
    return { value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp`, direction: diff >= 0 ? 'up' : 'down' }
  }
  if (def.suffix === 'x') {
    return { value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}x`, direction: diff >= 0 ? 'up' : 'down' }
  }
  if (def.suffix === ' mo') {
    return { value: `${diff > 0 ? '+' : ''}${Math.abs(diff).toFixed(0)} mo`, direction: diff >= 0 ? 'up' : 'down' }
  }
  return { value: `${diff > 0 ? '+' : ''}${pct}%`, direction: diff >= 0 ? 'up' : 'down' }
}

/* ─── Status mapping ─── */

const STATUS_MAP: Record<string, MetricStatus> = {
  cac: 'healthy', ltv: 'healthy', 'ltv-cac': 'healthy',
  churn: 'healthy', arpu: 'healthy', roas: 'warning',
  payback: 'warning', dilution: 'warning', 'market-cap': 'neutral', nps: 'warning',
}

/* ─── Component ─── */

export default function MetricsPage() {
  const queryClient = useQueryClient()

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetrics(),
    refetchInterval: 30_000, // re-calc ROAS every 30s
  })

  const updateMetric = useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) =>
      api.updateMetric(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const commitEdit = (key: string, rawValue: string, _def: any) => {
    const parsed = parseFloat(rawValue)
    if (isNaN(parsed)) return
    updateMetric.mutate({ key, value: parsed })
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <RefreshCw className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-sm text-zinc-400">Couldn't load metrics</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['metrics'] })}
          className="text-xs font-medium text-accent-400 hover:text-accent-300 cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-3 pt-0">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Business KPIs
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/90 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
              <div className="mb-1 h-6 w-24 rounded bg-zinc-800" />
              <div className="mt-2 h-5 w-full rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 pt-0">
      {/* Section header */}
      <div className="mb-1 flex shrink-0 items-baseline justify-between">
        <h2
          className="text-base font-bold text-white"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Business KPIs
        </h2>
        <span className="text-[10px] font-medium text-zinc-500">
          {metrics?.length ?? 0} metrics · live
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {metrics?.map((metric: any) => {
          const raw = metric.value ?? 0
          const hist = metric.history?.length
            ? [...metric.history].reverse().map((h: any) => h.value)
            : sparkline(raw, 'up')
          const prev = metric.history?.length
            ? metric.history[0].value
            : raw
          const trendInfo = metric.history?.length
            ? formatTrend(raw, prev, metric)
            : { value: '', direction: 'up' }
          const isEditable = metric.calculation === 'manual'
          const isAuto = metric.calculation === 'calculated' || metric.calculation === 'derived'

          return (
            <div
              key={metric.key}
              className={`relative ${isAuto ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {/* Auto-calculated badge */}
              {isAuto && (
                <span className="absolute -top-2 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-[2px] text-[9px] font-medium text-zinc-400 ring-1 ring-white/5">
                  <Cpu className="h-2.5 w-2.5" />
                  Auto
                </span>
              )}

              {/* If editing - inline input */}
              {updateMetric.isPending && updateMetric.variables?.key === metric.key ? (
                <div className="group relative rounded-xl border border-accent-500/40 bg-zinc-900/90 p-4 shadow-lg shadow-accent-500/5 backdrop-blur-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {metric.name}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">{metric.suffix}</span>
                    <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-800" />
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-600">Saving…</p>
                </div>
              ) : isEditable ? (
                <EditableMetricCard
                  metric={metric}
                  raw={raw}
                  displayValue={formatValue(raw, metric)}
                  trendInfo={trendInfo}
                  hist={hist}
                  status={STATUS_MAP[metric.key] ?? 'neutral'}
                  onCommit={(value) => commitEdit(metric.key, value, metric)}
                />
              ) : (
                <MetricCard
                  name={metric.name}
                  value={formatValue(raw, metric)}
                  trend={trendInfo.direction}
                  trendLabel={trendInfo.value}
                  status={STATUS_MAP[metric.key] ?? 'neutral'}
                  upIsGood={metric.up_is_good}
                  sparklineData={hist}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend & info */}
      <div className="mt-4 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Healthy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Needs attention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-500" />
          Neutral
        </span>
        <span className="flex items-center gap-1 text-zinc-600">
          <Pencil className="h-2.5 w-2.5" />
          Tap to edit
        </span>
        <span className="flex items-center gap-1 text-zinc-600">
          <Cpu className="h-2.5 w-2.5" />
          Auto-calculated
        </span>
      </div>
    </div>
  )
}

/* ─── Editable card (inline input on tap) ─── */

function EditableMetricCard({
  metric, raw, displayValue, trendInfo, hist, status, onCommit,
}: {
  metric: any; raw: number; displayValue: string
  trendInfo: { value: string; direction: 'up' | 'down' }
  hist: number[]; status: MetricStatus
  onCommit: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(String(raw))
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { onCommit(editVal); setEditing(false) }
    if (e.key === 'Escape') { setEditVal(String(raw)); setEditing(false) }
  }

  return (
    <button
      onClick={() => { setEditing(true); setEditVal(String(raw)) }}
      className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:rounded-xl"
    >
      {editing ? (
        <div
          className="group relative rounded-xl border border-accent-500/40 bg-zinc-900/90 p-4 shadow-lg shadow-accent-500/5 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {metric.name}
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{metric.suffix}</span>
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={() => { onCommit(editVal); setEditing(false) }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-lg font-bold text-white outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600">Enter to save · Esc to cancel</p>
        </div>
      ) : (
        <MetricCard
          name={metric.name}
          value={displayValue}
          trend={trendInfo.direction}
          trendLabel={trendInfo.value}
          status={status}
          upIsGood={metric.up_is_good}
          sparklineData={hist}
        />
      )}
    </button>
  )
}
