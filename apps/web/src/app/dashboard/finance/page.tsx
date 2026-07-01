'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Wallet, Users, CheckCircle2 } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { formatCurrency } from '@arko/finance'
import { AddTransactionDialog } from './add-transaction-dialog'

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-28 rounded bg-gray-100 animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function FinancePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PERSONAL' | 'COMPANY'>('ALL')

  const query = api.finance.getBalance.useQuery(
    scopeFilter !== 'ALL' ? { scope: scopeFilter } : undefined,
  )
  const txQuery = api.finance.getTransactions.useQuery(
    scopeFilter !== 'ALL' ? { scope: scopeFilter } : undefined,
  )
  const { data: pendingSplits } = api.finance.getPendingSplits.useQuery()
  const utils = api.useUtils()

  const balance = query.data
  const transactions = txQuery.data ?? []
  const loading = query.isLoading || txQuery.isLoading
  const hasError = query.isError || txQuery.isError

  const refetchAll = () => {
    query.refetch()
    txQuery.refetch()
  }
  const refetchTransactions = () => txQuery.refetch()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Track your income, expenses, and cashflow</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Pending splits alert */}
      {pendingSplits && pendingSplits.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                {pendingSplits.length} pending split{pendingSplits.length > 1 ? 's' : ''} to settle
              </p>
            </div>
            <span className="text-xs text-amber-600 font-medium">
              ₱{pendingSplits.reduce((s, p) => s + p.amount, 0).toLocaleString()}
            </span>
          </CardContent>
        </Card>
      )}

      {hasError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-800">Failed to load finance data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetchAll}>Retry</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <StatsSkeleton />
      ) : (
        <>
          {/* Scope filter tabs */}
          <div className="flex items-center gap-2">
            {(['ALL', 'PERSONAL', 'COMPANY'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScopeFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  scopeFilter === s
                    ? s === 'ALL'
                      ? 'bg-gray-900 text-white'
                      : s === 'PERSONAL'
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'PERSONAL' ? '🏠 Personal' : '🏢 Company'}
              </button>
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(balance?.balance ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50">
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(balance?.income ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(balance?.expenses ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions list */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {txQuery.isError ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-red-300 mb-3" />
                  <p className="text-sm font-medium text-red-600">Failed to load transactions.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={refetchTransactions}>Try Again</Button>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <Wallet className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No transactions yet</p>
                  <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Transaction
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {transactions.map((tx) => {
                    const unsettledShares = tx.splitShares?.filter((s) => !s.settled) ?? []
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                            tx.type === 'INCOME' ? 'bg-green-50' : tx.type === 'EXPENSE' ? 'bg-red-50' : 'bg-blue-50'
                          }`}>
                            {tx.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> :
                             tx.type === 'EXPENSE' ? <ArrowDownRight className="h-4 w-4 text-red-600" /> :
                             <ArrowUpRight className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {tx.description || tx.category?.name || 'Untitled'}
                              </p>
                              {/* Scope badge */}
                              <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase leading-none ${
                                tx.scope === 'COMPANY'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-primary-50 text-primary-700'
                              }`}>
                                {tx.scope === 'COMPANY' ? 'Co' : 'Per'}
                              </span>
                              {/* Split badge */}
                              {tx.isSplit && (
                                <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase leading-none bg-amber-50 text-amber-700">
                                  Split
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {tx.category?.name && `${tx.category.name} `}
                              {new Date(tx.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {unsettledShares.length > 0 && (
                                <span className="text-amber-500 ml-1">
                                  · {unsettledShares.length} unsettled
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ml-3 ${
                          tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending splits section */}
          {pendingSplits && pendingSplits.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending Splits</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {pendingSplits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 shrink-0">
                          <Users className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {split.transaction.description || split.transaction.category?.name || 'Shared expense'}
                          </p>
                          <p className="text-xs text-gray-400">
                            From {split.transaction.user.name ?? split.transaction.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-semibold text-amber-700">
                          ₱{split.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={async () => {
                            await api.finance.settleSplit.useMutation().mutateAsync({ splitId: split.id })
                            utils.finance.getPendingSplits.invalidate()
                          }}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-medium text-green-700 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
