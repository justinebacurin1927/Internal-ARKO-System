import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.count({
      where: { userId: ctx.user.id!, read: false },
    }),
  ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const n = await ctx.prisma.notification.findUnique({ where: { id: input.id } })
      if (!n || n.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.notification.update({
        where: { id: input.id },
        data: { read: true },
      })
    }),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notification.updateMany({
      where: { userId: ctx.user.id!, read: false },
      data: { read: true },
    }),
  ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const n = await ctx.prisma.notification.findUnique({ where: { id: input.id } })
      if (!n || n.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.notification.delete({ where: { id: input.id } })
    }),
})
