import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const notesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const note = await ctx.prisma.note.findUnique({ where: { id: input.id } })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })
      if (note.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your note' })

      return note
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string().default(''),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      return ctx.prisma.note.create({
        data: {
          title: input.title,
          content: input.content,
          userId,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const note = await ctx.prisma.note.findUnique({ where: { id: input.id } })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })
      if (note.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your note' })

      return ctx.prisma.note.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const note = await ctx.prisma.note.findUnique({ where: { id: input.id } })
      if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' })
      if (note.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your note' })

      return ctx.prisma.note.delete({ where: { id: input.id } })
    }),
})
