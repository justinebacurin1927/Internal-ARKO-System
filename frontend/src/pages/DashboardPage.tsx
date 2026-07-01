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

  const teamAvatars = users?.slice(0, 6) ?? []

  const priorityBars = [
    { label: 'Urgent', value: tasks?.filter((t: any) => t.priority === 'URGENT').length ?? 0, color: '#ef4444' },
    { label: 'High', value: tasks?.filter((t: any) => t.priority === 'HIGH').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: tasks?.filter((t: any) => t.priority === 'MEDIUM').length ?? 0, color: '#22c55e' },
    { label: 'Low', value: tasks?.filter((t: any) => t.priority === 'LOW').length ?? 0, color: '#9ca3af' },
  ]

  const maxChartValue = Math.max(...chartData.income, ...chartData.expenses, 1)

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
          {/* Performance Chart */}
          <Card className="shrink-0 h-[200px] overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[11px] font-bold text-gray-800">Income & Expenses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0">
              <div className="h-full flex items-end gap-2">
                {chartData.labels.map((label, i) => {
                  const incH = (chartData.income[i] / maxChartValue) * 100
                  const expH = (chartData.expenses[i] / maxChartValue) * 100
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                      <div className="relative w-full flex flex-col items-center gap-0.5" style={{ maxHeight: '85%' }}>
                        <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(incH, 0)}%`, minHeight: chartData.income[i] > 0 ? 4 : 0, backgroundColor: '#22c55e' }} />
                        <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(expH, 0)}%`, minHeight: chartData.expenses[i] > 0 ? 4 : 0, backgroundColor: '#f87171' }} />
                      </div>
                      <span className="text-[8px] text-gray-400 shrink-0">{label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Overview / Recent Updates */}
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
                    {completedTasks} done · {openTasks} open{balance ? ` · ₱${balance.balance.toLocaleString()}` : ''}
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
