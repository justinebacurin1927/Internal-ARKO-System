import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const messagesRouter = router({
  /**
   * Total unread messages across all of the caller's conversations — for the
   * sidebar "Messages (n)" badge. Unread = sent by someone else after the
   * participant's lastReadAt (or ever, if never read).
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    const parts = await ctx.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    })
    if (parts.length === 0) return 0

    const conditions = parts.map((p) => ({
      conversationId: p.conversationId,
      senderId: { not: userId },
      ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
    }))

    return ctx.prisma.message.count({ where: { OR: conditions } })
  }),

  /**
   * Suggest people to message: active team members the current user does not
   * already have a conversation with, most recently active first.
   */
  suggestions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!

    const convos = await ctx.prisma.conversation.findMany({
      where: {
        name: null,
        participants: { some: { userId } },
      },
      select: { participants: { select: { userId: true } } },
    })
    const known = new Set<string>([userId])
    for (const c of convos) for (const p of c.participants) known.add(p.userId)

    return ctx.prisma.user.findMany({
      where: { id: { notIn: [...known] }, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        avatar: true,
        title: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: { sort: 'desc', nulls: 'last' } },
      take: 6,
    })
  }),

  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                avatar: true,
                lastActiveAt: true,
              },
            },
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
          conversationId_userId: {
            conversationId: input.conversationId,
            userId,
          },
        },
      })
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a participant in this conversation',
        })
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
          conversationId_userId: {
            conversationId: input.conversationId,
            userId,
          },
        },
      })
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a participant in this conversation',
        })
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

  /** Mark a conversation as read up to now for the current participant (polling-friendly). */
  markRead: protectedProcedure.input(z.object({ conversationId: z.string() })).mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id!
    const participant = await ctx.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId,
        },
      },
    })
    if (!participant) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a participant in this conversation',
      })
    }
    return ctx.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    })
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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot start a conversation with yourself',
        })
      }

      const include = {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                avatar: true,
                lastActiveAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      }

      // Idempotency key: the two ids sorted so a pair maps to exactly one DM.
      const dmKey = [userId, input.participantId].sort().join(':')

      // Return an existing DM if there already is one (covers legacy rows too).
      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: input.participantId } } },
            // exactly these two participants — a 1:1 conversation
            {
              participants: {
                none: { userId: { notIn: [userId, input.participantId] } },
              },
            },
          ],
        },
        include,
      })
      if (existing) {
        if (!existing.dmKey) {
          await ctx.prisma.conversation.update({ where: { id: existing.id }, data: { dmKey } }).catch(() => {})
        }
        return existing
      }

      // Verify the other user exists
      const otherUser = await ctx.prisma.user.findUnique({
        where: { id: input.participantId },
      })
      if (!otherUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      try {
        return await ctx.prisma.conversation.create({
          data: {
            dmKey,
            participants: {
              createMany: {
                data: [{ userId }, { userId: input.participantId }],
              },
            },
          },
          include,
        })
      } catch (err) {
        // Two requests raced: the unique dmKey rejected the second create.
        if ((err as { code?: string })?.code === 'P2002') {
          const conv = await ctx.prisma.conversation.findUnique({
            where: { dmKey },
            include,
          })
          if (conv) return conv
        }
        throw err
      }
    }),

  createGroupConversation: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        participantIds: z.array(z.string()).min(2).max(49),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const participantIds = [...new Set(input.participantIds)].filter((id) => id !== userId)

      if (participantIds.length < 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Select at least two other people for a group chat',
        })
      }

      const memberCount = await ctx.prisma.user.count({
        where: { id: { in: participantIds }, status: 'ACTIVE' },
      })
      if (memberCount !== participantIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more selected users are unavailable',
        })
      }

      return ctx.prisma.conversation.create({
        data: {
          name: input.name,
          participants: {
            createMany: {
              data: [userId, ...participantIds].map((memberId) => ({ userId: memberId })),
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  avatar: true,
                  lastActiveAt: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      })
    }),

  deleteConversation: protectedProcedure.input(z.object({ conversationId: z.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.userRole !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only an administrator can permanently delete a conversation',
      })
    }

    // Cascades to participants + messages (onDelete: Cascade).
    await ctx.prisma.conversation.delete({
      where: { id: input.conversationId },
    })
    return { success: true }
  }),
})
