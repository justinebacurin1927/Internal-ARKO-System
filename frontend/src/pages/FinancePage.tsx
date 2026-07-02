import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Pencil, Trash2 } from 'lucide-react'

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
  const { toast } = useToast()
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.getBalance(),
  })
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions(),
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<string>('EXPENSE')
  const [categoryId, setCategoryId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setType('EXPENSE')
    setCategoryId('')
    setEditingTx(null)
  }

  const createTx = useMutation({
    mutationFn: () =>
      api.createTransaction({
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        type,
        category: categoryId ? parseInt(categoryId) : undefined,
        date: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setShowForm(false)
      resetForm()
      toast('Transaction added')
    },
  })

  const updateTx = useMutation({
    mutationFn: () =>
      api.updateTransaction(editingTx!.id, {
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        type,
        category: categoryId ? parseInt(categoryId) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setShowForm(false)
      resetForm()
      toast('Transaction updated')
    },
  })

  const deleteTx = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      toast('Transaction deleted')
    },
  })

  const openEdit = (tx: any) => {
    setEditingTx(tx)
    setAmount(String(tx.amount))
    setDescription(tx.description || '')
    setType(tx.type)
    setCategoryId(tx.category ? String(tx.category) : '')
    setShowForm(true)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load finance data
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Track your income and expenses</p>
        </div>
        <Button onClick={() => {
          if (showForm) { setShowForm(false); resetForm() }
          else setShowForm(true)
        }}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Balance</p>
            <p className="text-lg font-black text-text-primary mt-0.5">{formatCurrency(balance?.balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Income</p>
            <p className="text-lg font-black text-pos mt-0.5">{formatCurrency(balance?.income ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Expenses</p>
            <p className="text-lg font-black text-neg mt-0.5">{formatCurrency(balance?.expenses ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit transaction form */}
      {showForm && (
        <Card className="overflow-hidden shrink-0">
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
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                >
                  <option value="">Uncategorized</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => editingTx ? updateTx.mutate() : createTx.mutate()}
                disabled={!amount || createTx.isPending || updateTx.isPending}
              >
                {createTx.isPending || updateTx.isPending
                  ? (editingTx ? 'Saving...' : 'Adding...')
                  : (editingTx ? 'Save' : 'Add')}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions list */}
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="px-5 py-3 border-b border-border-subtle shrink-0">
          <CardTitle className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Transactions</CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border-subtle">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-gray-100" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-pos-bg flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-text-tertiary" />
              </div>
              <p className="text-sm text-text-tertiary">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {transactions?.map((tx: any) => {
                const isIncome = tx.type === 'INCOME'
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent-50/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isIncome ? 'bg-pos-bg text-pos' : 'bg-neg-bg text-neg'}`}>
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{tx.description || 'Transaction'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-text-tertiary">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          {tx.category_name && (
                            <span className="inline-flex items-center rounded-full bg-bg-app px-1.5 py-0.5 text-[10px] text-text-tertiary ring-1 ring-black/[0.06]">
                              {tx.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold shrink-0 ${isIncome ? 'text-pos' : 'text-neg'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button onClick={() => openEdit(tx)} className="p-1.5 text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(tx.id)} className="p-1.5 text-text-tertiary hover:text-neg transition-colors cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete transaction?"
        message="Are you sure you want to delete this transaction? This cannot be undone."
        onConfirm={() => {
          if (confirmDeleteId !== null) deleteTx.mutate(confirmDeleteId)
          setConfirmDeleteId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteTx.isPending}
      />
    </div>
  )
}
