'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import { PerformanceChart } from './performance-chart'
import {
  Wallet,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  GitCommit,
  ExternalLink,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

// ── helpers ──────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(n)
}

// ── Dashboard content ────────────────────────────────────
export default function DashboardContent() {
  const { data: balance } = api.finance.getBalance.useQuery()
  const { data: tasks } = api.tasks.list.useQuery()
  const { data: transactions } = api.finance.getTransactions.useQuery()
  const { data: users } = api.users.search.useQuery({})
  const { data: updates, isLoading: ghLoading } = api.github.recentCommits.useQuery({ limit: 8 })

  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length ?? 0
  const openTasks = tasks?.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length ?? 0
  const reviewTasks = tasks?.filter((t) => t.status === 'REVIEW').length ?? 0
  const recentTx = transactions?.slice(0, 2) ?? []

  const totalTasks = tasks?.length ?? 0
  const donePct = totalTasks ? (completedTasks / totalTasks) * 100 : 0
  const reviewPct = totalTasks ? (reviewTasks / totalTasks) * 100 : 0
  const openPct = totalTasks ? (openTasks / totalTasks) * 100 : 0

  // ── Chart data: monthly income/expenses ────────────────
  const chartData = useMemo(() => {
    if (!transactions)
      return { income: [0, 0, 0, 0, 0, 0], expenses: [0, 0, 0, 0, 0, 0], labels: [] as string[] }
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

  // ── Growth rate metadata for legend ────────────────────
  const growthMeta = useMemo(() => {
    if (chartData.labels.length < 2) return { best: 0, worst: 0 }
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

  // ── helpers ──
  const commits = updates?.commits ?? []
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h`
  }

  const teamAvatars = users?.slice(0, 6) ?? []

  const priorityBars = [
    { label: 'Urgent', value: tasks?.filter((t) => t.priority === 'URGENT').length ?? 0, color: '#ef4444' },
    { label: 'High', value: tasks?.filter((t) => t.priority === 'HIGH').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: tasks?.filter((t) => t.priority === 'MEDIUM').length ?? 0, color: '#22c55e' },
    { label: 'Low', value: tasks?.filter((t) => t.priority === 'LOW').length ?? 0, color: '#9ca3af' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* ── Header row — action buttons ──────────────── */}
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

      {/* ── Main grid ───────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4 flex-1 min-h-0">
        {/* ══ LEFT COLUMN (content-sized) ════════════ */}
        <div className="flex flex-col gap-4 min-h-0 self-start w-full">

          {/* ── Cash Balance ──────────────────────── */}
          <Card className="shrink-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Cash Balance
                  </p>
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
                  <span className="text-[10px] font-semibold text-gray-900">
                    {formatCurrency(balance?.income ?? 0)}
                  </span>
                  <span className="text-[9px] text-gray-400">in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-900">
                    {formatCurrency(balance?.expenses ?? 0)}
                  </span>
                  <span className="text-[9px] text-gray-400">out</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Team + Priority ── */}
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
                    <span className="w-8 text-[8px] font-medium text-gray-500 text-right shrink-0">
                      {i.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${totalTasks ? (i.value / totalTasks) * 100 : 0}%`,
                          backgroundColor: i.color,
                        }}
                      />
                    </div>
                    <span className="w-4 text-[8px] font-semibold text-gray-600 text-right">
                      {i.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Task Progress ──────────────────────── */}
          <Card className="shrink-0 h-32 overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[11px] font-bold text-gray-800">
                Task Progress
              </CardTitle>
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
                      <div
                        className="flex flex-col items-center w-full"
                        style={{ flex: `${barWeight}` }}
                      >
                        <span className="text-[9px] font-semibold text-gray-500">
                          {Math.round(s.pct)}%
                        </span>
                        <div
                          className="w-full rounded-full min-h-[4px] transition-all duration-500"
                          style={{ flex: 1, backgroundColor: s.color }}
                        />
                      </div>
                      <span className="text-[8px] text-gray-400 truncate pt-0.5">
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Recent Transactions ────────────────── */}
          <Card className="shrink-0 overflow-hidden">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-bold text-gray-800">
                Transactions
              </CardTitle>
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
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
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

        {/* ══ RIGHT COLUMN ────────────────────────── */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* ── Performance Growth ──────────────────── */}
          <Card className="shrink-0 h-[200px] overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[11px] font-bold text-gray-800">
                  Net Growth
                </CardTitle>
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
              <PerformanceChart
                incomeData={chartData.income}
                expenseData={chartData.expenses}
                labels={chartData.labels}
              />
            </CardContent>
          </Card>

          {/* ── Recent Updates ─────────────────────── */}
          <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-[11px] font-bold text-gray-800">
                Recent Updates
              </CardTitle>
              <GitCommit className="h-3 w-3 text-gray-400" />
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              {ghLoading ? (
                <div className="flex flex-col gap-2 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="h-5 w-5 shrink-0 rounded-full bg-gray-100 animate-pulse" />
                      <div className="h-3 flex-1 rounded bg-gray-100 animate-pulse" />
                      <div className="h-3 w-8 rounded bg-gray-100 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : commits.length === 0 ? (
                <div className="flex items-center justify-center h-full py-6">
                  <p className="text-[10px] text-gray-400">No recent commits</p>
                </div>
              ) : (
                commits.map((commit) => {
                  const msg = commit.commit.message.split('\n')[0]
                  const cat = msg.match(/^(\w+)/)?.[1]?.toLowerCase() ?? ''
                  const isFeature = cat === 'feat'
                  const isFix = cat === 'fix'
                  return (
                    <a
                      key={commit.sha}
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                        <GitCommit className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                      <p className="flex-1 text-[10px] text-gray-700 truncate min-w-0">
                        {msg}
                      </p>
                      {isFeature && (
                        <span className="shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold uppercase bg-primary-50 text-primary-700 leading-none">
                          feat
                        </span>
                      )}
                      {isFix && (
                        <span className="shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold uppercase bg-green-50 text-green-700 leading-none">
                          fix
                        </span>
                      )}
                      <span className="shrink-0 text-[9px] tabular-nums text-gray-400">
                        {timeAgo(commit.commit.author.date)}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </a>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
