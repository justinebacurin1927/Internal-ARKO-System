import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Pencil, Trash2, TrendingUp, Search } from 'lucide-react'

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
  const [txSearch, setTxSearch] = useState('')

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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Finance</h1>
          <p className="text-sm text-text-tertiary mt-1">Track your income and expenses</p>
        </div>
        <Button onClick={() => {
          if (showForm) { setShowForm(false); resetForm() }
          else { resetForm(); setShowForm(true) }
        }}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {/* ═══ Stats row — labels as protruding tags ═══ */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <Card className="relative">
          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-md bg-accent-500 px-2 py-[3px] text-[9px] font-semibold text-white uppercase tracking-wider shadow-xs">
            On Hand
          </span>
          <CardContent className="p-4 pt-5">
            <p className="text-lg font-black text-text-primary">{formatCurrency(balance?.balance ?? 0)}</p>
            {balance && balance.income > 0 && (
              <span className={`text-[10px] font-medium ${balance.balance >= 0 ? 'text-pos' : 'text-neg'}`}>
                {balance.balance >= 0 ? '↑' : '↓'} {balance.balance >= 0 ? 'Positive' : 'Negative'}
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="relative">
          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-md bg-pos px-2 py-[3px] text-[9px] font-semibold text-white uppercase tracking-wider shadow-xs">
            Coming In
          </span>
          <CardContent className="p-4 pt-5">
            <p className="text-lg font-black text-pos">{formatCurrency(balance?.income ?? 0)}</p>
            <p className="text-[10px] text-text-tertiary mt-1">Total all-time</p>
          </CardContent>
        </Card>
        <Card className="relative">
          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-md bg-neg px-2 py-[3px] text-[9px] font-semibold text-white uppercase tracking-wider shadow-xs">
            Going Out
          </span>
          <CardContent className="p-4 pt-5">
            <p className="text-lg font-black text-neg">{formatCurrency(balance?.expenses ?? 0)}</p>
            <p className="text-[10px] text-text-tertiary mt-1">Total all-time</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Bento grid: quick-add + monthly view ═══ */}
      <div className="grid grid-cols-2 gap-3 shrink-0 min-h-0">
        {/* Log It — compact bento card */}
        <Card className="relative">
          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-md bg-accent-500 px-2 py-[3px] text-[9px] font-semibold text-white uppercase tracking-wider shadow-xs">
            {editingTx ? 'Edit' : 'Log It'}
          </span>
          <CardContent className="p-4 pt-5 space-y-3">

            {showForm || editingTx ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-text-secondary">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-text-secondary">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                    >
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-text-secondary">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                    >
                      <option value="">Uncategorized</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What was this for?"
                    className="block w-full rounded-lg border border-border-subtle px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => editingTx ? updateTx.mutate() : createTx.mutate()}
                    disabled={!amount || createTx.isPending || updateTx.isPending}
                  >
                    {createTx.isPending || updateTx.isPending
                      ? (editingTx ? 'Saving...' : 'Adding...')
                      : (editingTx ? 'Save' : 'Add')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <div className="h-8 w-8 rounded-full bg-accent-50 flex items-center justify-center mb-2">
                  <Plus className="h-4 w-4 text-accent-500" />
                </div>
                <p className="text-xs text-text-tertiary">Hit <span className="font-semibold text-accent-500">Add</span> to log a transaction</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* The View — monthly summary */}
        <Card className="relative">
          <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-md bg-text-tertiary px-2 py-[3px] text-[9px] font-semibold text-white uppercase tracking-wider shadow-xs">
            July
          </span>
          <CardContent className="p-4 pt-5 space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-pos" />
                  <span className="text-xs text-text-secondary">Income</span>
                </div>
                <span className="text-sm font-bold text-pos">{formatCurrency(balance?.income ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neg" />
                  <span className="text-xs text-text-secondary">Expenses</span>
                </div>
                <span className="text-sm font-bold text-neg">{formatCurrency(balance?.expenses ?? 0)}</span>
              </div>
              <div className="pt-2 mt-1 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Net</span>
                <span className={`text-sm font-black ${(balance?.balance ?? 0) >= 0 ? 'text-pos' : 'text-neg'}`}>
                  {formatCurrency(balance?.balance ?? 0)}
                </span>
              </div>
              {(balance?.income ?? 0) > 0 && (
                <div className="h-1.5 w-full rounded-full bg-bg-app overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pos transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((balance?.income ?? 0) / ((balance?.income ?? 0) + (balance?.expenses ?? 0))) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Transactions ═══ */}
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="px-4 py-2.5 border-b border-border-subtle shrink-0 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Ledger</CardTitle>
          {transactions && transactions.length > 0 && (
            <div className="relative w-44">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary/60" />
              <input
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search transactions..."
                className="block w-full rounded-md border border-border-subtle pl-6 pr-2 py-1 text-xs focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 bg-transparent"
              />
            </div>
          )}
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border-subtle">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-gray-100" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
                      <div className="h-2.5 w-14 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-10 w-10 mb-2 rounded-full bg-pos-bg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-pos" />
              </div>
              <p className="text-sm font-medium text-text-primary">No transactions yet</p>
              <p className="text-xs text-text-tertiary mt-0.5">Add your first transaction to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {(transactions ?? [])
                .filter((tx: any) =>
                  !txSearch ||
                  tx.description?.toLowerCase().includes(txSearch.toLowerCase()) ||
                  tx.category_name?.toLowerCase().includes(txSearch.toLowerCase())
                )
                .map((tx: any) => {
                const isIncome = tx.type === 'INCOME'
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent-50/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isIncome ? 'bg-pos-bg text-pos' : 'bg-neg-bg text-neg'}`}>
                        {isIncome ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate leading-tight">{tx.description || 'Transaction'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-text-tertiary">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          {tx.category_name && (
                            <span className="inline-flex items-center rounded-full bg-bg-app px-1.5 py-0.5 text-[9px] text-text-tertiary ring-1 ring-black/[0.06]">
                              {tx.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold shrink-0 ${isIncome ? 'text-pos' : 'text-neg'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button onClick={() => openEdit(tx)} className="p-1 text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(tx.id)} className="p-1 text-text-tertiary hover:text-neg transition-colors cursor-pointer">
                        <Trash2 className="h-3 w-3" />
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
