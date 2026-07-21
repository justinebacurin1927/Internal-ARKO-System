import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

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

      const tx = await ctx.prisma.transaction.create({
        data: {
          amount: input.amount,
          description: input.description,
          type: input.type,
          scope: input.scope,
          isSplit: input.isSplit,
          categoryId: input.categoryId,
          userId,
          date: input.date ?? new Date(),
        },
      })

      // Create split shares if splitting
      if (input.isSplit && input.splitWith && input.splitWith.length > 0) {
        await ctx.prisma.splitShare.createMany({
          data: input.splitWith.map((s) => ({
            transactionId: tx.id,
            userId: s.userId,
            amount: s.amount,
          })),
        })
      }

      return tx
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.accountCategory.findMany({
      orderBy: { name: 'asc' },
    })
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
})
