'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@arko/ui'
import { X, Loader2 } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: categories } = api.finance.getCategories.useQuery()
  const utils = api.useUtils()
  const createTx = api.finance.createTransaction.useMutation({
    onSuccess: () => {
      utils.finance.getTransactions.invalidate()
      utils.finance.getBalance.invalidate()
      handleReset()
    },
  })

  const filteredCategories = categories?.filter((cat) => {
    if (type === 'INCOME') return cat.type === 'INVESTMENT'
    if (type === 'EXPENSE') return ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'].includes(cat.type)
    return cat.type === 'RECEIVABLE' || cat.type === 'PAYABLE'
  })

  function handleReset() {
    setType('EXPENSE')
    setAmount('')
    setDescription('')
    setCategoryId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0 || !categoryId) return

    await createTx.mutateAsync({
      type,
      amount: parsed,
      description: description || undefined,
      categoryId,
    })

    onOpenChange(false)
  }

  const isValid = parseFloat(amount) > 0 && categoryId

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out">
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
