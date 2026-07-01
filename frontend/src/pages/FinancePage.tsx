import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function FinancePage() {
  const queryClient = useQueryClient()
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.getBalance(),
  })
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions(),
  })

  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<string>('EXPENSE')

  const createTx = useMutation({
    mutationFn: () =>
      api.createTransaction({
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        type,
        date: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setShowForm(false)
      setAmount('')
      setDescription('')
      setType('EXPENSE')
    },
  })

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load finance data
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Track your income and expenses</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Balance</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">{formatCurrency(balance?.balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Income</p>
            <p className="text-lg font-black text-finance-600 mt-0.5">{formatCurrency(balance?.income ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Expenses</p>
            <p className="text-lg font-black text-red-500 mt-0.5">{formatCurrency(balance?.expenses ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add transaction form */}
      {showForm && (
        <Card className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createTx.mutate()}
                disabled={!amount || createTx.isPending}
              >
                {createTx.isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions list */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3 border-b border-gray-100">
          <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transactions</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="p-0">
            <div className="text-sm text-gray-400 text-center py-8">Loading...</div>
          </CardContent>
        ) : transactions?.length === 0 ? (
          <CardContent className="p-0">
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions?.map((tx: any) => {
              const isIncome = tx.type === 'INCOME'
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isIncome ? 'bg-finance-50 text-finance-600' : 'bg-red-50 text-red-500'}`}>
                      {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description || 'Transaction'}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isIncome ? 'text-finance-600' : 'text-red-500'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
