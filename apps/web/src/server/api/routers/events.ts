import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

async function ownEvent(ctx: any, id: string) {
  const row = await ctx.prisma.event.findUnique({ where: { id } })
  if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

async function ownSprint(ctx: any, id: string) {
  const row = await ctx.prisma.sprint.findUnique({ where: { id } })
  if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

export const eventsRouter = router({
  // ----- Events -----
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.event.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { date: 'asc' },
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        date: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        startTime: z.string(),
        endTime: z.string(),
        color: z.string().default('#2D6A4F'),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.event.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        date: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownEvent(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.event.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownEvent(ctx, input.id)
      return ctx.prisma.event.delete({ where: { id: input.id } })
    }),

  // ----- Sprints -----
  listSprints: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.sprint.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { startDate: 'desc' },
    }),
  ),

  createSprint: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        goal: z.string().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        color: z.string().default('#2D6A4F'),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.sprint.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  updateSprint: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        goal: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownSprint(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.sprint.update({ where: { id }, data })
    }),

  deleteSprint: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownSprint(ctx, input.id)
      return ctx.prisma.sprint.delete({ where: { id: input.id } })
    }),
})
