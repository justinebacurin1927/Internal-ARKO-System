import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import {
  Wallet,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  GitCommit,
} from 'lucide-react'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(n)
}

export default function DashboardHome() {
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.getBalance(),
  })
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions(6),
  })
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.searchUsers(),
  })

  const completedTasks = tasks?.filter((t: any) => t.status === 'DONE').length ?? 0
  const openTasks = tasks?.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length ?? 0
  const reviewTasks = tasks?.filter((t: any) => t.status === 'REVIEW').length ?? 0
  const recentTx = transactions?.slice(0, 2) ?? []

  const totalTasks = tasks?.length ?? 0
  const donePct = totalTasks ? (completedTasks / totalTasks) * 100 : 0
  const reviewPct = totalTasks ? (reviewTasks / totalTasks) * 100 : 0
  const openPct = totalTasks ? (openTasks / totalTasks) * 100 : 0

  const chartData = useMemo(() => {
    if (!transactions)
      return { income: [0, 0, 0, 0, 0, 0], expenses: [0, 0, 0, 0, 0, 0], labels: [] as string[] }
    const months: Record<string, { inc: number; exp: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months[m.toLocaleDateString('en-US', { month: 'short' })] = { inc: 0, exp: 0 }
    }
    transactions.forEach((tx: any) => {
      const key = new Date(tx.date).toLocaleDateString('en-US', { month: 'short' })
      if (key in months) {
        if (tx.type === 'INCOME') months[key].inc += tx.amount
        else months[key].exp += tx.amount
      }
    })
    return {
      income: Object.values(months).map((m) => m.inc),
      expenses: Object.values(months).map((m) => m.exp),
      labels: Object.keys(months),
    }
  }, [transactions])

  // Growth rate metadata
  const growthMeta = useMemo(() => {
    if (!chartData || chartData.labels.length < 2) return { best: 0, worst: 0 }
    let best = -Infinity, worst = Infinity
    for (let i = 1; i < chartData.labels.length; i++) {
      const prev = (chartData.income[i - 1] ?? 0) - (chartData.expenses[i - 1] ?? 0)
      const curr = (chartData.income[i] ?? 0) - (chartData.expenses[i] ?? 0)
      const growth = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0
      if (growth > best) best = growth
      if (growth < worst) worst = growth
    }
    return {
      best: isFinite(best) ? best : 0,
      worst: isFinite(worst) ? worst : 0,
    }
  }, [chartData])

  const teamAvatars = users?.slice(0, 6) ?? []

  const priorityBars = [
    { label: 'Urgent', value: tasks?.filter((t: any) => t.priority === 'URGENT').length ?? 0, color: '#ef4444' },
    { label: 'High', value: tasks?.filter((t: any) => t.priority === 'HIGH').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: tasks?.filter((t: any) => t.priority === 'MEDIUM').length ?? 0, color: '#22c55e' },
    { label: 'Low', value: tasks?.filter((t: any) => t.priority === 'LOW').length ?? 0, color: '#9ca3af' },
  ]

  // Compute net growth rates for the SVG chart
  const plotRates = useMemo(() => {
    if (chartData.labels.length < 2) return []
    const rates: number[] = []
    for (let i = 1; i < chartData.labels.length; i++) {
      const prevNet = (chartData.income[i - 1] ?? 0) - (chartData.expenses[i - 1] ?? 0)
      const currNet = (chartData.income[i] ?? 0) - (chartData.expenses[i] ?? 0)
      const growth = prevNet !== 0 ? ((currNet - prevNet) / Math.abs(prevNet)) * 100 : 0
      rates.push(parseFloat(growth.toFixed(2)))
    }
    return rates
  }, [chartData])

  const chartLabels = chartData.labels.slice(1) // skip first month for growth rates
  const isFlat = plotRates.length > 0 && plotRates.every((r) => r === plotRates[0])

  // SVG chart geometry
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

  const rawMin = Math.min(0, ...plotRates)
  const rawMax = Math.max(0, ...plotRates)
  let dataMin: number, dataMax: number
  if (isFlat && plotRates.length > 0) {
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
  const xStep = chartW / Math.max(plotRates.length - 1, 1)

  const pts = plotRates.map((v, i) => ({
    x: chartL + i * xStep,
    y: yScale(v),
    val: v,
    label: chartLabels[i] ?? '',
  }))

  // Smooth path
  const smoothPath = (points: { x: number; y: number }[]) => {
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

  const benchmarkY = yScale(0)
  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v++) yTicks.push(v)

  return (
    <div className="h-full flex flex-col">
      {/* Header row — action buttons */}
      <div className="flex items-center justify-end shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm hover:border-gray-300 active:scale-[0.97]">
            <Plus className="h-3 w-3" />
            Task
          </button>
          <button className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm active:scale-[0.97]">
            <TrendingUp className="h-3 w-3" />
            Report
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4 flex-1 min-h-0">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4 min-h-0 self-start w-full">
          {/* Cash Balance */}
          <Card className="shrink-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cash Balance</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">
                    {formatCurrency(balance?.balance ?? 0)}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3 w-3 text-finance-600 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-900">{formatCurrency(balance?.income ?? 0)}</span>
                  <span className="text-[9px] text-gray-400">in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-900">{formatCurrency(balance?.expenses ?? 0)}</span>
                  <span className="text-[9px] text-gray-400">out</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team + Priority */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <Card className="overflow-hidden">
              <CardHeader className="px-2.5 pt-2 pb-0">
                <CardTitle className="text-[10px] font-bold text-gray-800">Team</CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 pb-2.5 pt-2 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {teamAvatars.length === 0 ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-3 w-3 text-gray-400" />
                    </div>
                  ) : (
                    teamAvatars.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-400 to-primary-500 text-[9px] font-bold text-white shadow-sm"
                        title={u.name ?? u.email}
                      >
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] text-gray-400">{teamAvatars.length}</span>
                  <span className="text-[9px] font-medium text-primary-600">View</span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="px-2.5 pt-2 pb-0">
                <CardTitle className="text-[10px] font-bold text-gray-800">Priority</CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 pb-2.5 pt-2 flex flex-col gap-1">
                {priorityBars.map((i) => (
                  <div key={i.label} className="flex items-center gap-1.5">
                    <span className="w-8 text-[8px] font-medium text-gray-500 text-right shrink-0">{i.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalTasks ? (i.value / totalTasks) * 100 : 0}%`, backgroundColor: i.color }} />
                    </div>
                    <span className="w-4 text-[8px] font-semibold text-gray-600 text-right">{i.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Task Progress */}
          <Card className="shrink-0 h-32 overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[11px] font-bold text-gray-800">Task Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
              <div className="flex gap-1.5 flex-1 min-h-0">
                {[
                  { label: 'Open', pct: openPct, color: '#6366f1' },
                  { label: 'Review', pct: reviewPct, color: '#f59e0b' },
                  { label: 'Done', pct: donePct, color: '#22c55e' },
                ].map((s) => {
                  const barWeight = Math.max(s.pct, 5)
                  return (
                    <div key={s.label} className="flex-1 flex flex-col items-center min-h-0">
                      <div className="w-full" style={{ flex: `${100 - barWeight}` }} />
                      <div className="flex flex-col items-center w-full" style={{ flex: `${barWeight}` }}>
                        <span className="text-[9px] font-semibold text-gray-500">{Math.round(s.pct)}%</span>
                        <div className="w-full rounded-full min-h-[4px] transition-all duration-500" style={{ flex: 1, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[8px] text-gray-400 truncate pt-0.5">{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="shrink-0 overflow-hidden">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-bold text-gray-800">Transactions</CardTitle>
              <span className="text-[9px] font-medium text-primary-600">View all</span>
            </CardHeader>
            <CardContent className="p-0">
              {recentTx.length === 0 ? (
                <div className="flex flex-col items-center py-4">
                  <Wallet className="h-5 w-5 text-gray-200 mb-1" />
                  <p className="text-[10px] text-gray-400">No transactions yet</p>
                </div>
              ) : (
                <div>
                  {recentTx.map((tx: any, i: number) => (
                    <div key={tx.id} className={`flex items-center justify-between px-4 py-2.5 ${i === 0 ? 'border-b border-gray-100' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tx.type === 'INCOME' ? 'bg-finance-50 text-finance-600' : 'bg-red-50 text-red-500'}`}>
                          {tx.type === 'INCOME' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-gray-900 truncate">{tx.description || 'Transaction'}</p>
                          <p className="text-[9px] text-gray-400">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ${tx.type === 'INCOME' ? 'text-finance-600' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Net Growth Chart */}
          <Card className="shrink-0 h-[200px] overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[11px] font-bold text-gray-800">Net Growth</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[8px] font-medium text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    +{growthMeta.best.toFixed(2)}%
                  </span>
                  <span className="flex items-center gap-1 text-[8px] font-medium text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {growthMeta.worst.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0">
              {chartData.labels.length < 2 || plotRates.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[11px] text-gray-300 select-none">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-light text-gray-200">—</span>
                    <span>Loading data...</span>
                  </div>
                </div>
              ) : (
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
                          <line x1={chartL} y1={y} x2={chartL + chartW} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                          <text x={chartL - 5} y={y + 3} textAnchor="end" className="fill-gray-400" fontSize="8" fontFamily="Inter, system-ui, sans-serif" fontWeight="500">
                            {v > 0 ? `+${v}%` : `${v}%`}
                          </text>
                        </g>
                      )
                    })}

                    {/* Benchmark 0% line */}
                    <line x1={chartL} y1={benchmarkY} x2={chartL + chartW} y2={benchmarkY} stroke="#d1d5db" strokeWidth="1" strokeDasharray="5 4" strokeLinecap="round" />

                    {/* Data line */}
                    <path d={smoothPath(pts)} fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data points */}
                    {pts.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r={2.5} fill="#4b5563" stroke="#fff" strokeWidth={1.5} />
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {pts.map((pt, i) => {
                      if (i !== 0 && i !== pts.length - 1 && i % 2 !== 0) return null
                      return (
                        <text key={i} x={pt.x} y={chartT + chartH + 14} textAnchor="middle" className="fill-gray-400" fontSize="8" fontFamily="Inter, system-ui, sans-serif" fontWeight="500">
                          {pt.label}
                        </text>
                      )
                    })}
                  </svg>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Updates */}
          <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-[11px] font-bold text-gray-800">Recent Updates</CardTitle>
              <GitCommit className="h-3 w-3 text-gray-400" />
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              <div className="flex items-center justify-center h-full py-6">
                <div className="text-center px-4">
                  <p className="text-[11px] font-medium text-gray-700">{totalTasks} total tasks</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {completedTasks} done · {openTasks} open · {reviewTasks} review
                    {balance ? ` · ${formatCurrency(balance.balance)}` : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}