import { useState, useRef, type KeyboardEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { MetricCard, type MetricStatus } from '../components/ui/MetricCard'
import { Cpu, RefreshCw, Pencil, HelpCircle, X, TrendingUp, Users, DollarSign, Target, BarChart3 } from 'lucide-react'

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

/* ─── Metric glossary ─── */

interface MetricInfo {
  key: string
  name: string
  icon: React.ReactNode
  formula: string
  what: string
  why: string
  target: string
}

const METRIC_GLOSSARY: MetricInfo[] = [
  {
    key: 'cac',
    name: 'Customer Acquisition Cost',
    icon: <DollarSign className="h-4 w-4" />,
    formula: 'Total sales & marketing spend ÷ New customers acquired',
    what: 'How much it costs you to acquire one paying customer — including ads, salaries, tools, and overhead.',
    why: 'The lower your CAC, the more efficient your growth engine. Track it against LTV to know if you\'re building a sustainable business.',
    target: 'Lower is better. Benchmark depends on industry; SaaS typically aims for CAC under $500.',
  },
  {
    key: 'ltv',
    name: 'Lifetime Value',
    icon: <TrendingUp className="h-4 w-4" />,
    formula: 'Average revenue per user × Average customer lifespan',
    what: 'The total revenue you expect from a single customer over their entire relationship with your business.',
    why: 'LTV tells you how much you can afford to spend on acquisition. If LTV < CAC, you lose money on every customer.',
    target: 'Higher is better. Industry ideal: LTV ≥ 3× CAC for healthy unit economics.',
  },
  {
    key: 'ltv-cac',
    name: 'LTV / CAC Ratio',
    icon: <BarChart3 className="h-4 w-4" />,
    formula: 'Lifetime Value ÷ Customer Acquisition Cost',
    what: 'The multiplier that shows how much value you get back for every peso spent on acquisition.',
    why: 'The single most important unit-economics metric. A ratio under 1 means you\'re burning money; over 3 means healthy growth.',
    target: '≥ 3:1 is excellent. 1:1 means you break even. Below 1:1 is unsustainable.',
  },
  {
    key: 'churn',
    name: 'Churn Rate',
    icon: <Users className="h-4 w-4" />,
    formula: 'Customers lost in period ÷ Customers at start of period',
    what: 'The percentage of customers who stop using your product or cancel their subscription in a given period.',
    why: 'Churn is the leak in your bucket. Even with great acquisition, high churn caps your growth and drags down LTV.',
    target: 'Monthly churn under 5% is good; under 2% is elite. SaaS benchmarks: 3–7% monthly.',
  },
  {
    key: 'arpu',
    name: 'ARPU',
    icon: <DollarSign className="h-4 w-4" />,
    formula: 'Total revenue ÷ Total active users / customers',
    what: 'Average Revenue Per User — how much each customer brings in on average over a period.',
    why: 'ARPU shows your pricing power and whether upgrades, cross-sells, or price increases are working.',
    target: 'Higher is better. Track trend over time — a rising ARPU means you\'re capturing more value.',
  },
  {
    key: 'roas',
    name: 'ROAS',
    icon: <Target className="h-4 w-4" />,
    formula: 'Revenue from ads ÷ Cost of those ads',
    what: 'Return On Ad Spend — the direct revenue generated for every peso spent on advertising and marketing.',
    why: 'ROAS tells you if your marketing campaigns are profitable. Below 1:1 means you\'re losing money on ads.',
    target: '4:1 is good, 3:1 is break-even for most businesses. Varies by industry and margins.',
  },
  {
    key: 'payback',
    name: 'Payback Period',
    icon: <BarChart3 className="h-4 w-4" />,
    formula: 'CAC ÷ (Monthly revenue per customer × Gross margin)',
    what: 'How many months it takes to earn back what you spent to acquire a customer.',
    why: 'Shorter payback means faster reinvestment cycle. If it takes 18+ months, you need deep pockets to scale.',
    target: '< 12 months is healthy. < 6 months is excellent. Measured in months.',
  },
  {
    key: 'dilution',
    name: 'Equity Dilution',
    icon: <Users className="h-4 w-4" />,
    formula: 'New shares issued ÷ Total shares outstanding',
    what: 'The percentage reduction in existing shareholders\' ownership when new shares are issued (fundraising, employee options).',
    why: 'Too much dilution disincentivizes early investors and founders. Track it alongside fundraising rounds.',
    target: 'Keep per-round dilution under 20–25%. Total lifetime dilution varies by stage.',
  },
  {
    key: 'market-cap',
    name: 'Market Cap',
    icon: <TrendingUp className="h-4 w-4" />,
    formula: 'Current share price × Total shares outstanding',
    what: 'The total market value of your company\'s outstanding shares — what the public markets think you\'re worth.',
    why: 'Market cap sets your valuation and affects fundraising, talent acquisition, and exit strategy.',
    target: 'Higher is better, but steady growth matters more than spikes. Track trend, not absolute.',
  },
  {
    key: 'nps',
    name: 'Net Promoter Score',
    icon: <Target className="h-4 w-4" />,
    formula: '% Promoters (9–10) − % Detractors (0–6)',
    what: 'A customer loyalty metric based on "How likely are you to recommend us?" Scores range from −100 to +100.',
    why: 'NPS correlates with retention, word-of-mouth growth, and overall customer satisfaction. Leading indicator.',
    target: '+50 is excellent. +30–50 is great. Below 0 needs urgent attention.',
  },
]

/* ─── Component ─── */

export default function MetricsPage() {
  const queryClient = useQueryClient()
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetrics(),
    refetchInterval: 30_000,
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
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center bg-bg-app">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <RefreshCw className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm text-stone-600">Couldn't load metrics</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['metrics'] })}
          className="text-xs font-medium text-accent-600 hover:text-accent-500 cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-3 pt-0 bg-bg-app">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            Business KPIs
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-stone-100" />
                <div className="h-2 w-2 rounded-full bg-stone-200" />
              </div>
              <div className="mb-1 h-6 w-24 rounded bg-stone-100" />
              <div className="mt-2 h-5 w-full rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg-app
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-stone-300
      [&::-webkit-scrollbar-thumb]:hover:bg-stone-400
      [&::-webkit-scrollbar-track]:bg-transparent">
      {/* Section header */}
      <div className="mb-1 flex shrink-0 items-baseline justify-between px-3 pt-3">
        <h2
          className="text-base font-bold text-stone-800"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Business KPIs
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-stone-400">
            {metrics?.length ?? 0} metrics · live
          </span>
          <button
            onClick={() => setGlossaryOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-all cursor-pointer shadow-sm"
          >
            <HelpCircle className="h-3 w-3" />
            What do these mean?
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 px-3 pb-3">
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
            : { value: '', direction: 'up' as const }
          const isEditable = metric.calculation === 'manual'
          const isAuto = metric.calculation === 'calculated' || metric.calculation === 'derived'

          return (
            <div
              key={metric.key}
              className={`relative ${isAuto ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {/* Auto-calculated badge */}
              {isAuto && (
                <span className="absolute -top-2 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-[2px] text-[9px] font-medium text-stone-500 ring-1 ring-stone-200">
                  <Cpu className="h-2.5 w-2.5" />
                  Auto
                </span>
              )}

              {/* If editing - inline input */}
              {updateMetric.isPending && updateMetric.variables?.key === metric.key ? (
                <div className="group relative rounded-xl border border-accent-300 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {metric.name}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-400">{metric.suffix}</span>
                    <div className="h-8 w-full animate-pulse rounded-lg bg-stone-100" />
                  </div>
                  <p className="mt-1.5 text-[10px] text-stone-400">Saving…</p>
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
                  light
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-3 pb-3 text-[10px] text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Healthy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Needs attention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-400" />
          Neutral
        </span>
        <span className="flex items-center gap-1 text-stone-400">
          <Pencil className="h-2.5 w-2.5" />
          Tap to edit
        </span>
        <span className="flex items-center gap-1 text-stone-400">
          <Cpu className="h-2.5 w-2.5" />
          Auto-calculated
        </span>
      </div>

      {/* ── Glossary Modal (lightmode) ── */}
      {glossaryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-6 pb-12"
          onClick={(e) => { if (e.target === e.currentTarget) setGlossaryOpen(false) }}
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => setGlossaryOpen(false)} />
          <div className="relative z-10 mx-4 w-full max-w-2xl animate-in rounded-2xl bg-white p-0 shadow-2xl shadow-black/15">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <HelpCircle className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Metric Glossary</h2>
                  <p className="text-[10px] text-stone-500">What each KPI means and why it matters</p>
                </div>
              </div>
              <button
                onClick={() => setGlossaryOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {METRIC_GLOSSARY.map((m) => (
                <div key={m.key} className="px-6 py-4 transition-colors hover:bg-stone-50/60">
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      {m.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-900">{m.name}</p>
                      <p className="text-[10px] font-mono text-stone-400">{m.formula}</p>
                    </div>
                  </div>
                  <div className="mb-2 ml-9.5">
                    <p className="text-xs font-medium text-emerald-700 mb-0.5">What it is</p>
                    <p className="text-[11px] leading-relaxed text-stone-600">{m.what}</p>
                  </div>
                  <div className="mb-2 ml-9.5">
                    <p className="text-xs font-medium text-amber-700 mb-0.5">Why it matters</p>
                    <p className="text-[11px] leading-relaxed text-stone-600">{m.why}</p>
                  </div>
                  <div className="ml-9.5">
                    <p className="text-xs font-medium text-stone-500 mb-0.5">Target</p>
                    <p className="text-[11px] leading-relaxed text-stone-600">{m.target}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 px-6 py-3.5">
              <p className="text-[10px] text-stone-400">
                Metrics labeled <span className="inline-flex items-center gap-0.5 font-medium text-stone-500"><Cpu className="h-2.5 w-2.5" /> Auto</span> are calculated from your transaction data. Manual metrics can be edited by tapping the card.
              </p>
            </div>
          </div>
        </div>
      )}
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
      className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30 focus-visible:rounded-xl"
    >
      {editing ? (
        <div
          className="group relative rounded-xl border border-accent-300 bg-white p-4 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {metric.name}
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400">{metric.suffix}</span>
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={() => { onCommit(editVal); setEditing(false) }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-lg font-bold text-stone-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-500/8"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-stone-400">Enter to save · Esc to cancel</p>
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
          light
        />
      )}
    </button>
  )
}
