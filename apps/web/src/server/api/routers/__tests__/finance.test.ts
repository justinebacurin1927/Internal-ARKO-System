import { describe, it, expect, jest } from '@jest/globals'
import { financeRouter } from '../finance'

const ctx = (over: any = {}) => {
  const transactions: any[] = over._transactions ?? []
  const splitShares: any[] = over._splitShares ?? []
  const categories: any[] = over._categories ?? []
  const metrics: any[] = over._metrics ?? []
  const metricHistory: any[] = over._metricHistory ?? []
  const recurringTx: any[] = over._recurringTx ?? []

  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      transaction: {
        findMany: jest.fn().mockImplementation(({ where, take, orderBy, include }: any) => {
          let result = transactions.filter((t: any) => {
            if (where?.userId && t.userId !== where.userId) return false
            if (where?.scope && t.scope !== where.scope) return false
            if (where?.type && t.type !== where.type) return false
            return true
          })
          if (orderBy?.date === 'desc') result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          if (take) result = result.slice(0, take)
          return Promise.resolve(result.map((t: any) => ({
            ...t,
            category: categories.find((c: any) => c.id === t.categoryId) ?? null,
            splitShares: splitShares.filter((s: any) => s.transactionId === t.id),
          })))
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = {
            id: `tx-${transactions.length + 1}`,
            ...data,
            date: data.date ?? new Date(),
            createdAt: new Date(),
          }
          transactions.push(row)
          return Promise.resolve(row)
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(transactions.find((t: any) => t.id === where.id) ?? null),
        ),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const index = transactions.findIndex((t: any) => t.id === where.id)
          transactions[index] = { ...transactions[index], ...data }
          return Promise.resolve(transactions[index])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const index = transactions.findIndex((t: any) => t.id === where.id)
          const [deleted] = transactions.splice(index, 1)
          return Promise.resolve(deleted)
        }),
        aggregate: jest.fn().mockImplementation(({ where }: any) => {
          const filtered = transactions.filter((t: any) => {
            if (where?.userId && t.userId !== where.userId) return false
            if (where?.type && t.type !== where.type) return false
            if (where?.scope && t.scope !== where.scope) return false
            return true
          })
          const sum = filtered.reduce((acc: number, t: any) => acc + t.amount, 0)
          return Promise.resolve({ _sum: { amount: sum } })
        }),
        ...(over.transaction ?? {}),
      },

      splitShare: {
        findMany: jest.fn().mockImplementation(({ where, include, orderBy }: any) => {
          let result = splitShares.filter((s: any) => {
            if (where?.userId && s.userId !== where.userId) return false
            if (where?.settled !== undefined && s.settled !== where.settled) return false
            return true
          })
          if (orderBy?.transaction?.date === 'desc') {
            result = [...result].sort((a, b) => {
              const ta = transactions.find((t: any) => t.id === a.transactionId)
              const tb = transactions.find((t: any) => t.id === b.transactionId)
              return new Date(tb?.date ?? 0).getTime() - new Date(ta?.date ?? 0).getTime()
            })
          }
          return Promise.resolve(result.map((s: any) => ({
            ...s,
            transaction: include?.transaction
              ? {
                  ...transactions.find((t: any) => t.id === s.transactionId),
                  category: categories.find((c: any) => c.id === (transactions.find((t: any) => t.id === s.transactionId)?.categoryId)),
                  user: { id: 'u1', name: 'User', email: 'user@test.com' },
                }
              : undefined,
          })))
        }),
        findUnique: jest.fn().mockImplementation(({ where, select }: any) => {
          const s = splitShares.find((s: any) => s.id === where.id) ?? null
          if (!s) return Promise.resolve(null)
          if (select) {
            const selected: any = {}
            if (select.id) selected.id = s.id
            if (select.userId) selected.userId = s.userId
            return Promise.resolve(selected)
          }
          return Promise.resolve(s)
        }),
        createMany: jest.fn().mockImplementation(({ data }: any) => {
          const rows = data.map((d: any) => ({
            id: `ss-${splitShares.length + 1}`,
            ...d,
            settled: false,
          }))
          splitShares.push(...rows)
          return Promise.resolve({ count: rows.length })
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = splitShares.findIndex((s: any) => s.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          splitShares[idx] = { ...splitShares[idx], ...data }
          return Promise.resolve(splitShares[idx])
        }),
        ...(over.splitShare ?? {}),
      },

      accountCategory: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(categories)),
        findFirst: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(categories.find((c: any) => c.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: `c-${categories.length + 1}`, ...data }
          categories.push(row)
          return Promise.resolve(row)
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(categories.find((c: any) => c.id === where.id) ?? null),
        ),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const index = categories.findIndex((c: any) => c.id === where.id)
          const [deleted] = categories.splice(index, 1)
          return Promise.resolve(deleted)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const index = categories.findIndex((c: any) => c.id === where.id)
          categories[index] = { ...categories[index], ...data }
          return Promise.resolve(categories[index])
        }),
        ...(over.accountCategory ?? {}),
      },

      businessMetric: {
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(metrics.filter((m: any) => where?.userId ? m.userId === where.userId : true)),
        ),
        upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
          const existing = metrics.find((m: any) => m.userId === create.userId && m.key === create.key)
          if (existing) {
            Object.assign(existing, update)
            return Promise.resolve(existing)
          }
          const row = { id: `m-${metrics.length + 1}`, ...create, createdAt: new Date() }
          metrics.push(row)
          return Promise.resolve(row)
        }),
        ...(over.businessMetric ?? {}),
      },

      metricHistory: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: `mh-${metricHistory.length + 1}`, ...data, createdAt: new Date() }
          metricHistory.push(row)
          return Promise.resolve(row)
        }),
        ...(over.metricHistory ?? {}),
      },

      recurringTransaction: {
        findMany: jest.fn().mockImplementation(({ where, orderBy }: any) => {
          let result = recurringTx.filter((r: any) => {
            if (where?.userId && r.userId !== where.userId) return false
            return true
          })
          if (orderBy?.nextDate === 'asc') {
            result = [...result].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
          }
          return Promise.resolve(result.map((r: any) => ({
            ...r,
            category: categories.find((c: any) => c.id === r.categoryId) ?? null,
          })))
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(recurringTx.find((r: any) => r.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: `rt-${recurringTx.length + 1}`, ...data, createdAt: new Date() }
          recurringTx.push(row)
          return Promise.resolve(row)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = recurringTx.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          recurringTx[idx] = { ...recurringTx[idx], ...data }
          return Promise.resolve(recurringTx[idx])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = recurringTx.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          const [deleted] = recurringTx.splice(idx, 1)
          return Promise.resolve(deleted)
        }),
        ...(over.recurringTransaction ?? {}),
      },
    },
  } as any
}

describe('finance router', () => {
  describe('getTransactions', () => {
    it('returns transactions for the current user ordered by date desc', async () => {
      const c = ctx({
        userId: 'u1',
        _transactions: [
          { id: 't1', userId: 'u1', amount: 100, type: 'INCOME', categoryId: 'c1', date: new Date('2026-07-22'), scope: 'PERSONAL', description: 'Paycheck', isSplit: false },
          { id: 't2', userId: 'u1', amount: 50, type: 'EXPENSE', categoryId: 'c2', date: new Date('2026-07-23'), scope: 'PERSONAL', description: 'Groceries', isSplit: false },
        ],
        _categories: [
          { id: 'c1', name: 'Salary', type: 'INCOME' },
          { id: 'c2', name: 'Food', type: 'EXPENSE' },
        ],
      })
      const res = await financeRouter.createCaller(c).getTransactions()
      expect(res).toHaveLength(2)
      // Should be desc by date: t2 then t1
      expect(res[0].id).toBe('t2')
      expect(res[1].id).toBe('t1')
      // Should include category
      expect(res[0].category?.name).toBe('Food')
    })

    it('filters by scope', async () => {
      const c = ctx({
        _transactions: [
          { id: 't1', userId: 'u1', amount: 100, type: 'INCOME', categoryId: 'c1', date: new Date(), scope: 'PERSONAL', isSplit: false },
          { id: 't2', userId: 'u1', amount: 200, type: 'INCOME', categoryId: 'c2', date: new Date(), scope: 'COMPANY', isSplit: false },
        ],
      })
      const res = await financeRouter.createCaller(c).getTransactions({ scope: 'COMPANY' })
      expect(res).toHaveLength(1)
      expect(res[0].amount).toBe(200)
    })

    it('respects limit parameter', async () => {
      const c = ctx({
        _transactions: Array.from({ length: 5 }, (_, i) => ({
          id: `t${i}`,
          userId: 'u1',
          amount: 100,
          type: 'INCOME',
          categoryId: 'c1',
          date: new Date(2026, 6, 20 + i),
          scope: 'PERSONAL',
          isSplit: false,
        })),
      })
      const res = await financeRouter.createCaller(c).getTransactions({ limit: 2 })
      expect(res).toHaveLength(2)
    })
  })

  describe('createTransaction', () => {
    it('creates a simple transaction', async () => {
      const c = ctx({ _categories: [{ id: 'c1', name: 'Salary', type: 'INVESTMENT', userId: null }] })
      const res = await financeRouter.createCaller(c).createTransaction({
        amount: 500,
        type: 'INCOME',
        categoryId: 'c1',
        description: 'Freelance',
      })
      expect(c.prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', amount: 500 }),
        }),
      )
      expect(res.userId).toBe('u1')
    })

    it('creates a split transaction with split shares', async () => {
      const c = ctx({ _categories: [{ id: 'c1', name: 'Bill', type: 'CASH', userId: null }] })
      await financeRouter.createCaller(c).createTransaction({
        amount: 300,
        type: 'EXPENSE',
        categoryId: 'c1',
        isSplit: true,
        splitWith: [
          { userId: 'u2', amount: 150 },
          { userId: 'u3', amount: 150 },
        ],
      })
      expect(c.prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            splitShares: {
              createMany: {
                data: expect.arrayContaining([
                  expect.objectContaining({ userId: 'u2', amount: 150 }),
                ]),
              },
            },
          }),
        }),
      )
    })

    it('rejects negative amount', async () => {
      const c = ctx({ _categories: [{ id: 'c1', name: 'Test' }] })
      await expect(
        financeRouter.createCaller(c).createTransaction({
          amount: -50,
          type: 'EXPENSE',
          categoryId: 'c1',
        }),
      ).rejects.toThrow()
    })

    it('rejects split amounts that do not equal the transaction amount', async () => {
      const c = ctx({ _categories: [{ id: 'c1', type: 'CASH', userId: null }] })
      await expect(
        financeRouter.createCaller(c).createTransaction({
          amount: 300,
          type: 'EXPENSE',
          categoryId: 'c1',
          isSplit: true,
          splitWith: [{ userId: 'u2', amount: 100 }],
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects a category for the wrong transaction type', async () => {
      const c = ctx({ _categories: [{ id: 'c1', type: 'CASH', userId: null }] })
      await expect(
        financeRouter.createCaller(c).createTransaction({
          amount: 300,
          type: 'INCOME',
          categoryId: 'c1',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })
  })

  describe('getCategories', () => {
    it('returns all categories ordered by name asc', async () => {
      const c = ctx({ _categories: [
        { id: 'c2', name: 'Food', type: 'EXPENSE' },
        { id: 'c1', name: 'Salary', type: 'INCOME' },
      ]})
      const res = await financeRouter.createCaller(c).getCategories()
      expect(res).toHaveLength(2)
      expect(res[0].name).toBe('Food')
      expect(res[1].name).toBe('Salary')
    })

    it('creates a custom category for the current user and transaction type', async () => {
      const c = ctx()
      const category = await financeRouter.createCaller(c).createCategory({
        name: 'Subscriptions',
        transactionType: 'EXPENSE',
      })
      expect(category).toMatchObject({
        name: 'Subscriptions',
        type: 'CASH',
        userId: 'u1',
      })
    })

    it('rejects deleting another user’s category', async () => {
      const c = ctx({
        _categories: [{ id: 'c1', name: 'Private', type: 'CASH', userId: 'u2' }],
      })
      await expect(
        financeRouter.createCaller(c).deleteCategory({ id: 'c1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('deletes an unused custom category owned by the current user', async () => {
      const remove = jest.fn().mockResolvedValue({ id: 'c1' })
      const c = ctx({
        accountCategory: {
          findUnique: jest.fn().mockResolvedValue({
            userId: 'u1',
            _count: { transactions: 0, recurring: 0 },
          }),
          delete: remove,
        },
      })
      await financeRouter.createCaller(c).deleteCategory({ id: 'c1' })
      expect(remove).toHaveBeenCalledWith({ where: { id: 'c1' } })
    })

    it('keeps a custom category that is already in use', async () => {
      const c = ctx({
        accountCategory: {
          findUnique: jest.fn().mockResolvedValue({
            userId: 'u1',
            _count: { transactions: 1, recurring: 0 },
          }),
        },
      })
      await expect(
        financeRouter.createCaller(c).deleteCategory({ id: 'c1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
    })
  })

  describe('getBalance', () => {
    it('calculates balance from income minus expenses', async () => {
      const c = ctx({ _transactions: [
        { id: 't1', userId: 'u1', amount: 1000, type: 'INCOME', date: new Date(), scope: 'PERSONAL' },
        { id: 't2', userId: 'u1', amount: 300, type: 'EXPENSE', date: new Date(), scope: 'PERSONAL' },
        { id: 't3', userId: 'u1', amount: 200, type: 'EXPENSE', date: new Date(), scope: 'PERSONAL' },
      ]})
      const res = await financeRouter.createCaller(c).getBalance()
      expect(res.income).toBe(1000)
      expect(res.expenses).toBe(500)
      expect(res.balance).toBe(500)
    })

    it('filters balance by scope', async () => {
      const c = ctx({ _transactions: [
        { id: 't1', userId: 'u1', amount: 1000, type: 'INCOME', date: new Date(), scope: 'PERSONAL' },
        { id: 't2', userId: 'u1', amount: 500, type: 'INCOME', date: new Date(), scope: 'COMPANY' },
        { id: 't3', userId: 'u1', amount: 200, type: 'EXPENSE', date: new Date(), scope: 'PERSONAL' },
      ]})
      const res = await financeRouter.createCaller(c).getBalance({ scope: 'PERSONAL' })
      expect(res.income).toBe(1000)
      expect(res.expenses).toBe(200)
      expect(res.balance).toBe(800)
    })
  })

  describe('getPendingSplits', () => {
    it('returns unsettled splits for current user', async () => {
      const c = ctx({
        _splitShares: [
          { id: 's1', userId: 'u1', transactionId: 't1', amount: 50, settled: false },
          { id: 's2', userId: 'u1', transactionId: 't2', amount: 30, settled: true },
          { id: 's3', userId: 'u2', transactionId: 't3', amount: 20, settled: false },
        ],
        _transactions: [
          { id: 't1', userId: 'u2', amount: 100, type: 'EXPENSE', categoryId: 'c1', date: new Date(), scope: 'PERSONAL', description: 'Dinner', isSplit: true },
          { id: 't2', userId: 'u2', amount: 60, type: 'EXPENSE', categoryId: 'c2', date: new Date(), scope: 'PERSONAL', description: 'Uber', isSplit: true },
        ],
        _categories: [
          { id: 'c1', name: 'Food' },
          { id: 'c2', name: 'Transport' },
        ],
      })
      const res = await financeRouter.createCaller(c).getPendingSplits()
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe('s1')
      expect(res[0].settled).toBe(false)
    })
  })

  describe('settleSplit', () => {
    it('settles an owned pending split', async () => {
      const c = ctx({
        _splitShares: [{ id: 's1', userId: 'u1', transactionId: 't1', amount: 50, settled: false }],
      })
      const res = await financeRouter.createCaller(c).settleSplit({ splitId: 's1' })
      expect(res.settled).toBe(true)
    })

    it('rejects settling another users split', async () => {
      const c = ctx({
        _splitShares: [{ id: 's1', userId: 'u2', transactionId: 't1', amount: 50, settled: false }],
      })
      await expect(
        financeRouter.createCaller(c).settleSplit({ splitId: 's1' }),
      ).rejects.toThrow('Not your split to settle')
    })

    it('throws on non-existent split', async () => {
      const c = ctx()
      await expect(
        financeRouter.createCaller(c).settleSplit({ splitId: 'ghost' }),
      ).rejects.toThrow()
    })
  })

  describe('listMetrics', () => {
    it('returns business metrics for the current user', async () => {
      const c = ctx({ _metrics: [
        { id: 'm1', userId: 'u1', key: 'revenue', name: 'Revenue', value: 50000, calculation: 'manual', suffix: '$', upIsGood: true, decimals: 2 },
      ]})
      const res = await financeRouter.createCaller(c).listMetrics()
      expect(res).toHaveLength(1)
      expect(res[0].key).toBe('revenue')
    })
  })

  describe('upsertMetric', () => {
    it('creates a new metric and records history', async () => {
      const c = ctx()
      const res = await financeRouter.createCaller(c).upsertMetric({
        key: 'users',
        name: 'Active Users',
        value: 1500,
        calculation: 'manual',
        suffix: '',
        upIsGood: true,
        decimals: 0,
      })
      expect(res.key).toBe('users')
      expect(res.value).toBe(1500)
      expect(c.prisma.metricHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: 1500 }),
        }),
      )
    })

    it('updates an existing metric and records history', async () => {
      const c = ctx({ _metrics: [
        { id: 'm1', userId: 'u1', key: 'users', name: 'Users', value: 1000, calculation: 'manual', suffix: '', upIsGood: true, decimals: 0 },
      ]})
      const res = await financeRouter.createCaller(c).upsertMetric({
        key: 'users',
        name: 'Active Users',
        value: 2000,
        calculation: 'count',
        suffix: '',
        upIsGood: true,
        decimals: 0,
      })
      expect(res.name).toBe('Active Users')
      expect(res.value).toBe(2000)
    })
  })

  describe('listRecurring', () => {
    it('returns recurring transactions for current user with categories', async () => {
      const c = ctx({
        _recurringTx: [
          { id: 'r1', userId: 'u1', description: 'Netflix', amount: 15.99, type: 'EXPENSE', frequency: 'MONTHLY', categoryId: 'c1', nextDate: new Date('2026-08-01'), isActive: true },
        ],
        _categories: [{ id: 'c1', name: 'Subscriptions' }],
      })
      const res = await financeRouter.createCaller(c).listRecurring()
      expect(res).toHaveLength(1)
      expect(res[0].description).toBe('Netflix')
      expect(res[0].category?.name).toBe('Subscriptions')
    })
  })

  describe('createRecurring', () => {
    it('creates a recurring transaction', async () => {
      const c = ctx()
      const res = await financeRouter.createCaller(c).createRecurring({
        description: 'Rent',
        amount: 1200,
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        nextDate: new Date('2026-08-01'),
      })
      expect(res.userId).toBe('u1')
    })
  })

  describe('updateRecurring', () => {
    it('updates own recurring transaction', async () => {
      const c = ctx({ _recurringTx: [
        { id: 'r1', userId: 'u1', description: 'Old', amount: 100, type: 'EXPENSE', frequency: 'MONTHLY', nextDate: new Date(), isActive: true },
      ]})
      const res = await financeRouter.createCaller(c).updateRecurring({
        id: 'r1',
        amount: 150,
        isActive: false,
      })
      expect(res.amount).toBe(150)
      expect(res.isActive).toBe(false)
    })

    it('rejects updating another user recurring', async () => {
      const c = ctx({ _recurringTx: [
        { id: 'r1', userId: 'u2', description: 'Not mine', amount: 100, type: 'EXPENSE', frequency: 'MONTHLY', nextDate: new Date(), isActive: true },
      ]})
      await expect(
        financeRouter.createCaller(c).updateRecurring({ id: 'r1', amount: 999 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('deleteRecurring', () => {
    it('deletes own recurring transaction', async () => {
      const c = ctx({ _recurringTx: [
        { id: 'r1', userId: 'u1', description: 'Delete me', amount: 10, type: 'EXPENSE', frequency: 'MONTHLY', nextDate: new Date(), isActive: true },
      ]})
      await financeRouter.createCaller(c).deleteRecurring({ id: 'r1' })
      expect(c.prisma.recurringTransaction.delete).toHaveBeenCalled()
    })

    it('rejects deleting another user recurring', async () => {
      const c = ctx({ _recurringTx: [
        { id: 'r1', userId: 'u2', description: 'Not mine', amount: 10, type: 'EXPENSE', frequency: 'MONTHLY', nextDate: new Date(), isActive: true },
      ]})
      await expect(
        financeRouter.createCaller(c).deleteRecurring({ id: 'r1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })
})
