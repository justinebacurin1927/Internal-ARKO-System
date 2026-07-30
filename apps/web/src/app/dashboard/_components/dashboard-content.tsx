'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  GitCommit,
  Plus,
  Target,
  Users,
  Wallet,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { PerformanceChart } from './performance-chart'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function timeAgo(date: string) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const canUseCompany = session?.user?.role === 'ADMIN' || session?.user?.role === 'ACCOUNTANT'
  const [financeScope, setFinanceScope] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL')
  const { data: balance } = api.finance.getBalance.useQuery({ scope: financeScope })
  const { data: insights } = api.finance.getInsights.useQuery({ scope: financeScope })
  const { data: tasks } = api.tasks.list.useQuery()
  const { data: transactions } = api.finance.getTransactions.useQuery({ scope: financeScope })
  const { data: users } = api.users.search.useQuery({})
  const { data: updates, isLoading: updatesLoading } = api.github.recentCommits.useQuery({ limit: 5 })

  const completedTasks = tasks?.filter((task) => task.status === 'DONE').length ?? 0
  const activeTasks = tasks?.filter((task) => task.status !== 'DONE').length ?? 0
  const totalTasks = tasks?.length ?? 0
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const recentTransactions = transactions?.slice(0, 6) ?? []
  const team = users?.slice(0, 5) ?? []
  const commits = updates?.commits ?? []

  const chartData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}
    const now = new Date()
    for (let index = 5; index >= 0; index--) {
      const month = new Date(now.getFullYear(), now.getMonth() - index, 1)
      months[month.toLocaleDateString('en-US', { month: 'short' })] = { income: 0, expenses: 0 }
    }
    for (const transaction of transactions ?? []) {
      const month = new Date(transaction.date).toLocaleDateString('en-US', { month: 'short' })
      if (!months[month]) continue
      if (transaction.type === 'INCOME') months[month].income += transaction.amount
      if (transaction.type === 'EXPENSE') months[month].expenses += transaction.amount
    }
    return {
      labels: Object.keys(months),
      income: Object.values(months).map((month) => month.income),
      expenses: Object.values(months).map((month) => month.expenses),
    }
  }, [transactions])

  return (
    <div className="dashboard-reference mx-auto min-h-full w-full max-w-[1500px]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Track your finances, work, and team performance in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="dashboard-segmented inline-flex min-h-10 items-center p-1">
            {(['PERSONAL', ...(canUseCompany ? ['COMPANY' as const] : [])] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                aria-pressed={financeScope === scope}
                onClick={() => setFinanceScope(scope)}
                className={`min-h-8 rounded-full px-4 text-xs font-medium transition-all ${
                  financeScope === scope
                    ? 'bg-primary-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                {scope === 'PERSONAL' ? 'Personal' : 'Company'}
              </button>
            ))}
          </div>
          <Link href="/dashboard/finance" className="dashboard-outline-button">
            <Plus className="h-4 w-4" />
            New transaction
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card className="dashboard-panel overflow-hidden">
            <CardHeader className="flex-row items-center justify-between p-5 pb-3">
              <CardTitle className="text-base font-medium">Current balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary-400" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="dashboard-balance-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/65">{financeScope === 'PERSONAL' ? 'Personal funds' : 'Company funds'}</span>
                  <CircleDollarSign className="h-5 w-5 text-white/80" />
                </div>
                <p className="mt-10 text-3xl font-semibold tabular-nums text-white">
                  {formatCurrency(balance?.balance ?? 0)}
                </p>
                <p className="mt-1 text-xs text-white/60">{(insights?.savingsRate ?? 0).toFixed(1)}% retained this month</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">Income</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-primary-400">{formatCurrency(balance?.income ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Expenses</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-red-400">{formatCurrency(balance?.expenses ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-panel">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-medium">Task completion</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-text-primary">{completionRate}%</p>
                  <p className="mt-1 text-xs text-text-tertiary">{completedTasks} of {totalTasks} completed</p>
                </div>
                <Target className="h-5 w-5 text-primary-400" />
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-700 to-primary-400" style={{ width: `${completionRate}%` }} />
              </div>
              <Link href="/dashboard/tasks" className="mt-4 inline-flex min-h-9 items-center text-xs font-medium text-primary-400 hover:text-primary-300">
                Manage tasks <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="dashboard-panel">
            <CardHeader className="flex-row items-center justify-between p-5 pb-3">
              <CardTitle className="text-base font-medium">Team</CardTitle>
              <span className="text-xs text-text-tertiary">{users?.length ?? 0} members</span>
            </CardHeader>
            <CardContent className="flex items-center justify-between p-5 pt-0">
              <div className="flex -space-x-2">
                {team.map((user) => (
                  <div
                    key={user.id}
                    title={user.name ?? user.email}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#15171a] bg-gradient-to-br from-primary-700 to-primary-400 text-xs font-semibold text-white"
                  >
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </div>
                ))}
                {team.length === 0 && <Users className="h-5 w-5 text-text-tertiary" />}
              </div>
              <Link href="/dashboard/users" className="text-xs font-medium text-primary-400 hover:text-primary-300">View team</Link>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Income"
              value={formatCurrency(balance?.income ?? 0)}
              detail="Total recorded"
              icon={<ArrowUpRight className="h-4 w-4" />}
              positive
            />
            <MetricCard
              label="Expenses"
              value={formatCurrency(balance?.expenses ?? 0)}
              detail={`${insights?.upcomingCount ?? 0} upcoming`}
              icon={<ArrowDownRight className="h-4 w-4" />}
            />
            <MetricCard
              label="Active tasks"
              value={String(activeTasks)}
              detail={`${completedTasks} completed`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              positive
            />
          </div>

          <Card className="dashboard-panel flex h-[300px] flex-col overflow-hidden">
            <CardHeader className="flex-row items-center justify-between p-5 pb-1">
              <div>
                <CardTitle className="text-base font-medium">Income overview</CardTitle>
                <p className="mt-1 text-xs text-text-tertiary">Six-month financial performance</p>
              </div>
              <div className="hidden items-center gap-3 text-xs text-text-tertiary sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />Income</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Expenses</span>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-4 pt-0">
              <PerformanceChart incomeData={chartData.income} expenseData={chartData.expenses} labels={chartData.labels} />
            </CardContent>
          </Card>

          <Card className="dashboard-panel overflow-hidden">
            <CardHeader className="flex-row items-center justify-between p-5">
              <div>
                <CardTitle className="text-base font-medium">Transactions</CardTitle>
                <p className="mt-1 text-xs text-text-tertiary">Latest activity in this account</p>
              </div>
              <Link href="/dashboard/finance" className="dashboard-small-button">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[1.4fr_.8fr_1fr_.8fr] gap-4 bg-white/[0.025] px-5 py-3 text-[11px] font-medium text-text-tertiary">
                  <span>Transaction</span><span>Type</span><span>Date</span><span className="text-right">Amount</span>
                </div>
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Wallet className="h-6 w-6 text-text-tertiary" />
                    <p className="mt-2 text-sm text-text-tertiary">No transactions yet</p>
                  </div>
                ) : recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="grid min-h-12 grid-cols-[1.4fr_.8fr_1fr_.8fr] items-center gap-4 border-t border-white/[0.045] px-5 py-2.5 text-xs">
                    <span className="truncate font-medium text-text-primary">{transaction.description || transaction.category?.name || 'Transaction'}</span>
                    <span className="text-text-tertiary">{transaction.type.charAt(0) + transaction.type.slice(1).toLowerCase()}</span>
                    <span className="text-text-tertiary">{new Date(transaction.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className={`text-right font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-primary-400' : 'text-red-400'}`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-panel overflow-hidden">
            <CardHeader className="flex-row items-center justify-between p-5 pb-3">
              <CardTitle className="text-base font-medium">Recent updates</CardTitle>
              <GitCommit className="h-4 w-4 text-text-tertiary" />
            </CardHeader>
            <CardContent className="p-0">
              {updatesLoading ? (
                <div className="space-y-2 p-5">
                  {[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-white/[0.035]" />)}
                </div>
              ) : commits.length === 0 ? (
                <p className="p-5 text-sm text-text-tertiary">No recent updates.</p>
              ) : commits.map((commit) => (
                <a
                  key={commit.sha}
                  href={commit.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-12 items-center gap-3 border-t border-white/[0.045] px-5 py-2.5 hover:bg-white/[0.025]"
                >
                  <GitCommit className="h-4 w-4 shrink-0 text-primary-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{commit.commit.message.split('\n')[0]}</span>
                  <span className="text-xs tabular-nums text-text-tertiary">{timeAgo(commit.commit.author.date)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-text-tertiary group-hover:text-text-primary" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  positive = false,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  positive?: boolean
}) {
  return (
    <Card className="dashboard-panel">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-tertiary">{label}</p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${positive ? 'bg-primary-500/10 text-primary-400' : 'bg-red-500/10 text-red-400'}`}>{icon}</span>
        </div>
        <p className="mt-4 truncate text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
          <Clock3 className="h-3 w-3" />{detail}
        </p>
      </CardContent>
    </Card>
  )
}
