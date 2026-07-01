import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const messagesRouter = router({
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      // Verify user is a participant
      const participant = await ctx.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId: input.conversationId, userId },
        },
      })
      if (!participant) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant in this conversation' })
      }

      const messages = await ctx.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      })

      let nextCursor: string | undefined
      if (messages.length > input.limit) {
        const next = messages.pop()
        nextCursor = next!.id
      }

      return { messages: messages.reverse(), nextCursor }
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      // Verify user is a participant
      const participant = await ctx.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId: input.conversationId, userId },
        },
      })
      if (!participant) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant in this conversation' })
      }

      const [message] = await ctx.prisma.$transaction([
        ctx.prisma.message.create({
          data: {
            content: input.content,
            conversationId: input.conversationId,
            senderId: userId,
          },
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
        }),
        ctx.prisma.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        }),
      ])

      return message
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        participantId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      if (input.participantId === userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot start a conversation with yourself' })
      }

      // Check if a DM conversation already exists between these two users
      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: input.participantId } } },
          ],
          // Only match 1-on-1 conversations (exactly 2 participants)
          ...({ participants: { none: { userId: { notIn: [userId, input.participantId] } } } } as any),
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
      })

      if (existing) return existing

      // Verify the other user exists
      const otherUser = await ctx.prisma.user.findUnique({
        where: { id: input.participantId },
      })
      if (!otherUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      const conversation = await ctx.prisma.conversation.create({
        data: {
          participants: {
            createMany: {
              data: [{ userId }, { userId: input.participantId }],
            },
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
      })

      return conversation
    }),
})
