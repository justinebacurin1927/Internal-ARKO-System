'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@arko/ui'
import { X, Loader2, Calendar } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface SprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editId?: string
}

export function SprintDialog({ open, onOpenChange, editId }: SprintDialogProps) {
  const utils = api.useUtils()

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [color, setColor] = useState('#2D6A4F')
  const [isActive, setIsActive] = useState(true)

  // Load existing sprint data when editing
  const { data: sprints } = api.events.listSprints.useQuery()
  const existing = editId ? sprints?.find((s) => s.id === editId) : null

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setGoal(existing.goal ?? '')
      setStartDate(toLocalDateString(new Date(existing.startDate)))
      setEndDate(toLocalDateString(new Date(existing.endDate)))
      setColor(existing.color)
      setIsActive(existing.isActive)
    } else if (!open) {
      resetForm()
    }
  }, [existing, open, editId])

  const createMut = api.events.createSprint.useMutation({
    onSuccess: () => { utils.events.listSprints.invalidate(); handleClose() },
  })
  const updateMut = api.events.updateSprint.useMutation({
    onSuccess: () => { utils.events.listSprints.invalidate(); handleClose() },
  })

  const isPending = createMut.isPending || updateMut.isPending
  const isValid = name.trim() && startDate && endDate

  function resetForm() {
    setName('')
    setGoal('')
    setStartDate('')
    setEndDate('')
    setColor('#2D6A4F')
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
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      color,
      isActive,
    }

    if (editId) {
      await updateMut.mutateAsync({ id: editId, ...payload })
    } else {
      await createMut.mutateAsync(payload)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold tracking-tight text-gray-900">
              {editId ? 'Edit Sprint' : 'New Sprint'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="sprint-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Name
              </label>
              <input
                id="sprint-name"
                type="text"
                placeholder="e.g. Sprint 6"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                autoFocus
                required
              />
            </div>

            {/* Goal */}
            <div>
              <label htmlFor="sprint-goal" className="block text-sm font-medium text-gray-700 mb-1.5">
                Goal <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="sprint-goal"
                placeholder="What does this sprint aim to achieve?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none placeholder:text-gray-400"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sprint-start" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="sprint-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sprint-end" className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="sprint-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex items-center gap-3">
                {['#2D6A4F', '#1D4ED8', '#9333EA', '#DC2626', '#D97706', '#0891B2'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
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
              <span className="text-sm font-medium text-gray-700">Active sprint</span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending || !isValid}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Sprint'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
