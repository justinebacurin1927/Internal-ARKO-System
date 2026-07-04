import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import SwipeableTabs from '../components/SwipeableTabs'
import MetricsPage from './MetricsPage'
import {
  Plus, ArrowUpRight, ArrowDownRight, AlertCircle, Pencil, Trash2,
  TrendingUp, Search, Wallet,
  Repeat, CalendarDays, Tag, FileText, CreditCard,
  ChevronDown, Check, X, RotateCcw,
  DollarSign, BarChart3, Users, Target, HelpCircle, Cpu,
} from 'lucide-react'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

/* ─── Shared input classes (warm, soft) ─── */
const inputBase = [
  'block w-full rounded-xl border border-border-subtle bg-white text-text-primary placeholder:text-text-tertiary font-mono',
  'focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/8',
  'transition-all duration-150',
  'hover:border-accent-300',
  'disabled:bg-bg-app disabled:text-text-tertiary disabled:cursor-not-allowed',
].join(' ')

const selectBase = [
  inputBase,
  'appearance-none cursor-pointer',
  '[&>option]:text-text-primary [&>option]:bg-white',
].join(' ')

/* ─── Button presets ─── */
function PrimaryButton({ children, disabled, loading, onClick, className = '' }: {
  children: React.ReactNode
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-xl px-4 py-2.5 text-xs font-semibold text-white',
        'bg-accent-600 hover:bg-accent-500',
        'active:scale-[0.97] active:bg-accent-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-accent-600',
        'transition-all duration-150',
        className,
      ].join(' ')}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3 animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}

function GhostButton({ children, onClick, className = '' }: {
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-xl border border-border-subtle px-4 py-2.5 text-xs font-medium',
        'text-text-secondary hover:text-text-primary hover:bg-accent-50',
        'active:bg-accent-100 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app',
        'transition-all duration-150',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function IconButton({ children, onClick, label, color = 'zinc' }: {
  children: React.ReactNode
  onClick: () => void
  label: string
  color?: 'zinc' | 'accent' | 'red'
}) {
  const colorMap = {
    zinc: 'text-text-tertiary hover:text-text-primary hover:bg-accent-50 active:bg-accent-100',
    accent: 'text-text-tertiary hover:text-accent-600 hover:bg-accent-50 active:bg-accent-100',
    red: 'text-text-tertiary hover:text-red-600 hover:bg-red-50 active:bg-red-100',
  }
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={[
        'flex h-7 w-7 items-center justify-center rounded-lg',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30',
        colorMap[color],
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function FinancePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: balance } = useQuery({ queryKey: ['balance'], queryFn: () => api.getBalance() })
  const { data: transactions, isLoading, error } = useQuery({ queryKey: ['transactions'], queryFn: () => api.getTransactions() })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() })

  const [activeTab, setActiveTab] = useState('ledger')
  const [txSearch, setTxSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  // ─── Rich transaction form state ───
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txCategory, setTxCategory] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txPaymentMethod, setTxPaymentMethod] = useState('')
  const [txRecurring, setTxRecurring] = useState(false)
  const [txFrequency, setTxFrequency] = useState('MONTHLY')
  const [txNotes, setTxNotes] = useState('')

  const resetForm = () => {
    setTxType('EXPENSE')
    setTxAmount('')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxCategory('')
    setTxDescription('')
    setTxPaymentMethod('')
    setTxRecurring(false)
    setTxFrequency('MONTHLY')
    setTxNotes('')
    setEditingTx(null)
  }

  const openEdit = (tx: any) => {
    setEditingTx(tx)
    setTxType(tx.type)
    setTxAmount(String(tx.amount))
    setTxDate(new Date(tx.date).toISOString().split('T')[0])
    setTxCategory(tx.category ? String(tx.category) : '')
    setTxDescription(tx.description || '')
    setTxPaymentMethod('')
    setTxRecurring(false)
    setTxFrequency('MONTHLY')
    setTxNotes('')
    setFormOpen(true)
  }

  const createTx = useMutation({
    mutationFn: () =>
      api.createTransaction({
        amount: parseFloat(txAmount), description: txDescription.trim() || undefined,
        type: txType, category: txCategory ? parseInt(txCategory) : undefined,
        date: txDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
      setFormOpen(false); resetForm(); toast('Transaction added')
    },
  })

  const updateTx = useMutation({
    mutationFn: () =>
      api.updateTransaction(editingTx!.id, {
        amount: parseFloat(txAmount), description: txDescription.trim() || undefined,
        type: txType, category: txCategory ? parseInt(txCategory) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
      setFormOpen(false); resetForm(); toast('Transaction updated')
    },
  })

  const deleteTx = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
      toast('Transaction deleted')
    },
  })

  const submitDisabled = !txAmount || parseFloat(txAmount) <= 0 || createTx.isPending || updateTx.isPending

  const toggleForm = () => {
    if (formOpen) { setFormOpen(false); resetForm() }
    else { resetForm(); setFormOpen(true) }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 m-3">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load finance data
      </div>
    )
  }

  /* ══════════════ LEDGER TAB CONTENT ══════════════ */

  const ledgerContent = (
    <div className="flex h-full flex-col bg-bg-app
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-accent-200
      [&::-webkit-scrollbar-thumb]:hover:bg-accent-300
      [&::-webkit-scrollbar-track]:bg-transparent">

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-bold tracking-tight text-text-primary">Ledger</h1>
          <span className="text-[10px] text-text-tertiary font-mono">
            {formatCurrency(balance?.balance ?? 0)}
          </span>
        </div>
        <button
          onClick={toggleForm}
          className={[
            'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white',
            'transition-all duration-150',
            'active:scale-[0.96]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app',
            formOpen
              ? 'bg-red-600 hover:bg-red-500 active:bg-red-700'
              : 'bg-accent-600 hover:bg-accent-500 active:bg-accent-700',
          ].join(' ')}
        >
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? 'Close' : 'Add Transaction'}
        </button>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-accent-200
        [&::-webkit-scrollbar-thumb]:hover:bg-accent-300
        [&::-webkit-scrollbar-track]:bg-transparent">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {[
            { label: 'Balance', icon: Wallet, value: balance?.balance ?? 0, border: 'border-accent-300/40', bg: 'bg-accent-50/60', iconCol: 'text-accent-600', valCol: 'text-accent-800' },
            { label: 'Income', icon: ArrowUpRight, value: balance?.income ?? 0, border: 'border-emerald-300/40', bg: 'bg-emerald-50/60', iconCol: 'text-emerald-600', valCol: 'text-emerald-800' },
            { label: 'Expenses', icon: ArrowDownRight, value: balance?.expenses ?? 0, border: 'border-red-300/40', bg: 'bg-red-50/60', iconCol: 'text-red-500', valCol: 'text-red-700' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`rounded-xl border ${s.border} bg-white px-2.5 py-2 transition-all duration-150 hover:shadow-sm`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-md ${s.bg}`}>
                    <Icon className={`h-2.5 w-2.5 ${s.iconCol}`} />
                  </div>
                  <span className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${s.iconCol}`}>{s.label}</span>
                </div>
                <p className={`text-sm font-black ${s.valCol} font-mono tracking-tight`}>{formatCurrency(s.value)}</p>
              </div>
            )
          })}
        </div>

        {/* ── LOG IT FORM ── */}
        {formOpen && (
          <div className="rounded-xl border border-accent-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-4 w-4 items-center justify-center rounded-md bg-accent-50">
                {editingTx
                  ? <Pencil className="h-3 w-3 text-accent-600" />
                  : <Plus className="h-3 w-3 text-accent-600" />
                }
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-700">
                {editingTx ? 'Edit Transaction' : 'New Transaction'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {/* Type toggle */}
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Type</label>
                <div className="relative flex rounded-xl border border-border-subtle bg-bg-app p-0.5">
                  <div
                    className={`absolute top-0.5 bottom-0.5 w-1/2 rounded-lg transition-all duration-200 ease-out ${
                      txType === 'INCOME' ? 'left-0.5 bg-emerald-500' : 'left-1/2 bg-red-500'
                    }`}
                  />
                  <button
                    onClick={() => setTxType('INCOME')}
                    className={`relative z-10 flex-1 py-2 text-xs font-medium transition-all duration-150 cursor-pointer rounded-lg ${
                      txType === 'INCOME' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    onClick={() => setTxType('EXPENSE')}
                    className={`relative z-10 flex-1 py-2 text-xs font-medium transition-all duration-150 cursor-pointer rounded-lg ${
                      txType === 'EXPENSE' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Amount *</label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-mono pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500">₱</span>
                  <input type="number" step="0.01" min="0" value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" autoFocus
                    className={`${inputBase} pl-7 pr-3 py-2.5 text-sm`}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Date</label>
                <div className="relative group">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500" />
                  <input type="date" value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className={`${inputBase} pl-8 pr-3 py-2.5 text-xs`}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Category</label>
                <div className="relative group">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none z-10 transition-colors duration-150 group-focus-within:text-accent-500" />
                  <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)}
                    className={`${selectBase} pl-8 pr-8 py-2.5 text-xs`}
                  >
                    <option value="">Uncategorized</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Payment</label>
                <div className="relative group">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none z-10 transition-colors duration-150 group-focus-within:text-accent-500" />
                  <select value={txPaymentMethod} onChange={(e) => setTxPaymentMethod(e.target.value)}
                    className={`${selectBase} pl-8 pr-8 py-2.5 text-xs`}
                  >
                    <option value="">Select method</option>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Description</label>
                <div className="relative group">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500" />
                  <input type="text" value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="What was this for?" maxLength={200}
                    className={`${inputBase} pl-8 pr-3 py-2.5 text-xs`}
                  />
                </div>
              </div>

              {/* Recurring toggle */}
              <div className="col-span-2 flex items-center gap-3">
                <button
                  onClick={() => setTxRecurring(!txRecurring)}
                  className={[
                    'group inline-flex items-center gap-2 rounded-lg px-2 py-1.5',
                    'transition-all duration-150 cursor-pointer',
                    'hover:bg-accent-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30',
                  ].join(' ')}
                >
                  <div className={[
                    'relative flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all duration-150',
                    txRecurring
                      ? 'border-accent-500 bg-accent-600'
                      : 'border-border-subtle group-hover:border-accent-300 bg-white',
                  ].join(' ')}>
                    {txRecurring && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className={[
                    'text-[11px] font-medium transition-colors duration-150 select-none',
                    txRecurring ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary',
                  ].join(' ')}>
                    <Repeat className="h-3 w-3 inline mr-1 -mt-px" />
                    Recurring
                  </span>
                </button>
                {txRecurring && (
                  <div className="relative flex-1 max-w-[140px] group">
                    <select value={txFrequency} onChange={(e) => setTxFrequency(e.target.value)}
                      className={`${selectBase} px-3 py-1.5 text-[10px]`}
                    >
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-text-tertiary pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Notes</label>
                <textarea value={txNotes} rows={2}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Optional notes or tags..." maxLength={500}
                  className={`${inputBase} px-3 py-2 text-[11px] resize-none leading-relaxed`}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-subtle">
              <PrimaryButton
                onClick={() => (editingTx ? updateTx.mutate() : createTx.mutate())}
                disabled={submitDisabled}
                loading={createTx.isPending || updateTx.isPending}
                className="flex-1"
              >
                {editingTx ? 'Save Changes' : 'Add Transaction'}
              </PrimaryButton>
              <GhostButton onClick={() => { setFormOpen(false); resetForm() }}>
                Cancel
              </GhostButton>
            </div>
          </div>
        )}

        {/* ── TRANSACTION LEDGER ── */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-white min-h-0 shadow-sm">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-3 py-2 border-b border-border-subtle">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              {(() => {
                const count = (transactions ?? []).filter((tx: any) =>
                  !txSearch ||
                  tx.description?.toLowerCase().includes(txSearch.toLowerCase()) ||
                  tx.category_name?.toLowerCase().includes(txSearch.toLowerCase())
                ).length
                return `${count} transaction${count !== 1 ? 's' : ''}`
              })()}
            </span>
            {transactions && transactions.length > 0 && (
              <div className="relative w-36 group">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-tertiary pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500" />
                <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search..." maxLength={50}
                  className="block w-full rounded-lg border border-border-subtle bg-transparent py-1.5 pl-7 pr-2.5 text-[10px] text-text-primary placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/8 transition-all duration-150 hover:border-accent-300"
                />
              </div>
            )}
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto min-h-0
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-accent-200
            [&::-webkit-scrollbar-thumb]:hover:bg-accent-300
            [&::-webkit-scrollbar-track]:bg-transparent">
            {isLoading ? (
              <div className="divide-y divide-border-subtle">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 animate-pulse rounded-lg bg-accent-100" />
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-24 animate-pulse rounded bg-accent-100" />
                        <div className="h-2 w-12 animate-pulse rounded bg-accent-100" />
                      </div>
                    </div>
                    <div className="h-3 w-16 animate-pulse rounded bg-accent-100" />
                  </div>
                ))}
              </div>
            ) : transactions?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 ring-1 ring-accent-200">
                  <TrendingUp className="h-5 w-5 text-accent-500" />
                </div>
                <p className="text-sm font-medium text-text-primary">No transactions yet</p>
                <p className="mt-1 text-[11px] text-text-secondary">Click <span className="text-accent-600 font-medium">Add Transaction</span> to get started</p>
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
                      <div key={tx.id}
                        className="group/tx flex items-center justify-between px-3 py-2 transition-all duration-100 hover:bg-accent-50/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-600 group-hover/tx:bg-emerald-100'
                              : 'bg-red-50 text-red-500 group-hover/tx:bg-red-100'
                          }`}>
                            {isIncome
                              ? <ArrowUpRight className="h-3.5 w-3.5" />
                              : <ArrowDownRight className="h-3.5 w-3.5" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium leading-tight text-text-primary group-hover/tx:text-text-primary transition-colors duration-100">
                              {tx.description || 'Transaction'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-text-tertiary font-mono">
                                {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {tx.category_name && (
                                <span className="inline-flex items-center rounded-md bg-accent-50 px-1.5 py-[2px] text-[8px] font-medium text-text-secondary ring-1 ring-accent-200">
                                  {tx.category_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-xs font-bold font-mono tracking-tight ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                          <div className="flex opacity-0 group-hover/tx:opacity-100 transition-all duration-150">
                            <IconButton onClick={() => openEdit(tx)} label="Edit" color="accent">
                              <Pencil className="h-3 w-3" />
                            </IconButton>
                            <IconButton onClick={() => setConfirmDeleteId(tx.id)} label="Delete" color="red">
                              <Trash2 className="h-3 w-3" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete transaction?"
        message="This cannot be undone."
        onConfirm={() => { if (confirmDeleteId !== null) deleteTx.mutate(confirmDeleteId); setConfirmDeleteId(null) }}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteTx.isPending}
      />
    </div>
  )

  /* ══════════════ RENDER ══════════════ */

  return (
    <>
      <div className="h-full rounded-2xl bg-bg-app">
        <SwipeableTabs
          tabs={[
            { id: 'ledger', label: 'Ledger' },
            { id: 'metrics', label: 'Metrics' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          light
        >
          {ledgerContent}
          <MetricsPage onOpenGlossary={() => setGlossaryOpen(true)} />
        </SwipeableTabs>
      </div>

      {/* Glossary modal — rendered OUTSIDE SwipeableTabs to avoid CSS-transform breaking fixed positioning */}
      {glossaryOpen && <GlossaryModal onClose={() => setGlossaryOpen(false)} />}
    </>
  )
}

/* ══════════════ GLOSSARY MODAL (rendered at top level, outside transforms) ══════════════ */

function GlossaryModal({ onClose }: { onClose: () => void }) {
  const iconMap: Record<string, React.ReactNode> = {
    cac: <DollarSign className="h-4 w-4" />,
    ltv: <TrendingUp className="h-4 w-4" />,
    'ltv-cac': <BarChart3 className="h-4 w-4" />,
    churn: <Users className="h-4 w-4" />,
    arpu: <DollarSign className="h-4 w-4" />,
    roas: <Target className="h-4 w-4" />,
    payback: <BarChart3 className="h-4 w-4" />,
    dilution: <Users className="h-4 w-4" />,
    'market-cap': <TrendingUp className="h-4 w-4" />,
    nps: <Target className="h-4 w-4" />,
  }

  const metrics = [
    { key: 'cac', name: 'Customer Acquisition Cost', formula: 'Total sales & marketing spend ÷ New customers', what: 'How much it costs to acquire one paying customer — including ads, salaries, and tools.', why: 'Lower CAC means a more efficient growth engine. Track against LTV to know if you\'re sustainable.', target: 'Lower is better. SaaS targets under ₱25K.' },
    { key: 'ltv', name: 'Lifetime Value', formula: 'Avg revenue per user × Avg customer lifespan', what: 'Total revenue you expect from one customer over their entire relationship with your business.', why: 'LTV tells you how much you can spend on acquisition. LTV < CAC means you lose money per customer.', target: 'Higher is better. LTV ≥ 3× CAC is the healthy benchmark.' },
    { key: 'ltv-cac', name: 'LTV / CAC Ratio', formula: 'Lifetime Value ÷ Customer Acquisition Cost', what: 'The multiplier showing how much value you get back for every peso spent on acquisition.', why: 'The most important unit-economics metric. Below 1 means you\'re burning money; over 3 means healthy growth.', target: '≥ 3:1 excellent · 1:1 break-even · Below 1:1 unsustainable' },
    { key: 'churn', name: 'Churn Rate', formula: 'Customers lost ÷ Customers at start of period', what: 'Percentage of customers who stop using your product in a given period.', why: 'Churn is the leak in your bucket. Even great acquisition can\'t outrun high churn.', target: 'Monthly: under 5% is good, under 2% is elite.' },
    { key: 'arpu', name: 'ARPU', formula: 'Total revenue ÷ Total active users', what: 'Average Revenue Per User — how much each customer brings in over a period.', why: 'Shows your pricing power and whether upsells or price increases are working.', target: 'Higher is better. Track the trend over time.' },
    { key: 'roas', name: 'ROAS', formula: 'Revenue from ads ÷ Cost of ads', what: 'Return On Ad Spend — revenue generated for every peso spent on marketing.', why: 'Tells you if your ad campaigns are profitable. Below 1:1 means you\'re losing money on ads.', target: '4:1 good · 3:1 break-even · Varies by industry' },
    { key: 'payback', name: 'Payback Period', formula: 'CAC ÷ (Monthly revenue × Gross margin)', what: 'Months to earn back what you spent to acquire a customer.', why: 'Shorter payback = faster reinvestment. Long payback needs deep pockets to scale.', target: '< 12 months healthy · < 6 months excellent' },
    { key: 'dilution', name: 'Equity Dilution', formula: 'New shares issued ÷ Total shares outstanding', what: 'Reduction in existing shareholders\' ownership when new shares are issued.', why: 'Too much dilution disincentivizes early investors and founders.', target: 'Keep per-round dilution under 20–25%.' },
    { key: 'market-cap', name: 'Market Cap', formula: 'Share price × Total shares outstanding', what: 'Total market value of your company\'s outstanding shares.', why: 'Sets your valuation and affects fundraising, talent, and exit strategy.', target: 'Steady growth matters more than spikes.' },
    { key: 'nps', name: 'Net Promoter Score', formula: '% Promoters (9–10) − % Detractors (0–6)', what: 'Customer loyalty score from "How likely to recommend?" Range −100 to +100.', why: 'Correlates with retention, word-of-mouth, and satisfaction. A leading indicator.', target: '+50 excellent · +30–50 great · Below 0 needs attention' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-black/10 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-50">
              <HelpCircle className="h-3.5 w-3.5 text-accent-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Metric Glossary</h2>
              <p className="text-[10px] text-text-tertiary">What each KPI means and why it matters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-accent-50 hover:text-text-primary transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto px-5 py-3
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-accent-200
          [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-2">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  const el = document.getElementById(`gloss-${m.key}`)
                  if (el) el.classList.toggle('hidden')
                }}
                className="w-full text-left rounded-xl border border-border-subtle bg-white p-3 hover:bg-accent-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-accent-600 group-hover:bg-accent-100 transition-colors">
                    {iconMap[m.key] ?? <HelpCircle className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{m.name}</p>
                    <p className="text-[9px] font-mono text-text-tertiary truncate">{m.formula}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0" />
                </div>

                <div id={`gloss-${m.key}`} className="hidden mt-2.5 pt-2 border-t border-border-subtle space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-accent-700 mb-0.5">What it is</p>
                    <p className="text-[11px] leading-relaxed text-text-secondary">{m.what}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Why it matters</p>
                    <p className="text-[11px] leading-relaxed text-text-secondary">{m.why}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-text-tertiary mb-0.5">Target</p>
                    <p className="text-[11px] leading-relaxed text-text-secondary">{m.target}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-5 py-3 shrink-0">
          <p className="text-[10px] text-text-tertiary text-center">
            <Cpu className="h-2.5 w-2.5 inline mr-1" />
            Auto-calculated metrics come from your transaction data. Tap a card to edit manual ones.
          </p>
        </div>
      </div>
    </div>
  )
}
