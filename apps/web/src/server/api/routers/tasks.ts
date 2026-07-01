import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.user.id!
      return ctx.prisma.task.findMany({
        where: { assigneeId: userId },
        orderBy: { position: 'asc' },
        include: {
          comments: true,
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        dueDate: z.date().optional(),
        assigneeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const assigneeId = input.assigneeId ?? userId

      // If assigning to someone else, verify user exists
      if (input.assigneeId && input.assigneeId !== userId) {
        const target = await ctx.prisma.user.findUnique({ where: { id: input.assigneeId } })
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Assigned user not found' })
        }
      }

      const maxPos = await ctx.prisma.task.findFirst({
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      return ctx.prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          assigneeId,
          position: (maxPos?.position ?? -1) + 1,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      })
    }),

  assignTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        assigneeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { assigneeId: true },
      })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Only the current assignee or an ADMIN can reassign
      if (task.assigneeId !== userId) {
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        })
        if (user?.role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the current assignee or an admin can reassign tasks',
          })
        }
      }

      // Verify target user exists
      const target = await ctx.prisma.user.findUnique({ where: { id: input.assigneeId } })
      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      return ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { assigneeId: input.assigneeId },
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      })
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      // Ownership check — only the assignee can update a task
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { assigneeId: true },
      })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }
      if (task.assigneeId && task.assigneeId !== userId) {
        // ADMIN bypass: admins can update any task
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        })
        if (user?.role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own tasks',
          })
        }
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      })
    }),
})
