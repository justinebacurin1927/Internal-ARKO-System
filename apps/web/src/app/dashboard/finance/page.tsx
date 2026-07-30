'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Wallet, Users, CheckCircle2, RefreshCw, Calendar, Trash2, Pencil, TrendingUp } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { formatCurrency } from '@arko/finance'
import { AddTransactionDialog, type GhostTransaction } from './add-transaction-dialog'
import { RecurringTransactionDialog } from './recurring-transaction-dialog'
import { MetricsPanel } from './metrics-panel'

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-20 rounded bg-card animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-28 rounded bg-card animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function FinancePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PERSONAL' | 'COMPANY'>('ALL')
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [editRecurringId, setEditRecurringId] = useState<string | undefined>()
  const [showRecurring, setShowRecurring] = useState(false)
  const [showMetrics, setShowMetrics] = useState(0) // 0 = collapsed, 1 = show
  const [ghostTransactions, setGhostTransactions] = useState<GhostTransaction[]>([])

  const query = api.finance.getBalance.useQuery(
    scopeFilter !== 'ALL' ? { scope: scopeFilter } : undefined,
  )
  const txQuery = api.finance.getTransactions.useQuery(
    scopeFilter !== 'ALL' ? { scope: scopeFilter } : undefined,
  )
  const { data: pendingSplits } = api.finance.getPendingSplits.useQuery()
  const { data: recurringList } = api.finance.listRecurring.useQuery()
  const utils = api.useUtils()

  const deleteRecurringMut = api.finance.deleteRecurring.useMutation({
    onSuccess: () => utils.finance.listRecurring.invalidate(),
  })
  const settleSplitMut = api.finance.settleSplit.useMutation({
    onSuccess: () => utils.finance.getPendingSplits.invalidate(),
  })
  const deleteTransactionMut = api.finance.deleteTransaction.useMutation({
    onSuccess: () => {
      utils.finance.getTransactions.invalidate()
      utils.finance.getBalance.invalidate()
      utils.finance.getPendingSplits.invalidate()
    },
  })

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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Finance</h1>
          <p className="text-sm text-text-tertiary mt-1">Track your income, expenses, and cashflow</p>
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
                      ? 'bg-primary-500 text-white'
                      : s === 'PERSONAL'
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-blue-100 text-blue-800'
                    : 'bg-card text-text-secondary hover:bg-card/[0.04]'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'PERSONAL' ? 'Personal' : 'Company'}
              </button>
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-tertiary">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-text-primary">
                  {formatCurrency(balance?.balance ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-tertiary">Income</CardTitle>
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
                <CardTitle className="text-sm text-text-tertiary">Expenses</CardTitle>
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
              ) : transactions.length === 0 && ghostTransactions.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <Wallet className="h-10 w-10 text-text-muted mb-3" />
                  <p className="text-sm text-text-tertiary">No transactions yet</p>
                  <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Transaction
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {ghostTransactions.map((tx) => (
                    <div key={tx.id} className="flex animate-pulse items-center justify-between py-3 opacity-55">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-card" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {tx.description || tx.categoryName || 'Untitled'}
                            </p>
                            <span className="rounded bg-card px-1.5 py-0.5 text-[9px] font-semibold uppercase text-text-tertiary">
                              Pending
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary">
                            {tx.categoryName ?? 'Saving transaction…'}
                          </p>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-semibold text-text-tertiary">
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
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
                              <p className="text-sm font-medium text-text-primary truncate">
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
                            <p className="text-xs text-text-tertiary">
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
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                          <button
                            type="button"
                            aria-label="Delete transaction"
                            disabled={deleteTransactionMut.isPending}
                            onClick={() => {
                              if (window.confirm('Delete this transaction?')) {
                                deleteTransactionMut.mutate({ id: tx.id })
                              }
                            }}
                            className="rounded p-1 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                <Users className="h-4 w-4 text-text-tertiary" />
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border-subtle">
                  {pendingSplits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 shrink-0">
                          <Users className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {split.transaction.description || split.transaction.category?.name || 'Shared expense'}
                          </p>
                          <p className="text-xs text-text-tertiary">
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
                            await settleSplitMut.mutateAsync({ splitId: split.id })
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

          {/* Recurring Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowRecurring(!showRecurring)}>
              <div className="flex items-center gap-2">
                <CardTitle>Recurring Transactions</CardTitle>
                {recurringList && recurringList.length > 0 && (
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-text-secondary">
                    {recurringList.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditRecurringId(undefined); setRecurringOpen(true) }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            {showRecurring && (
              <CardContent>
                {!recurringList || recurringList.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <RefreshCw className="h-10 w-10 text-text-muted mb-3" />
                    <p className="text-sm text-text-tertiary">No recurring transactions</p>
                    <Button size="sm" className="mt-3" onClick={() => { setEditRecurringId(undefined); setRecurringOpen(true) }}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Recurring
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {recurringList.map((r) => {
                      const freqLabel = r.frequency === 'DAILY' ? 'Daily' : r.frequency === 'WEEKLY' ? 'Weekly' : r.frequency === 'MONTHLY' ? 'Monthly' : 'Yearly'
                      const nextDue = new Date(r.nextDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      return (
                        <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                              r.type === 'INCOME' ? 'bg-finance-50' : 'bg-red-50'
                            }`}>
                              <Calendar className={`h-3.5 w-3.5 ${
                                r.type === 'INCOME' ? 'text-finance-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-text-primary truncate">{r.description}</p>
                                {!r.isActive && (
                                  <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-card text-text-tertiary">Paused</span>
                                )}
                              </div>
                              <p className="text-xs text-text-tertiary">
                                {freqLabel} · Next: {nextDue}
                                {r.category && <span> · {r.category.name}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className={`text-sm font-semibold ${
                              r.type === 'INCOME' ? 'text-finance-600' : 'text-red-600'
                            }`}>
                              {r.type === 'INCOME' ? '+' : '-'}{formatCurrency(r.amount)}
                            </span>
                            <button
                              onClick={() => { setEditRecurringId(r.id); setRecurringOpen(true) }}
                              className="rounded p-1 text-text-muted hover:text-text-secondary transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete this recurring transaction?')) {
                                  await deleteRecurringMut.mutateAsync({ id: r.id })
                                }
                              }}
                              className="rounded p-1 text-text-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Business Metrics */}
          {showMetrics > 0 ? (
            <div>
              <button
                onClick={() => setShowMetrics(0)}
                className="flex items-center gap-2 text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors mb-4"
              >
                <TrendingUp className="h-4 w-4" />
                Hide Metrics
              </button>
              <MetricsPanel />
            </div>
          ) : (
            <button
              onClick={() => setShowMetrics(1)}
              className="flex items-center gap-2 text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Show Business Metrics
            </button>
          )}
        </>
      )}

      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGhostAdd={(transaction) => setGhostTransactions((current) => [transaction, ...current])}
        onGhostRemove={(id) => setGhostTransactions((current) => current.filter((transaction) => transaction.id !== id))}
      />
      <RecurringTransactionDialog
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        editId={editRecurringId}
      />
    </div>
  )
}
