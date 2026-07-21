import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const remindersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueAt: 'asc' },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        note: z.string().max(2000).optional(),
        dueAt: z.string().datetime().or(z.date()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const dueAt = typeof input.dueAt === 'string' ? new Date(input.dueAt) : input.dueAt

      return ctx.prisma.reminder.create({
        data: {
          title: input.title,
          note: input.note,
          dueAt,
          userId,
        },
      })
    }),

  toggleDone: protectedProcedure
    .input(z.object({ id: z.string(), isDone: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })
      if (!reminder) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reminder not found' })
      if (reminder.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your reminder' })
      }

      return ctx.prisma.reminder.update({
        where: { id: input.id },
        data: { isDone: input.isDone },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })
      if (!reminder) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reminder not found' })
      if (reminder.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your reminder' })
      }

      return ctx.prisma.reminder.delete({ where: { id: input.id } })
    }),
})
