import { describe, it, expect, vi } from 'vitest'
import { financeRouter } from '../finance'
import { messagesRouter } from '../messages'

const base = (prisma: any) =>
  ({ user: { id: 'u1' }, session: { user: { id: 'u1' } }, userRole: 'USER', prisma }) as any

describe('finance router extensions', () => {
  it('listMetrics returns the user metrics', async () => {
    const ctx = base({ businessMetric: { findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]) } })
    expect(await financeRouter.createCaller(ctx).listMetrics()).toHaveLength(1)
  })

  it('createRecurring writes with the current userId', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'rt1' })
    const ctx = base({ recurringTransaction: { create } })
    await financeRouter.createCaller(ctx).createRecurring({
      description: 'Rent',
      amount: 1000,
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      nextDate: new Date('2026-08-01'),
    })
    expect(create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('upsertMetric records a history point', async () => {
    const historyCreate = vi.fn().mockResolvedValue({})
    const ctx = base({
      businessMetric: { upsert: vi.fn().mockResolvedValue({ id: 'm1' }) },
      metricHistory: { create: historyCreate },
    })
    await financeRouter.createCaller(ctx).upsertMetric({ key: 'mrr', name: 'MRR', value: 42 })
    expect(historyCreate).toHaveBeenCalledWith({ data: { metricId: 'm1', value: 42 } })
  })
})

describe('messages markRead', () => {
  it('rejects non-participants', async () => {
    const ctx = base({
      conversationParticipant: { findUnique: vi.fn().mockResolvedValue(null) },
    })
    await expect(
      messagesRouter.createCaller(ctx).markRead({ conversationId: 'c1' }),
    ).rejects.toThrow(/participant/i)
  })

  it('updates lastReadAt for a participant', async () => {
    const update = vi.fn().mockResolvedValue({})
    const ctx = base({
      conversationParticipant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'p1' }),
        update,
      },
    })
    await messagesRouter.createCaller(ctx).markRead({ conversationId: 'c1' })
    expect(update.mock.calls[0][0].data.lastReadAt).toBeInstanceOf(Date)
  })
})
