'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@arko/ui'
import { X, Loader2, Calendar } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const
const TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface RecurringTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editId?: string
}

export function RecurringTransactionDialog({ open, onOpenChange, editId }: RecurringTransactionDialogProps) {
  const { data: categories } = api.finance.getCategories.useQuery()
  const utils = api.useUtils()

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [categoryId, setCategoryId] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Load existing data when editing
  const editQuery = api.finance.listRecurring.useQuery()
  const existingRecurring = editQuery.data?.find((r) => r.id === editId)

  useEffect(() => {
    if (editId && existingRecurring) {
      setType(existingRecurring.type as any)
      setDescription(existingRecurring.description)
      setAmount(String(existingRecurring.amount))
      setFrequency(existingRecurring.frequency as any)
      setCategoryId(existingRecurring.categoryId ?? '')
      // Format date for input
      try { setNextDate(toLocalDateString(new Date(existingRecurring.nextDate))) } catch {}
      setIsActive(existingRecurring.isActive)
    } else if (!open) {
      resetForm()
    }
  }, [editId, existingRecurring, open])

  const createMut = api.finance.createRecurring.useMutation({
    onSuccess: () => {
      utils.finance.listRecurring.invalidate()
      handleClose()
    },
  })
  const updateMut = api.finance.updateRecurring.useMutation({
    onSuccess: () => {
      utils.finance.listRecurring.invalidate()
      handleClose()
    },
  })

  const isPending = createMut.isPending || updateMut.isPending
  const parsedAmount = parseFloat(amount) || 0
  const isValid = parsedAmount > 0 && description.trim() && nextDate

  function resetForm() {
    setType('EXPENSE')
    setDescription('')
    setAmount('')
    setFrequency('MONTHLY')
    setCategoryId('')
    setNextDate('')
    setIsActive(true)
  }

  function handleClose() {
    resetForm()
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const payload = {
      type,
      description: description.trim(),
      amount: parsedAmount,
      frequency,
      categoryId: categoryId || undefined,
      nextDate: new Date(nextDate),
      isActive,
    }

    if (editId) {
      await updateMut.mutateAsync({ id: editId, ...payload })
    } else {
      await createMut.mutateAsync(payload)
    }
  }

  const filteredCategories = categories?.filter((cat) => {
    if (type === 'INCOME') return cat.type === 'INVESTMENT'
    if (type === 'EXPENSE') return ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'].includes(cat.type)
    return cat.type === 'RECEIVABLE' || cat.type === 'PAYABLE'
  })

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold tracking-tight text-gray-900">
              {editId ? 'Edit Recurring' : 'Add Recurring Transaction'}
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
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
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

            {/* Description */}
            <div>
              <label htmlFor="recur-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <input
                id="recur-desc"
                type="text"
                placeholder="e.g. Netflix subscription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-400"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="recur-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                <input
                  id="recur-amount"
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

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <div className="grid grid-cols-4 gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                      frequency === f
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-inset ring-gray-200'
                    }`}
                  >
                    {f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Next due date */}
            <div>
              <label htmlFor="recur-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                Next Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="recur-date"
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>

            {/* Category */}
            <div>
              <label htmlFor="recur-cat" className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="recur-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="">Select a category</option>
                {filteredCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending || !isValid}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Saving...' : editId ? 'Save Changes' : 'Add Recurring'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
