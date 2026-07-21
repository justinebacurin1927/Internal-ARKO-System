'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@arko/ui'
import { X, Loader2, Users } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SplitEntry {
  userId: string
  amount: string
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')
  const [scope, setScope] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSplit, setIsSplit] = useState(false)
  const [splits, setSplits] = useState<SplitEntry[]>([])

  const { data: categories } = api.finance.getCategories.useQuery()
  const { data: users } = api.users.search.useQuery({})
  const utils = api.useUtils()
  const createTx = api.finance.createTransaction.useMutation({
    onSuccess: () => {
      utils.finance.getTransactions.invalidate()
      utils.finance.getBalance.invalidate()
      utils.finance.getPendingSplits.invalidate()
      handleReset()
    },
  })

  const filteredCategories = categories?.filter((cat) => {
    if (type === 'INCOME') return cat.type === 'INVESTMENT'
    if (type === 'EXPENSE') return ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'].includes(cat.type)
    return cat.type === 'RECEIVABLE' || cat.type === 'PAYABLE'
  })

  const availableUsers = (users ?? []).filter((u) => u.id !== '') // all non-current users

  function handleReset() {
    setType('EXPENSE')
    setScope('PERSONAL')
    setAmount('')
    setDescription('')
    setCategoryId('')
    setIsSplit(false)
    setSplits([])
  }

  function addSplitRow() {
    setSplits([...splits, { userId: '', amount: '' }])
  }

  function updateSplit(index: number, field: keyof SplitEntry, value: string) {
    const updated = [...splits]
    updated[index] = { ...updated[index], [field]: value }
    setSplits(updated)
  }

  function removeSplit(index: number) {
    setSplits(splits.filter((_, i) => i !== index))
  }

  const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const parsedAmount = parseFloat(amount) || 0
  const splitValid = !isSplit || (
    splits.length > 0 &&
    splits.every((s) => s.userId && parseFloat(s.amount) > 0) &&
    Math.abs(totalSplitAmount - parsedAmount) < 0.01
  )
  const isValid = parsedAmount > 0 && categoryId && splitValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const splitWith = isSplit
      ? splits.map((s) => ({ userId: s.userId, amount: parseFloat(s.amount) }))
      : undefined

    await createTx.mutateAsync({
      type,
      amount: parsedAmount,
      description: description || undefined,
      categoryId,
      scope,
      isSplit,
      splitWith,
    })

    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold tracking-tight text-gray-900">
              Add Transaction
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Scope toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
              <div className="grid grid-cols-2 gap-2">
                {(['PERSONAL', 'COMPANY'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      scope === s
                        ? s === 'PERSONAL'
                          ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-500'
                          : 'bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-inset ring-gray-200'
                    }`}
                  >
                    {s === 'PERSONAL' ? '🏠 Personal' : '🏢 Company'}
                  </button>
                ))}
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t)
                      setCategoryId('')
                      if (t !== 'EXPENSE') setIsSplit(false)
                    }}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      type === t
                        ? t === 'INCOME'
                          ? 'bg-finance-50 text-finance-700 ring-2 ring-finance-500'
                          : t === 'EXPENSE'
                            ? 'bg-red-50 text-red-700 ring-2 ring-red-500'
                            : 'bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-inset ring-gray-200'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  ₱
                </span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder="e.g. Grocery run"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                required
              >
                <option value="">Select a category</option>
                {filteredCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {(!filteredCategories || filteredCategories.length === 0) && (
                <p className="text-xs text-gray-400 mt-1.5">No categories available for this transaction type.</p>
              )}
            </div>

            {/* Split toggle — only for expense, personal */}
            {type === 'EXPENSE' && scope === 'PERSONAL' && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSplit}
                    onChange={(e) => {
                      setIsSplit(e.target.checked)
                      if (!e.target.checked) setSplits([])
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Split with someone?</span>
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                </label>

                {isSplit && (
                  <div className="mt-3 space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {splits.map((split, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={split.userId}
                          onChange={(e) => updateSplit(i, 'userId', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="">Select person</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.email}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={split.amount}
                            onChange={(e) => updateSplit(i, 'amount', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-1.5 pl-4 pr-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSplit(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {splits.length > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                        <span>Total split: ₱{totalSplitAmount.toFixed(2)}</span>
                        <span className={Math.abs(totalSplitAmount - parsedAmount) < 0.01 ? 'text-green-600' : 'text-red-500'}>
                          {Math.abs(totalSplitAmount - parsedAmount) < 0.01
                            ? '✓ Balanced'
                            : `Remaining: ₱${(parsedAmount - totalSplitAmount).toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      + Add person
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={createTx.isPending || !isValid}>
                {createTx.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createTx.isPending ? 'Adding...' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
