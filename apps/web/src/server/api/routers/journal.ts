import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

async function ownEntry(ctx: any, id: string) {
  const row = await ctx.prisma.journalEntry.findUnique({ where: { id } })
  if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

export const journalRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.journalEntry.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { date: 'desc' },
    }),
  ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => ownEntry(ctx, input.id)),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().optional(),
        mood: z.string().optional(),
        date: z.coerce.date().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.journalEntry.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        mood: z.string().optional(),
        date: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownEntry(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.journalEntry.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownEntry(ctx, input.id)
      return ctx.prisma.journalEntry.delete({ where: { id: input.id } })
    }),
})
