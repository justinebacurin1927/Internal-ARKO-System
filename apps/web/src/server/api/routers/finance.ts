import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const categoryTypes = {
  INCOME: ['INVESTMENT'],
  EXPENSE: ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'],
  TRANSFER: ['RECEIVABLE', 'PAYABLE'],
} as const

type FinanceScope = 'PERSONAL' | 'COMPANY'

function canManageCompanyFinance(ctx: any) {
  return ctx.userRole === 'ADMIN' || ctx.userRole === 'ACCOUNTANT'
}

function financeWhere(ctx: any, scope: FinanceScope) {
  if (scope === 'COMPANY') {
    if (!canManageCompanyFinance(ctx)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Company finance is restricted.' })
    }
    return { scope: 'COMPANY' as const }
  }
  return { scope: 'PERSONAL' as const, userId: ctx.user.id! }
}

async function assertCategoryAccess(
  ctx: any,
  categoryId: string,
  transactionType: keyof typeof categoryTypes,
  scope: FinanceScope,
) {
  const category = await ctx.prisma.accountCategory.findFirst({
    where: {
      id: categoryId,
      scope,
      ...(scope === 'PERSONAL'
        ? { OR: [{ userId: null }, { userId: ctx.user.id }] }
        : {}),
    },
    select: { type: true },
  })
  if (!category) throw new TRPCError({ code: 'FORBIDDEN', message: 'Category is not available.' })
  if (!(categoryTypes[transactionType] as readonly string[]).includes(category.type)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Category does not match the transaction type.' })
  }
}

export const financeRouter = router({
  getTransactions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().default(50),
          scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const scope = input?.scope ?? 'PERSONAL'
      const where = financeWhere(ctx, scope)

      return ctx.prisma.transaction.findMany({
        where,
        take: input?.limit ?? 50,
        orderBy: { date: 'desc' },
        include: {
          category: true,
          splitShares: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      })
    }),

  createTransaction: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        description: z.string().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        categoryId: z.string(),
        date: z.date().optional(),
        scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
        isSplit: z.boolean().default(false),
        splitWith: z
          .array(
            z.object({
              userId: z.string(),
              amount: z.number().positive(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      financeWhere(ctx, input.scope)
      await assertCategoryAccess(ctx, input.categoryId, input.type, input.scope)

      const splits = input.isSplit ? (input.splitWith ?? []) : []
      if (input.isSplit) {
        if (input.type !== 'EXPENSE' || splits.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only expenses can be split.' })
        }
        if (new Set(splits.map((split) => split.userId)).size !== splits.length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A person can only appear once in a split.' })
        }
        const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0)
        if (Math.abs(splitTotal - input.amount) >= 0.01) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Split amounts must equal the transaction amount.' })
        }
      }

      return ctx.prisma.transaction.create({
        data: {
          amount: input.amount,
          description: input.description,
          type: input.type,
          scope: input.scope,
          isSplit: input.isSplit,
          categoryId: input.categoryId,
          userId,
          date: input.date ?? new Date(),
          ...(splits.length > 0 && {
            splitShares: {
              createMany: {
                data: splits.map((split) => ({
                  userId: split.userId,
                  amount: split.amount,
                })),
              },
            },
          }),
        },
      })
    }),

  updateTransaction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive(),
        description: z.string().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        categoryId: z.string(),
        scope: z.enum(['PERSONAL', 'COMPANY']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.transaction.findUnique({ where: { id: input.id } })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (row.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (row.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      financeWhere(ctx, input.scope)
      await assertCategoryAccess(ctx, input.categoryId, input.type, input.scope)
      const { id, ...data } = input
      return ctx.prisma.transaction.update({ where: { id }, data })
    }),

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.transaction.findUnique({ where: { id: input.id } })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (row.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (row.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.transaction.delete({ where: { id: input.id } })
    }),

  getCategories: protectedProcedure
    .input(z.object({ scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL') }).optional())
    .query(async ({ ctx, input }) => {
    const scope = input?.scope ?? 'PERSONAL'
    financeWhere(ctx, scope)
    return ctx.prisma.accountCategory.findMany({
      where: scope === 'COMPANY'
        ? { scope: 'COMPANY' }
        : { scope: 'PERSONAL', OR: [{ userId: null }, { userId: ctx.user.id! }] },
      orderBy: { name: 'asc' },
    })
    }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
      }),
    )
    .mutation(({ ctx, input }) => {
      financeWhere(ctx, input.scope)
      const accountType = {
        INCOME: 'INVESTMENT',
        EXPENSE: 'CASH',
        TRANSFER: 'RECEIVABLE',
      } as const

      return ctx.prisma.accountCategory.create({
        data: {
          name: input.name,
          type: accountType[input.transactionType],
          userId: ctx.user.id!,
          scope: input.scope,
        },
      })
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.accountCategory.findUnique({ where: { id: input.id } })
      if (!category) throw new TRPCError({ code: 'NOT_FOUND' })
      if (category.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (category.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.accountCategory.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.accountCategory.findUnique({
        where: { id: input.id },
        select: { userId: true, scope: true, _count: { select: { transactions: true, recurring: true } } },
      })
      if (!category) throw new TRPCError({ code: 'NOT_FOUND' })
      if (
        (category.scope === 'COMPANY' && !canManageCompanyFinance(ctx)) ||
        (category.scope !== 'COMPANY' && category.userId !== ctx.user.id)
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      if (category._count.transactions > 0 || category._count.recurring > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This category is already used by a transaction.',
        })
      }
      return ctx.prisma.accountCategory.delete({ where: { id: input.id } })
    }),

  getBalance: protectedProcedure
    .input(
      z
        .object({
          scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const scope = input?.scope ?? 'PERSONAL'
      const where = financeWhere(ctx, scope)

      const incomes = await ctx.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      })
      const expenses = await ctx.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      })
      return {
        balance: (incomes._sum.amount ?? 0) - (expenses._sum.amount ?? 0),
        income: incomes._sum.amount ?? 0,
        expenses: expenses._sum.amount ?? 0,
      }
    }),

  /** Get all pending (unsettled) splits for the current user */
  getPendingSplits: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.splitShare.findMany({
      where: { userId, settled: false },
      include: {
        transaction: {
          include: {
            category: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { transaction: { date: 'desc' } },
    })
  }),

  /** Mark a split share as settled */
  settleSplit: protectedProcedure
    .input(z.object({ splitId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const share = await ctx.prisma.splitShare.findUnique({
        where: { id: input.splitId },
        select: { id: true, userId: true },
      })
      if (!share) throw new Error('Split share not found')
      if (share.userId !== userId) throw new Error('Not your split to settle')

      return ctx.prisma.splitShare.update({
        where: { id: input.splitId },
        data: { settled: true },
      })
    }),

  // ----- Business metrics -----
  listMetrics: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessMetric.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { name: 'asc' },
    })
  }),

  upsertMetric: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
        value: z.number().default(0),
        calculation: z.string().default('manual'),
        suffix: z.string().default(''),
        upIsGood: z.boolean().default(true),
        decimals: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const metric = await ctx.prisma.businessMetric.upsert({
        where: { userId_key: { userId, key: input.key } },
        update: {
          name: input.name,
          value: input.value,
          calculation: input.calculation,
          suffix: input.suffix,
          upIsGood: input.upIsGood,
          decimals: input.decimals,
        },
        create: { ...input, userId },
      })
      // Record a history point for the value.
      await ctx.prisma.metricHistory.create({
        data: { metricId: metric.id, value: input.value },
      })
      return metric
    }),

  getInsights: protectedProcedure
    .input(z.object({ scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL') }))
    .query(async ({ ctx, input }) => {
      const where = financeWhere(ctx, input.scope)
      const now = new Date()
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const rows = await ctx.prisma.transaction.findMany({
        where: { ...where, date: { gte: previousStart } },
        include: { category: true },
        orderBy: { date: 'desc' },
      })
      const current = rows.filter((row: any) => row.date >= currentStart)
      const previous = rows.filter((row: any) => row.date < currentStart)
      const totals = (items: any[]) => items.reduce(
        (sum, row) => {
          if (row.type === 'INCOME') sum.income += row.amount
          if (row.type === 'EXPENSE') sum.expenses += row.amount
          return sum
        },
        { income: 0, expenses: 0 },
      )
      const currentTotals = totals(current)
      const previousTotals = totals(previous)
      const categories = new Map<string, number>()
      current.filter((row: any) => row.type === 'EXPENSE').forEach((row: any) => {
        const name = row.category?.name ?? 'Uncategorized'
        categories.set(name, (categories.get(name) ?? 0) + row.amount)
      })
      const recurring = await ctx.prisma.recurringTransaction.findMany({
        where: {
          ...where,
          isActive: true,
          nextDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      })
      const forecastDelta = recurring.reduce((sum: number, row: any) => (
        row.type === 'INCOME' ? sum + row.amount : row.type === 'EXPENSE' ? sum - row.amount : sum
      ), 0)
      const net = currentTotals.income - currentTotals.expenses
      const previousNet = previousTotals.income - previousTotals.expenses
      const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]
      return {
        current: { ...currentTotals, net },
        previous: { ...previousTotals, net: previousNet },
        savingsRate: currentTotals.income > 0 ? (net / currentTotals.income) * 100 : 0,
        projectedBalance: net + forecastDelta,
        upcomingCount: recurring.length,
        topCategory: topCategory
          ? { name: topCategory[0], amount: topCategory[1] }
          : null,
      }
    }),

  listBudgets: protectedProcedure
    .input(z.object({ scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL') }))
    .query(async ({ ctx, input }) => {
      const where = financeWhere(ctx, input.scope)
      const budgets = await ctx.prisma.budget.findMany({
        where,
        include: { categories: { select: { id: true, name: true } } },
        orderBy: { periodStart: 'desc' },
      })
      const now = new Date()
      return Promise.all(budgets.map(async (budget: any) => {
        const categoryIds = budget.categories.map((category: any) => category.id)
        const spent = categoryIds.length === 0
          ? 0
          : (await ctx.prisma.transaction.aggregate({
              where: {
                ...financeWhere(ctx, input.scope),
                type: 'EXPENSE',
                categoryId: { in: categoryIds },
                date: {
                  gte: budget.periodStart,
                  lte: budget.periodEnd ?? now,
                },
              },
              _sum: { amount: true },
            }))._sum.amount ?? 0
        return { ...budget, spent, remaining: budget.amount - spent }
      }))
    }),

  createBudget: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(100),
      amount: z.number().positive(),
      scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
      categoryIds: z.array(z.string()).min(1),
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      financeWhere(ctx, input.scope)
      const categories = await ctx.prisma.accountCategory.findMany({
        where: {
          id: { in: input.categoryIds },
          ...(input.scope === 'COMPANY'
            ? { scope: 'COMPANY' }
            : { scope: 'PERSONAL', OR: [{ userId: null }, { userId: ctx.user.id! }] }),
        },
        select: { id: true },
      })
      if (categories.length !== input.categoryIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more categories are unavailable.' })
      }
      const { categoryIds, ...data } = input
      return ctx.prisma.budget.create({
        data: {
          ...data,
          userId: ctx.user.id!,
          categories: { connect: categoryIds.map((id) => ({ id })) },
        },
      })
    }),

  deleteBudget: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({ where: { id: input.id } })
      if (!budget) throw new TRPCError({ code: 'NOT_FOUND' })
      if (budget.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (budget.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.budget.delete({ where: { id: input.id } })
    }),

  // ----- Recurring transactions -----
  listRecurring: protectedProcedure
    .input(z.object({ scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL') }).optional())
    .query(async ({ ctx, input }) => {
    const scope = input?.scope ?? 'PERSONAL'
    return ctx.prisma.recurringTransaction.findMany({
      where: financeWhere(ctx, scope),
      orderBy: { nextDate: 'asc' },
      include: { category: true },
    })
    }),

  createRecurring: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        amount: z.number().positive(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        scope: z.enum(['PERSONAL', 'COMPANY']).default('PERSONAL'),
        frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
        categoryId: z.string().optional(),
        nextDate: z.coerce.date(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      financeWhere(ctx, input.scope)
      return ctx.prisma.recurringTransaction.create({
        data: { ...input, userId: ctx.user.id! },
      })
    }),

  updateRecurring: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
        scope: z.enum(['PERSONAL', 'COMPANY']).optional(),
        frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
        categoryId: z.string().optional(),
        nextDate: z.coerce.date().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.recurringTransaction.findUnique({ where: { id: input.id } })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (row.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      if (input.scope) financeWhere(ctx, input.scope)
      const { id, ...data } = input
      return ctx.prisma.recurringTransaction.update({ where: { id }, data })
    }),

  deleteRecurring: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.recurringTransaction.findUnique({ where: { id: input.id } })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (row.scope === 'COMPANY') financeWhere(ctx, 'COMPANY')
      else if (row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.recurringTransaction.delete({ where: { id: input.id } })
    }),
})
