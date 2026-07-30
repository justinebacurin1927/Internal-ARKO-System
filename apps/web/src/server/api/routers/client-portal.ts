import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, requireRole, router } from '../trpc'

const projectStatus = z.enum(['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED', 'ON_HOLD'])
const requestStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED'])

const projectInclude = {
  client: { select: { id: true, name: true, email: true } },
  updates: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    include: { author: { select: { id: true, name: true } } },
  },
  requests: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
  milestones: { orderBy: { createdAt: 'asc' as const } },
  deliverables: { orderBy: { createdAt: 'desc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const }, take: 20 },
}

async function manageableProject(ctx: any, projectId: string) {
  const project = await ctx.prisma.clientProject.findUnique({ where: { id: projectId } })
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  if (ctx.userRole !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return project
}

export const clientPortalRouter = router({
  dashboard: protectedProcedure
    .use(requireRole(['ADMIN', 'CLIENT']))
    .query(({ ctx }) =>
      ctx.prisma.clientProject.findMany({
        where:
          ctx.userRole === 'CLIENT'
            ? { clientId: ctx.user.id! }
            : {},
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
      }),
    ),

  requests: protectedProcedure
    .use(requireRole(['ADMIN', 'CLIENT']))
    .query(({ ctx }) =>
      ctx.prisma.clientRequest.findMany({
        where:
          ctx.userRole === 'CLIENT'
            ? { clientId: ctx.user.id! }
            : {},
        include: {
          client: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, ownerId: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ),

  createProject: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        summary: z.string().trim().max(1000).optional(),
        clientId: z.string(),
        progress: z.number().int().min(0).max(100).default(0),
        status: projectStatus.default('PLANNING'),
        startDate: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.user.findFirst({
        where: { id: input.clientId, role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      })
      if (!client) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an active client' })
      return ctx.prisma.clientProject.create({
        data: { ...input, ownerId: ctx.user.id! },
        include: projectInclude,
      })
    }),

  updateProject: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        id: z.string(),
        status: projectStatus.optional(),
        progress: z.number().int().min(0).max(100).optional(),
        summary: z.string().trim().max(1000).optional(),
        startDate: z.coerce.date().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await manageableProject(ctx, input.id)
      const { id, ...data } = input
      const detail = [
        data.status ? `status: ${data.status}` : null,
        data.progress !== undefined ? `progress: ${data.progress}%` : null,
        data.startDate !== undefined ? 'start date updated' : null,
        data.dueDate !== undefined ? 'target date updated' : null,
        data.summary !== undefined ? 'project brief updated' : null,
      ].filter(Boolean).join(', ')
      const [project] = await ctx.prisma.$transaction([
        ctx.prisma.clientProject.update({ where: { id }, data }),
        ctx.prisma.projectActivity.create({
          data: {
            projectId: id,
            action: 'PROJECT_UPDATED',
            detail: detail || 'Project details updated',
            actorName: ctx.user.name ?? 'ARKO',
          },
        }),
      ])
      return project
    }),

  addUpdate: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(z.object({ projectId: z.string(), content: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await manageableProject(ctx, input.projectId)
      const project = await ctx.prisma.clientProject.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { clientId: true, name: true },
      })
      const [update] = await ctx.prisma.$transaction([
        ctx.prisma.clientUpdate.create({ data: { ...input, authorId: ctx.user.id! } }),
        ctx.prisma.projectActivity.create({
          data: {
            projectId: input.projectId,
            action: 'UPDATE_PUBLISHED',
            detail: input.content,
            actorName: ctx.user.name ?? 'ARKO',
          },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: project.clientId,
            notifType: 'PROJECT_UPDATE',
            title: `New update for ${project.name}`,
            message: input.content,
            link: '/dashboard/client-portal',
          },
        }),
      ])
      return update
    }),

  addMilestone: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().max(1000).optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await manageableProject(ctx, input.projectId)
      return ctx.prisma.projectMilestone.create({ data: input })
    }),

  setMilestoneCompleted: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const milestone = await ctx.prisma.projectMilestone.findUnique({
        where: { id: input.id },
        include: { project: { select: { id: true, clientId: true, name: true } } },
      })
      if (!milestone) throw new TRPCError({ code: 'NOT_FOUND' })
      await manageableProject(ctx, milestone.projectId)
      await ctx.prisma.projectMilestone.update({
        where: { id: input.id },
        data: { completed: input.completed },
      })
      const [total, completed] = await Promise.all([
        ctx.prisma.projectMilestone.count({ where: { projectId: milestone.projectId } }),
        ctx.prisma.projectMilestone.count({ where: { projectId: milestone.projectId, completed: true } }),
      ])
      const progress = total ? Math.round((completed / total) * 100) : 0
      await ctx.prisma.$transaction([
        ctx.prisma.clientProject.update({
          where: { id: milestone.projectId },
          data: { progress, ...(progress === 100 ? { status: 'COMPLETED' } : {}) },
        }),
        ctx.prisma.projectActivity.create({
          data: {
            projectId: milestone.projectId,
            action: input.completed ? 'MILESTONE_COMPLETED' : 'MILESTONE_REOPENED',
            detail: milestone.title,
            actorName: ctx.user.name ?? 'ARKO',
          },
        }),
        ...(input.completed
          ? [ctx.prisma.notification.create({
              data: {
                userId: milestone.project.clientId,
                notifType: 'MILESTONE_COMPLETED',
                title: `Milestone completed: ${milestone.title}`,
                message: milestone.project.name,
                link: '/dashboard/client-portal',
              },
            })]
          : []),
      ])
      return { progress }
    }),

  addDeliverable: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().max(1000).optional(),
        url: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await manageableProject(ctx, input.projectId)
      const [deliverable] = await ctx.prisma.$transaction([
        ctx.prisma.projectDeliverable.create({ data: input }),
        ctx.prisma.projectActivity.create({
          data: {
            projectId: input.projectId,
            action: 'DELIVERABLE_SHARED',
            detail: input.title,
            actorName: ctx.user.name ?? 'ARKO',
          },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: project.clientId,
            notifType: 'DELIVERABLE_READY',
            title: `Ready for review: ${input.title}`,
            link: '/dashboard/client-portal',
          },
        }),
      ])
      return deliverable
    }),

  reviewDeliverable: protectedProcedure
    .use(requireRole(['CLIENT']))
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(['APPROVED', 'REVISION_REQUESTED']),
        feedback: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.prisma.projectDeliverable.findFirst({
        where: { id: input.id, project: { clientId: ctx.user.id! } },
        include: { project: { select: { id: true, name: true, ownerId: true } } },
      })
      if (!deliverable) throw new TRPCError({ code: 'FORBIDDEN' })
      const [updated] = await ctx.prisma.$transaction([
        ctx.prisma.projectDeliverable.update({
          where: { id: input.id },
          data: { status: input.decision, feedback: input.feedback },
        }),
        ctx.prisma.projectActivity.create({
          data: {
            projectId: deliverable.projectId,
            action: input.decision,
            detail: input.feedback || deliverable.title,
            actorName: ctx.user.name ?? 'Client',
          },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: deliverable.project.ownerId,
            notifType: 'DELIVERABLE_REVIEW',
            title: `${deliverable.title}: ${input.decision.replace('_', ' ')}`,
            message: input.feedback,
            link: '/dashboard/client-portal',
          },
        }),
      ])
      return updated
    }),

  createRequest: protectedProcedure
    .use(requireRole(['CLIENT']))
    .input(
      z.object({
        projectId: z.string().optional(),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(3000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let project: { id: string; ownerId: string } | null = null
      if (input.projectId) {
        project = await ctx.prisma.clientProject.findFirst({
          where: { id: input.projectId, clientId: ctx.user.id! },
          select: { id: true, ownerId: true },
        })
        if (!project) throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const request = await ctx.prisma.clientRequest.create({
        data: { ...input, clientId: ctx.user.id! },
      })
      const admins = await ctx.prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      })
      const recipients = new Set(admins.map((admin: { id: string }) => admin.id))
      if (project) recipients.add(project.ownerId)
      if (recipients.size > 0) {
        await ctx.prisma.notification.createMany({
          data: [...recipients].map((userId) => ({
            userId,
            notifType: 'CLIENT_REQUEST',
            title: `New client request: ${input.title}`,
            message: input.description,
            link: '/dashboard/client-portal',
          })),
        })
      }
      if (project) {
        await ctx.prisma.projectActivity.create({
          data: {
            projectId: project.id,
            action: 'CLIENT_REQUEST_CREATED',
            detail: input.title,
            actorName: ctx.user.name ?? 'Client',
          },
        })
      }
      return request
    }),

  updateRequest: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(z.object({ id: z.string(), status: requestStatus }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.clientRequest.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true } } },
      })
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })
      const operations = [
        ctx.prisma.clientRequest.update({
          where: { id: input.id },
          data: { status: input.status },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: request.clientId,
            notifType: 'CLIENT_REQUEST_STATUS',
            title: `Request status: ${input.status.replace('_', ' ')}`,
            message: request.title,
            link: '/dashboard/client-portal',
          },
        }),
        ...(request.projectId
          ? [ctx.prisma.projectActivity.create({
              data: {
                projectId: request.projectId,
                action: 'REQUEST_STATUS_CHANGED',
                detail: `${request.title}: ${input.status.replace('_', ' ')}`,
                actorName: ctx.user.name ?? 'ARKO',
              },
            })]
          : []),
      ]
      const [updated] = await ctx.prisma.$transaction(operations)
      return updated
    }),

  convertRequestToTask: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.clientRequest.findUnique({ where: { id: input.id } })
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })
      if (request.taskId) throw new TRPCError({ code: 'CONFLICT', message: 'Request already has a task' })
      const [task] = await ctx.prisma.$transaction([
        ctx.prisma.task.create({
          data: {
            title: request.title,
            description: request.description,
            assigneeId: ctx.user.id!,
            priority: 'MEDIUM',
          },
        }),
      ])
      await ctx.prisma.clientRequest.update({
        where: { id: request.id },
        data: { taskId: task.id, status: 'IN_PROGRESS' },
      })
      if (request.projectId) {
        await ctx.prisma.projectActivity.create({
          data: {
            projectId: request.projectId,
            action: 'REQUEST_CONVERTED_TO_TASK',
            detail: request.title,
            actorName: ctx.user.name ?? 'ARKO',
          },
        })
      }
      return task
    }),
})
