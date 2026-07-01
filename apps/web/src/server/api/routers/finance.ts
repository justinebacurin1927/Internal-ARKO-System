import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const financeRouter = router({
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.user.id!
      return ctx.prisma.transaction.findMany({
        where: { userId },
        take: 50,
        orderBy: { date: 'desc' },
        include: { category: true },
      })
    }),

  createTransaction: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        description: z.string().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        categoryId: z.string(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      return ctx.prisma.transaction.create({
        data: {
          amount: input.amount,
          description: input.description,
          type: input.type,
          categoryId: input.categoryId,
          userId,
          date: input.date ?? new Date(),
        },
      })
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.accountCategory.findMany({
      orderBy: { name: 'asc' },
    })
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    const incomes = await ctx.prisma.transaction.aggregate({
      where: { userId, type: 'INCOME' },
      _sum: { amount: true },
    })
    const expenses = await ctx.prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE' },
      _sum: { amount: true },
    })
    return {
      balance: (incomes._sum.amount ?? 0) - (expenses._sum.amount ?? 0),
      income: incomes._sum.amount ?? 0,
      expenses: expenses._sum.amount ?? 0,
    }
  }),
})
