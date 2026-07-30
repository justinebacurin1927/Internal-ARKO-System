import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const categoryTypes = {
  INCOME: ['INVESTMENT'],
  EXPENSE: ['CREDIT_CARD', 'CASH', 'CHECKING', 'SAVINGS'],
  TRANSFER: ['RECEIVABLE', 'PAYABLE'],
} as const

async function assertCategoryAccess(ctx: any, categoryId: string, transactionType: keyof typeof categoryTypes) {
  const category = await ctx.prisma.accountCategory.findFirst({
    where: {
      id: categoryId,
      OR: [{ userId: null }, { userId: ctx.user.id }],
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
          scope: z.enum(['PERSONAL', 'COMPANY']).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const where: any = { userId }
      if (input?.scope) where.scope = input.scope

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
      await assertCategoryAccess(ctx, input.categoryId, input.type)

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
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      await assertCategoryAccess(ctx, input.categoryId, input.type)
      const { id, ...data } = input
      return ctx.prisma.transaction.update({ where: { id }, data })
    }),

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.transaction.findUnique({ where: { id: input.id } })
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.transaction.delete({ where: { id: input.id } })
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.accountCategory.findMany({
      where: { OR: [{ userId: null }, { userId: ctx.user.id! }] },
      orderBy: { name: 'asc' },
    })
  }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
      }),
    )
    .mutation(({ ctx, input }) => {
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
        },
      })
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.accountCategory.findUnique({ where: { id: input.id } })
      if (!category || category.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
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
        select: { userId: true, _count: { select: { transactions: true, recurring: true } } },
      })
      if (!category || category.userId !== ctx.user.id) {
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
          scope: z.enum(['PERSONAL', 'COMPANY']).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const where: any = { userId }
      if (input?.scope) where.scope = input.scope

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

  // ----- Recurring transactions -----
  listRecurring: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.recurringTransaction.findMany({
      where: { userId: ctx.user.id! },
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
        frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
        categoryId: z.string().optional(),
        nextDate: z.coerce.date(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
        frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
        categoryId: z.string().optional(),
        nextDate: z.coerce.date().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.recurringTransaction.findUnique({ where: { id: input.id } })
      if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      const { id, ...data } = input
      return ctx.prisma.recurringTransaction.update({ where: { id }, data })
    }),

  deleteRecurring: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.recurringTransaction.findUnique({ where: { id: input.id } })
      if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.recurringTransaction.delete({ where: { id: input.id } })
    }),
})
