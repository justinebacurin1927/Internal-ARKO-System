'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import {
  Wallet,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from 'lucide-react'
import { api } from '../../lib/trpc/client'

// ── helpers ──────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(n)
}

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-gray-100" />
}

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

// ── Mid-sized line chart ─────────────────────────────────
function LineChart({
  incomeData,
  expenseData,
  labels,
}: {
  incomeData: number[]
  expenseData: number[]
  labels: string[]
}) {
  if (labels.length === 0)
    return <div className="flex items-center justify-center h-full text-[11px] text-gray-300">No data</div>

  const w = 400, h = 140, pad = 10
  const max = Math.max(...incomeData, ...expenseData, 1)
  const xStep = (w - pad * 2) / Math.max(labels.length - 1, 1)
  const scale = (v: number) => h - pad - ((v / max) * (h - pad * 2))

  const incomePts = incomeData.map((v, i) => ({ x: pad + i * xStep, y: scale(v) }))
  const expensePts = expenseData.map((v, i) => ({ x: pad + i * xStep, y: scale(v) }))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad + (h - pad * 2) * (1 - frac)
        return <line key={frac} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
      })}
      {/* Income line (smooth bezier) */}
      <path d={smoothPath(incomePts)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {incomeData.map((v, i) => (
        <circle key={`i${i}`} cx={pad + i * xStep} cy={scale(v)} r="3" fill="#22c55e" stroke="white" strokeWidth="1.5" />
      ))}
      {/* Expense line (smooth bezier) */}
      <path d={smoothPath(expensePts)} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {expenseData.map((v, i) => (
        <circle key={`e${i}`} cx={pad + i * xStep} cy={scale(v)} r="3" fill="#f97316" stroke="white" strokeWidth="1.5" />
      ))}
      {/* X-axis labels */}
      {labels
        .filter((_, i) => i % 2 === 0 || i === labels.length - 1)
        .map((l, i, arr) => {
          const idx = i === arr.length - 1 ? labels.length - 1 : i * 2
          return (
            <text key={idx} x={pad + idx * xStep} y={h - 2} textAnchor="middle" className="fill-gray-400 text-[8px]">
              {l}
            </text>
          )
        })}
    </svg>
  )
}

// ── Dashboard page ───────────────────────────────────────
export default function DashboardPage() {
  const { data: balance, isLoading: balLoading } = api.finance.getBalance.useQuery()
  const { data: tasks, isLoading: tasksLoading } = api.tasks.list.useQuery()
  const { data: transactions, isLoading: txLoading } = api.finance.getTransactions.useQuery()
  const { data: users } = api.users.search.useQuery({})

  const loading = balLoading || tasksLoading || txLoading

  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length ?? 0
  const openTasks = tasks?.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length ?? 0
  const reviewTasks = tasks?.filter((t) => t.status === 'REVIEW').length ?? 0
  const recentTx = transactions?.slice(0, 2) ?? []

  const totalTasks = tasks?.length ?? 0
  const donePct = totalTasks ? (completedTasks / totalTasks) * 100 : 0
  const reviewPct = totalTasks ? (reviewTasks / totalTasks) * 100 : 0
  const openPct = totalTasks ? (openTasks / totalTasks) * 100 : 0

  const chartData = useMemo(() => {
    if (!transactions) return { income: [0, 0, 0, 0, 0, 0], expenses: [0, 0, 0, 0, 0, 0], labels: [] as string[] }
    const months: Record<string, { inc: number; exp: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months[m.toLocaleDateString('en-US', { month: 'short' })] = { inc: 0, exp: 0 }
    }
    transactions.forEach((tx) => {
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

  const teamAvatars = users?.slice(0, 6) ?? []

  const priorityBars = [
    { label: 'Urgent', value: tasks?.filter((t) => t.priority === 'URGENT').length ?? 0, color: '#ef4444' },
    { label: 'High', value: tasks?.filter((t) => t.priority === 'HIGH').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: tasks?.filter((t) => t.priority === 'MEDIUM').length ?? 0, color: '#22c55e' },
    { label: 'Low', value: tasks?.filter((t) => t.priority === 'LOW').length ?? 0, color: '#9ca3af' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header row — compact */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            Good{' '}
            {new Date().getHours() < 12
              ? 'Morning'
              : new Date().getHours() < 18
                ? 'Afternoon'
                : 'Evening'}
          </h1>
          <p className="text-[11px] text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
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

      {/* Cards — asymmetrical layout, no artificial stretching */}
      {loading ? (
        <div className="grid grid-cols-[1fr_1.4fr] gap-4 flex-1 min-h-0">
          <div className="flex flex-col gap-4 min-h-0">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <div className="flex flex-col gap-4 min-h-0">
            <Skeleton />
            <Skeleton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1.4fr] gap-4 flex-1 min-h-0">
          {/* ── LEFT COLUMN (narrower) ───────────────── */}
          <div className="flex flex-col gap-4 min-h-0">

            {/* Cash Balance — compact, natural height */}
            <Card className="shrink-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cash Balance</p>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{formatCurrency(balance?.balance ?? 0)}</p>
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

            {/* Task Progress — bars grow from bottom proportionally */}
            <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
                        {/* Spacer above the bar — takes (100 - pct)% of space */}
                        <div className="w-full" style={{ flex: `${100 - barWeight}` }} />
                        {/* Bar content — takes pct% of space */}
                        <div className="flex flex-col items-center w-full" style={{ flex: `${barWeight}` }}>
                          <span className="text-[9px] font-semibold text-gray-500">{Math.round(s.pct)}%</span>
                          <div
                            className="w-full rounded-full min-h-[4px] transition-all duration-500"
                            style={{ flex: 1, backgroundColor: s.color }}
                          />
                        </div>
                        <span className="text-[8px] text-gray-400 truncate pt-0.5">{s.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions — compact, sized to content */}
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
                    {recentTx.map((tx, i) => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between px-4 py-2.5 ${i === 0 ? 'border-b border-gray-100' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              tx.type === 'INCOME'
                                ? 'bg-finance-50 text-finance-600'
                                : 'bg-red-50 text-red-500'
                            }`}
                          >
                            {tx.type === 'INCOME' ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gray-900 truncate">
                              {tx.description || tx.category?.name || 'Transaction'}
                            </p>
                            <p className="text-[9px] text-gray-400">
                              {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold shrink-0 ${
                            tx.type === 'INCOME' ? 'text-finance-600' : 'text-red-500'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (wider) ────────────────── */}
          <div className="flex flex-col gap-4 min-h-0">

            {/* Income vs Expenses — THE CHART, dominant visual */}
            <Card className="flex-[3] min-h-0 overflow-hidden">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold text-gray-800">Income vs Expenses</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[8px] text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> In
                  </span>
                  <span className="flex items-center gap-1 text-[8px] text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Out
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 flex-1 min-h-0">
                <LineChart incomeData={chartData.income} expenseData={chartData.expenses} labels={chartData.labels} />
              </CardContent>
            </Card>

            {/* Team + Priority — compact side by side, no empty stretch */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <Card className="overflow-hidden">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-[11px] font-bold text-gray-800">Team</CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {teamAvatars.length === 0 ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                        <Users className="h-3 w-3 text-gray-400" />
                      </div>
                    ) : (
                      teamAvatars.map((u) => (
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{teamAvatars.length} members</span>
                    <span className="text-[10px] font-medium text-primary-600">View all</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-[11px] font-bold text-gray-800">By Priority</CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex flex-col gap-1.5 justify-center">
                  {priorityBars.map((i) => (
                    <div key={i.label} className="flex items-center gap-2">
                      <span className="w-10 text-[9px] font-medium text-gray-500 text-right shrink-0">{i.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${totalTasks ? (i.value / totalTasks) * 100 : 0}%`, backgroundColor: i.color }}
                        />
                      </div>
                      <span className="w-5 text-[9px] font-semibold text-gray-600 text-right">{i.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
