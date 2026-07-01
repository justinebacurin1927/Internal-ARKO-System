'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import {
  Wallet,
  Workflow,
  CheckSquare,
  Plus,
  TrendingUp,
  Users,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
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

// ── Skeletons ────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className ?? ''}`} />
}

// ── Decor block (layered color blocks behind cards) ─────
function DecorBlocks() {
  return (
    <div className="pointer-events-none absolute -top-4 right-4 flex flex-col gap-2">
      <div className="h-10 w-28 rounded-2xl bg-primary-400/30 backdrop-blur-sm rotate-6" />
      <div className="h-10 w-24 rounded-2xl bg-workflow-400/30 backdrop-blur-sm -rotate-3 -mt-6 ml-4" />
      <div className="h-10 w-20 rounded-2xl bg-task-400/30 backdrop-blur-sm rotate-2 -mt-6 ml-8" />
    </div>
  )
}

// ── Dual-line SVG chart ─────────────────────────────────
function LineChart({
  incomeData,
  expenseData,
  labels,
}: {
  incomeData: number[]
  expenseData: number[]
  labels: string[]
}) {
  const w = 400, h = 180, pad = 32

  const max = Math.max(...incomeData, ...expenseData, 1)
  const xStep = (w - pad * 2) / Math.max(labels.length - 1, 1)
  const scale = (v: number) => h - pad - ((v / max) * (h - pad * 2))

  const incomeLine = incomeData.map((v, i) => `${pad + i * xStep},${scale(v)}`).join(' ')
  const expenseLine = expenseData.map((v, i) => `${pad + i * xStep},${scale(v)}`).join(' ')

  // last data point for tooltip
  const lastI = labels.length - 1
  const tipX = pad + lastI * xStep
  const tipInY = scale(incomeData[lastI])
  const tipExY = scale(expenseData[lastI])

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad + (h - pad * 2) * (1 - frac)
        return (
          <g key={frac}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
            <text x={pad - 4} y={y + 3} textAnchor="end" className="fill-gray-400 text-[8px]">
              {formatCurrency(max * frac)}
            </text>
          </g>
        )
      })}

      {/* income line */}
      <polyline fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={incomeLine} />
      {incomeData.map((v, i) => (
        <circle key={i} cx={pad + i * xStep} cy={scale(v)} r="3" fill="#22c55e" stroke="white" strokeWidth="1.5" />
      ))}

      {/* expense line */}
      <polyline fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={expenseLine} />
      {expenseData.map((v, i) => (
        <circle key={i} cx={pad + i * xStep} cy={scale(v)} r="3" fill="#f97316" stroke="white" strokeWidth="1.5" />
      ))}

      {/* x labels */}
      {labels.map((l, i) => (
        <text key={i} x={pad + i * xStep} y={h - 4} textAnchor="middle" className="fill-gray-400 text-[8px]">
          {l}
        </text>
      ))}

      {/* tooltip on last point */}
      <g>
        <rect x={tipX - 4} y={Math.min(tipInY, tipExY) - 28} width="52" height="36" rx="6" className="fill-white drop-shadow-md" />
        <rect x={tipX + 44} y={tipInY - 3} width="4" height="4" rx="1" fill="#22c55e" />
        <text x={tipX + 6} y={tipInY - 10} className="text-[8px] fill-gray-700 font-semibold">
          {formatCurrency(incomeData[lastI])}
        </text>
        <rect x={tipX + 44} y={tipExY - 3} width="4" height="4" rx="1" fill="#f97316" />
        <text x={tipX + 6} y={tipExY + 6} className="text-[8px] fill-gray-700 font-semibold">
          {formatCurrency(expenseData[lastI])}
        </text>
      </g>
    </svg>
  )
}

// ── Progress meter (vertical pill blocks) ───────────────
function ProgressMeter({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((s, g) => s + g.count, 0) || 1
  return (
    <div className="flex items-end gap-2 h-32">
      {segments.map((s) => {
        const pct = (s.count / total) * 100
        return (
          <div key={s.label} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
            <span className="text-[10px] font-semibold text-gray-500">{s.count}</span>
            <div
              className="w-full rounded-full transition-all duration-500"
              style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: s.color }}
            />
            <span className="text-[9px] text-gray-400 truncate max-w-full">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Pill bar chart ──────────────────────────────────────
function PillBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3">
          <span className="w-16 text-[11px] font-medium text-gray-500 text-right shrink-0">{i.label}</span>
          <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(i.value / max) * 100}%`, backgroundColor: i.color }}
            />
          </div>
          <span className="w-8 text-[11px] font-semibold text-gray-600">{i.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard page ───────────────────────────────────────
export default function DashboardPage() {
  const { data: balance, isLoading: balLoading } = api.finance.getBalance.useQuery()
  const { data: workflows, isLoading: wfLoading } = api.workflows.list.useQuery()
  const { data: tasks, isLoading: tasksLoading } = api.tasks.list.useQuery()
  const { data: transactions, isLoading: txLoading } = api.finance.getTransactions.useQuery()
  const { data: users } = api.users.search.useQuery({})

  const loading = balLoading || wfLoading || tasksLoading || txLoading

  const activeWorkflows = workflows?.filter((w) => w.status === 'ACTIVE').length ?? 0
  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length ?? 0
  const openTasks = tasks?.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length ?? 0
  const reviewTasks = tasks?.filter((t) => t.status === 'REVIEW').length ?? 0
  const recentTransactions = transactions?.slice(0, 3) ?? []

  // Simulate monthly data from actual transactions for the chart
  const chartData = useMemo(() => {
    if (!transactions) return { income: [0, 0, 0, 0, 0, 0], expenses: [0, 0, 0, 0, 0, 0], labels: [] as string[] }
    const months: Record<string, { inc: number; exp: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = m.toLocaleDateString('en-US', { month: 'short' })
      months[key] = { inc: 0, exp: 0 }
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

  // User avatars for the team section
  const teamAvatars = users?.slice(0, 6) ?? []

  // Task status groupings for progress meter
  const taskSegments = [
    { label: 'To Do', count: tasks?.filter((t) => t.status === 'TODO').length ?? 0, color: '#9ca3af' },
    { label: 'Progress', count: tasks?.filter((t) => t.status === 'IN_PROGRESS').length ?? 0, color: '#6366f1' },
    { label: 'Review', count: reviewTasks, color: '#f59e0b' },
    { label: 'Done', count: completedTasks, color: '#22c55e' },
  ]

  // Priority data for pill bar chart
  const priorityBars = [
    { label: 'Urgent', value: tasks?.filter((t) => t.priority === 'URGENT').length ?? 0, color: '#ef4444' },
    { label: 'High', value: tasks?.filter((t) => t.priority === 'HIGH').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: tasks?.filter((t) => t.priority === 'MEDIUM').length ?? 0, color: '#22c55e' },
    { label: 'Low', value: tasks?.filter((t) => t.priority === 'LOW').length ?? 0, color: '#9ca3af' },
  ]

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Header — bold greeting + capsule action buttons */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here&apos;s what&apos;s happening today</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.97]">
            <Plus className="h-3.5 w-3.5" />
            Create Task
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.97]">
            <Plus className="h-3.5 w-3.5" />
            Workflow
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.97]">
            <TrendingUp className="h-3.5 w-3.5" />
            New Report
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ── LEFT COLUMN ───────────────────────────── */}
          <div className="space-y-5">
            {/* Card 1 — Decor blocks + Balance stats */}
            <Card className="relative overflow-hidden">
              <DecorBlocks />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cash Balance</p>
                    <p className="mt-1.5 text-3xl font-black text-gray-900">
                      {formatCurrency(balance?.balance ?? 0)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/20">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex gap-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-finance-50">
                      <ArrowUpRight className="h-3 w-3 text-finance-600" />
                    </span>
                    <div>
                      <p className="text-[11px] text-gray-400">Income</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(balance?.income ?? 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    </span>
                    <div>
                      <p className="text-[11px] text-gray-400">Expenses</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(balance?.expenses ?? 0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 — Progress Meter */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-800">Task Progress</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ProgressMeter segments={taskSegments} />
              </CardContent>
            </Card>

            {/* Card 3 — Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-800">Recent Transactions</CardTitle>
                <span className="text-[10px] font-medium text-primary-600 hover:text-primary-700 cursor-pointer">View all</span>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Wallet className="h-8 w-8 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">No transactions yet.</p>
                  </div>
                ) : (
                  <div>
                    {recentTransactions.map((tx, i) => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-gray-50 ${
                          i < recentTransactions.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              tx.type === 'INCOME' ? 'bg-finance-50 text-finance-600' : 'bg-red-50 text-red-500'
                            }`}
                          >
                            {tx.type === 'INCOME' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {tx.description || tx.category?.name || 'Transaction'}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold ${
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

          {/* ── RIGHT COLUMN ──────────────────────────── */}
          <div className="space-y-5">
            {/* Card 1 — Dual-line Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Income vs Expenses</CardTitle>
                  <p className="text-[10px] text-gray-400 mt-0.5">Last 6 months</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-primary-500" />
                    Income
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-workflow-500" />
                    Expenses
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-44">
                  <LineChart
                    incomeData={chartData.income}
                    expenseData={chartData.expenses}
                    labels={chartData.labels}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2 — Team Avatars */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-800">Team</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {teamAvatars.length === 0 ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Users className="h-4 w-4 text-gray-400" />
                      </div>
                    ) : (
                      teamAvatars.map((u) => (
                        <div
                          key={u.id}
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-400 to-primary-500 text-[11px] font-bold text-white shadow-sm"
                          title={u.name ?? u.email}
                        >
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600">
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{teamAvatars.length} active members</span>
                  <span className="font-medium text-primary-600 cursor-pointer hover:text-primary-700">View all</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 — Pill Bar Chart: Priority Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-800">By Priority</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <PillBar items={priorityBars} />
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Total tasks</span>
                  <span className="text-sm font-bold text-gray-900">{tasks?.length ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
