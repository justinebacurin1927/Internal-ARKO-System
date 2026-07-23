import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const assigneeInclude = {
  assignee: { select: { id: true, name: true, email: true, image: true } },
} as const

/**
 * Enforce the task ownership rule used across this router: only the task's
 * assignee may act on it, with an ADMIN role bypass. Returns the task's
 * assigneeId + parentId for callers that need them. Throws NOT_FOUND / FORBIDDEN.
 */
async function assertTaskAccess(ctx: any, taskId: string) {
  const task = await ctx.prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, parentId: true },
  })
  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
  }
  if (task.assigneeId && task.assigneeId !== ctx.user.id) {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { role: true },
    })
    if (user?.role !== 'ADMIN') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only update your own tasks' })
    }
  }
  return task
}

/**
 * Detect whether adding "blockerId blocks taskId" would create a cycle, i.e.
 * whether taskId can already reach blockerId by following existing blocking
 * edges (taskId blocks X blocks ... blocks blockerId). BFS over TaskDependency.
 */
async function wouldCreateCycle(ctx: any, taskId: string, blockerId: string): Promise<boolean> {
  let frontier = [taskId]
  const seen = new Set<string>()
  while (frontier.length > 0) {
    const edges = await ctx.prisma.taskDependency.findMany({
      where: { blockingId: { in: frontier } },
      select: { blockedId: true },
    })
    const next: string[] = []
    for (const e of edges) {
      if (e.blockedId === blockerId) return true
      if (!seen.has(e.blockedId)) {
        seen.add(e.blockedId)
        next.push(e.blockedId)
      }
    }
    frontier = next
  }
  return false
}

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.user.id!
      return ctx.prisma.task.findMany({
        where: { assigneeId: userId },
        orderBy: { position: 'asc' },
        include: {
          ...assigneeInclude,
          subtasks: { select: { id: true, title: true, status: true } },
          blockedBy: {
            select: { blocking: { select: { id: true, title: true, status: true } } },
          },
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
        parentId: z.string().optional(),
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

      // Subtask: caller must be able to access the parent (assignee or ADMIN),
      // and the parent must itself be top-level (one level of nesting).
      if (input.parentId) {
        const parent = await assertTaskAccess(ctx, input.parentId)
        if (parent.parentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Subtasks can only be one level deep',
          })
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
          parentId: input.parentId,
          position: (maxPos?.position ?? -1) + 1,
        },
        include: assigneeInclude,
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTaskAccess(ctx, input.id)

      // Guard: cannot move a task to DONE while it has an incomplete blocker
      if (input.status === 'DONE') {
        await assertNotBlocked(ctx, input.id)
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.status !== undefined && { status: input.status }),
        },
        include: assigneeInclude,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTaskAccess(ctx, input.id)

      // Promote any subtasks to top-level rather than cascade-deleting them
      await ctx.prisma.task.updateMany({
        where: { parentId: input.id },
        data: { parentId: null },
      })

      return ctx.prisma.task.delete({ where: { id: input.id } })
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
        include: assigneeInclude,
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
      await assertTaskAccess(ctx, input.id)

      // Guard: cannot move a task to DONE while it has an incomplete blocker
      if (input.status === 'DONE') {
        await assertNotBlocked(ctx, input.id)
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: input.status },
        include: assigneeInclude,
      })
    }),

  addDependency: protectedProcedure
    .input(z.object({ taskId: z.string(), blockerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.taskId === input.blockerId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A task cannot depend on itself' })
      }
      // Ownership is enforced on the task being blocked
      await assertTaskAccess(ctx, input.taskId)

      const blocker = await ctx.prisma.task.findUnique({
        where: { id: input.blockerId },
        select: { id: true },
      })
      if (!blocker) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Blocking task not found' })
      }

      if (await wouldCreateCycle(ctx, input.taskId, input.blockerId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'That dependency would create a cycle',
        })
      }

      return ctx.prisma.taskDependency.create({
        data: { blockingId: input.blockerId, blockedId: input.taskId },
      })
    }),

  removeDependency: protectedProcedure
    .input(z.object({ taskId: z.string(), blockerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTaskAccess(ctx, input.taskId)
      return ctx.prisma.taskDependency.deleteMany({
        where: { blockingId: input.blockerId, blockedId: input.taskId },
      })
    }),
})

/**
 * Throw if the task has at least one blocker that is not yet DONE.
 * Used to prevent completing a task while its dependencies are incomplete.
 */
async function assertNotBlocked(ctx: any, taskId: string) {
  const blockers = await ctx.prisma.taskDependency.findMany({
    where: { blockedId: taskId },
    select: { blocking: { select: { status: true } } },
  })
  const incomplete = blockers.some((b: any) => b.blocking?.status && b.blocking.status !== 'DONE')
  if (incomplete) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This task is blocked by an incomplete task and cannot be completed yet',
    })
  }
}
