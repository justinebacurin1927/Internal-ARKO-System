'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@arko/ui'
import { X, Loader2, Users, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGhostAdd?: (transaction: GhostTransaction) => void
  onGhostRemove?: (id: string) => void
  defaultScope?: 'PERSONAL' | 'COMPANY'
}

export interface GhostTransaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  scope: 'PERSONAL' | 'COMPANY'
  amount: number
  description?: string
  categoryName?: string
  date: Date
}

interface SplitEntry {
  userId: string
  amount: string
}

export function AddTransactionDialog({ open, onOpenChange, onGhostAdd, onGhostRemove, defaultScope = 'PERSONAL' }: AddTransactionDialogProps) {
  const { data: session } = useSession()
  const canUseCompany = session?.user?.role === 'ADMIN' || session?.user?.role === 'ACCOUNTANT'
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')
  const [scope, setScope] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSplit, setIsSplit] = useState(false)
  const [splits, setSplits] = useState<SplitEntry[]>([])

  useEffect(() => {
    if (open && (defaultScope === 'PERSONAL' || canUseCompany)) {
      setScope(defaultScope)
      setCategoryId('')
    }
  }, [canUseCompany, defaultScope, open])

  const { data: categories } = api.finance.getCategories.useQuery({ scope })
  const { data: users } = api.users.search.useQuery({})
  const utils = api.useUtils()
  const createTx = api.finance.createTransaction.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.finance.getTransactions.invalidate(),
        utils.finance.getBalance.invalidate(),
        utils.finance.getPendingSplits.invalidate(),
      ])
      handleReset()
    },
  })
  const createCategory = api.finance.createCategory.useMutation({
    onSuccess: async (category) => {
      await utils.finance.getCategories.invalidate()
      setCategoryId(category.id)
      setNewCategoryName('')
    },
  })
  const deleteCategory = api.finance.deleteCategory.useMutation({
    onSuccess: async (_, variables) => {
      if (categoryId === variables.id) setCategoryId('')
      await utils.finance.getCategories.invalidate()
    },
  })
  const updateCategory = api.finance.updateCategory.useMutation({
    onSuccess: () => utils.finance.getCategories.invalidate(),
  })

  const filteredCategories = categories?.filter((cat) => {
    if (type === 'INCOME') return cat.type === 'INVESTMENT'
    if (type === 'EXPENSE') return ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'].includes(cat.type)
    return cat.type === 'RECEIVABLE' || cat.type === 'PAYABLE'
  })

  const availableUsers = (users ?? []).filter((u) => u.id !== '') // all non-current users

  function handleReset() {
    setType('EXPENSE')
    setScope(defaultScope)
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

    const ghostId = `pending-${crypto.randomUUID()}`
    onGhostAdd?.({
      id: ghostId,
      type,
      scope,
      amount: parsedAmount,
      description: description || undefined,
      categoryName: categories?.find((category) => category.id === categoryId)?.name,
      date: new Date(),
    })
    onOpenChange(false)

    try {
      await createTx.mutateAsync({
        type,
        amount: parsedAmount,
        description: description || undefined,
        categoryId,
        scope,
        isSplit,
        splitWith,
      })
    } catch {
      onOpenChange(true)
    } finally {
      onGhostRemove?.(ghostId)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="transaction-dialog fixed left-1/2 top-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#121417]/95 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.65)] data-[state=open]:animate-in data-[state=closed]:animate-out">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-tight text-text-primary">
                Add transaction
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-tertiary">
                Record a new entry in your financial activity.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-text-tertiary hover:bg-card hover:text-text-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Scope toggle */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Scope</label>
              <div className="dashboard-segmented grid grid-cols-2 gap-1 p-1">
                {(['PERSONAL', ...(canUseCompany ? ['COMPANY' as const] : [])] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setScope(s)
                      setCategoryId('')
                    }}
                    className={`min-h-10 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                      scope === s
                        ? 'bg-primary-500 text-white shadow-[0_0_18px_rgba(34,197,94,0.18)]'
                        : 'text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    {s === 'PERSONAL' ? 'Personal' : 'Company'}
                  </button>
                ))}
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Type</label>
              <div className="dashboard-segmented grid grid-cols-3 gap-1 p-1">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t)
                      setCategoryId('')
                      if (t !== 'EXPENSE') setIsSplit(false)
                    }}
                    className={`min-h-10 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      type === t
                        ? t === 'INCOME'
                          ? 'bg-primary-500 text-white'
                          : t === 'EXPENSE'
                            ? 'bg-red-500 text-white'
                            : 'bg-primary-700 text-white'
                        : 'text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-text-secondary mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm font-medium">
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
                  className="w-full rounded-lg border border-border-subtle py-2.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1.5">
                Description <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder="e.g. Grocery run"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-text-tertiary"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1.5">
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
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
                <p className="text-xs text-text-tertiary mt-1.5">No categories available for this transaction type.</p>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category"
                  maxLength={80}
                  className="min-w-0 flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newCategoryName.trim() || createCategory.isPending}
                  onClick={() => createCategory.mutate({ name: newCategoryName, transactionType: type, scope })}
                >
                  {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
              {filteredCategories?.some((cat) => cat.userId) && (
                <div className="mt-2 space-y-1">
                  {filteredCategories
                    .filter((cat) => cat.userId)
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between rounded-md bg-card px-2.5 py-1.5 text-xs text-text-secondary">
                        <span>{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Rename ${cat.name}`}
                            onClick={() => {
                              const name = window.prompt('Rename category', cat.name)
                              if (name?.trim()) updateCategory.mutate({ id: cat.id, name })
                            }}
                            className="text-text-tertiary transition-colors hover:text-text-primary"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${cat.name}`}
                            disabled={deleteCategory.isPending}
                            onClick={() => deleteCategory.mutate({ id: cat.id })}
                            className="text-text-tertiary transition-colors hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {(createCategory.error || updateCategory.error || deleteCategory.error) && (
                <p className="mt-1.5 text-xs text-red-500">
                  {createCategory.error?.message ?? updateCategory.error?.message ?? deleteCategory.error?.message}
                </p>
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
                    className="rounded border-border-subtle text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-text-secondary">Split with someone?</span>
                  <Users className="h-3.5 w-3.5 text-text-tertiary" />
                </label>

                {isSplit && (
                  <div className="mt-3 space-y-2 border border-border-subtle rounded-lg p-3 bg-card">
                    {splits.map((split, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={split.userId}
                          onChange={(e) => updateSplit(i, 'userId', e.target.value)}
                          className="flex-1 rounded-lg border border-border-subtle px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="">Select person</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.email}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-tertiary text-[10px]">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={split.amount}
                            onChange={(e) => updateSplit(i, 'amount', e.target.value)}
                            className="w-full rounded-lg border border-border-subtle py-1.5 pl-4 pr-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSplit(i)}
                          className="text-text-tertiary hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {splits.length > 0 && (
                      <div className="flex justify-between text-[10px] text-text-tertiary pt-1 border-t border-border-subtle">
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
                      className="w-full rounded-lg border border-dashed border-border-subtle py-1.5 text-xs text-text-tertiary hover:border-border-subtle hover:text-text-secondary transition-colors"
                    >
                      + Add person
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {createTx.error && (
              <p className="text-sm text-red-500">{createTx.error.message}</p>
            )}
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
