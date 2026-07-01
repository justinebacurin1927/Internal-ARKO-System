'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Wallet } from 'lucide-react'
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

  const query = api.finance.getBalance.useQuery()
  const txQuery = api.finance.getTransactions.useQuery()

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
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          tx.type === 'INCOME' ? 'bg-green-50' : tx.type === 'EXPENSE' ? 'bg-red-50' : 'bg-blue-50'
                        }`}>
                          {tx.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> :
                           tx.type === 'EXPENSE' ? <ArrowDownRight className="h-4 w-4 text-red-600" /> :
                           <ArrowUpRight className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {tx.description || tx.category?.name || 'Untitled'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {tx.category?.name && `${tx.category.name} `}
                            {new Date(tx.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
