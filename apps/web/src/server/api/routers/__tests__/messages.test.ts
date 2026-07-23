import { describe, it, expect, jest } from '@jest/globals'
import { messagesRouter } from '../messages'

const ctx = (over: any = {}) => {
  const conversations: any[] = over._conversations ?? []
  const messages: any[] = over._messages ?? []
  const participants: any[] = over._participants ?? []

  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      conversation: {
        findMany: jest.fn().mockImplementation(({ where, include, orderBy }: any) => {
          let result = conversations.filter((c: any) => {
            const pIds = participants.filter((p: any) => p.conversationId === c.id).map((p: any) => p.userId)
            if (where?.participants?.some?.userId && !pIds.includes(where.participants.some.userId)) return false
            return true
          })
          if (orderBy?.updatedAt === 'desc') {
            result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          }
          return Promise.resolve(result.map((c: any) => ({
            ...c,
            participants: include?.participants
              ? participants.filter((p: any) => p.conversationId === c.id).map((p: any) => ({
                  ...p,
                  user: p.user ?? { id: p.userId, name: 'User', email: `${p.userId}@test.com`, image: null },
                }))
              : undefined,
            messages: include?.messages
              ? messages
                  .filter((m: any) => m.conversationId === c.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, include.messages.take ?? 1)
                  .map((m: any) => ({ ...m, sender: m.sender ?? { id: m.senderId, name: 'User' } }))
              : undefined,
          })))
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          // Handle the "find existing DM" query
          if (where?.AND) {
            const conditions = where.AND as any[]
            const userIdCond = conditions.find((c: any) => c.participants?.some?.userId)
            const otherUserIdCond = conditions.find((c: any) => c.participants?.some?.['userId'] ?? c.participants?.some?.userId)
            const noExtraCond = conditions.find((c: any) => c.participants?.none)
            const targetUserId = userIdCond?.participants?.some?.userId
            const otherUserId = otherUserIdCond?.participants?.some?.userId !== targetUserId
              ? otherUserIdCond?.participants?.some?.userId
              : undefined

            const match = conversations.find((c: any) => {
              const pIds = participants.filter((p: any) => p.conversationId === c.id).map((p: any) => p.userId)
              if (!pIds.includes(targetUserId) || !pIds.includes(otherUserId)) return false
              if (noExtraCond && pIds.length > 2) return false
              return true
            })
            if (!match) return Promise.resolve(null)
            return Promise.resolve({
              ...match,
              participants: participants.filter((p: any) => p.conversationId === match.id).map((p: any) => ({
                ...p,
                user: p.user ?? { id: p.userId, name: 'User', email: `${p.userId}@test.com`, image: null },
              })),
              messages: messages
                .filter((m: any) => m.conversationId === match.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 1)
                .map((m: any) => ({ ...m, sender: m.sender ?? { id: m.senderId, name: 'User' } })),
            })
          }
          return Promise.resolve(null)
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: `conv-${conversations.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() }
          conversations.push(row)
          // If data includes participants.createMany, add them
          if (data?.participants?.createMany?.data) {
            for (const p of data.participants.createMany.data) {
              participants.push({
                id: `p-${participants.length + 1}`,
                conversationId: row.id,
                userId: p.userId,
                lastReadAt: null,
                user: { id: p.userId, name: 'User', email: `${p.userId}@test.com`, image: null },
              })
            }
          }
          return Promise.resolve({
            ...row,
            participants: participants.filter((p: any) => p.conversationId === row.id),
            messages: [],
          })
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = conversations.findIndex((c: any) => c.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          conversations[idx] = { ...conversations[idx], ...data }
          return Promise.resolve(conversations[idx])
        }),
        ...(over.conversation ?? {}),
      },

      conversationParticipant: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.conversationId_userId) {
            const { conversationId, userId } = where.conversationId_userId
            const p = participants.find(
              (p: any) => p.conversationId === conversationId && p.userId === userId,
            ) ?? null
            return Promise.resolve(p)
          }
          return Promise.resolve(null)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const { conversationId, userId } = where.conversationId_userId
          const idx = participants.findIndex(
            (p: any) => p.conversationId === conversationId && p.userId === userId,
          )
          if (idx === -1) return Promise.resolve(null)
          participants[idx] = { ...participants[idx], ...data }
          return Promise.resolve(participants[idx])
        }),
        ...(over.conversationParticipant ?? {}),
      },

      message: {
        findMany: jest.fn().mockImplementation(({ where, orderBy, take, cursor, skip }: any) => {
          let result = messages.filter((m: any) => {
            if (where?.conversationId && m.conversationId !== where.conversationId) return false
            return true
          })
          if (orderBy?.createdAt === 'desc') {
            result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          }
          // Cursor-based pagination
          if (cursor?.id) {
            const cursorIdx = result.findIndex((m: any) => m.id === cursor.id)
            if (cursorIdx !== -1) {
              result = result.slice(cursorIdx + (skip ?? 0))
            }
          }
          if (take) result = result.slice(0, take)
          return Promise.resolve(result.map((m: any) => ({
            ...m,
            sender: m.sender ?? { id: m.senderId, name: 'User', image: null },
          })))
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = {
            id: `msg-${messages.length + 1}`,
            ...data,
            createdAt: new Date(),
            sender: data.senderId
              ? { id: data.senderId, name: data.senderId === 'u1' ? 'Current User' : 'Other User', image: null }
              : { id: 'u1', name: 'Current User', image: null },
          }
          messages.push(row)
          return Promise.resolve(row)
        }),
        ...(over.message ?? {}),
      },

      $transaction: jest.fn().mockImplementation(async (txnArray: any[]) => {
        // Execute each operation in sequence
        const results = []
        for (const op of txnArray) {
          // op is a prisma call — the mock create/update return promises, just call the mock's implementation
          results.push(await op)
        }
        return results
      }),

      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const existingUsers: string[] = (over._existingUsers ?? ['u1', 'u2', 'u3'])
          if (existingUsers.includes(where.id)) {
            return Promise.resolve({ id: where.id, name: 'User', email: `${where.id}@test.com` })
          }
          return Promise.resolve(null)
        }),
        ...(over.user ?? {}),
      },
    },
  } as any
}

describe('messages router', () => {
  describe('listConversations', () => {
    it('returns conversations where user is a participant', async () => {
      const c = ctx({
        _conversations: [
          { id: 'c1', updatedAt: new Date('2026-07-23') },
          { id: 'c2', updatedAt: new Date('2026-07-22') },
        ],
        _participants: [
          { id: 'p1', conversationId: 'c1', userId: 'u1' },
          { id: 'p2', conversationId: 'c1', userId: 'u2' },
          { id: 'p3', conversationId: 'c2', userId: 'u3' }, // u1 not in c2
        ],
        _messages: [
          { id: 'm1', conversationId: 'c1', content: 'Hey', senderId: 'u2', createdAt: new Date('2026-07-23T10:00:00Z') },
        ],
      })
      const res = await messagesRouter.createCaller(c).listConversations()
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe('c1')
      // Should include last message
      expect(res[0].messages).toHaveLength(1)
      expect(res[0].messages[0].content).toBe('Hey')
    })
  })

  describe('getMessages', () => {
    it('returns messages with cursor pagination', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u1' }],
        _messages: Array.from({ length: 3 }, (_, i) => ({
          id: `m${i}`,
          conversationId: 'c1',
          content: `Message ${i}`,
          senderId: 'u2',
          createdAt: new Date(2026, 6, 20 + i),
        })),
      })
      const res = await messagesRouter.createCaller(c).getMessages({
        conversationId: 'c1',
        limit: 2,
      })
      // Should return 2 messages + next cursor
      expect(res.messages).toHaveLength(2)
      expect(res.nextCursor).toBeDefined()
    })

    it('returns no nextCursor on last page', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u1' }],
        _messages: [
          { id: 'm1', conversationId: 'c1', content: 'Only', senderId: 'u2', createdAt: new Date() },
        ],
      })
      const res = await messagesRouter.createCaller(c).getMessages({
        conversationId: 'c1',
        limit: 50,
      })
      expect(res.messages).toHaveLength(1)
      expect(res.nextCursor).toBeUndefined()
    })

    it('rejects non-participant', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u2' }], // u1 not a participant
      })
      await expect(
        messagesRouter.createCaller(c).getMessages({ conversationId: 'c1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('sendMessage', () => {
    it('creates a message and updates conversation in a transaction', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u1' }],
        _conversations: [{ id: 'c1', updatedAt: new Date('2026-07-22') }],
      })
      const res = await messagesRouter.createCaller(c).sendMessage({
        conversationId: 'c1',
        content: 'Hello!',
      })
      expect(res.content).toBe('Hello!')
      // $transaction should have been called
      expect(c.prisma.$transaction).toHaveBeenCalled()
    })

    it('rejects non-participant', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u2' }],
      })
      await expect(
        messagesRouter.createCaller(c).sendMessage({ conversationId: 'c1', content: 'Hi' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('rejects empty content', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u1' }],
      })
      await expect(
        messagesRouter.createCaller(c).sendMessage({ conversationId: 'c1', content: '' }),
      ).rejects.toThrow()
    })
  })

  describe('markRead', () => {
    it('updates lastReadAt for a participant', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u1', lastReadAt: null }],
      })
      await messagesRouter.createCaller(c).markRead({ conversationId: 'c1' })
      expect(c.prisma.conversationParticipant.update).toHaveBeenCalled()
    })

    it('rejects non-participant', async () => {
      const c = ctx({
        _participants: [{ id: 'p1', conversationId: 'c1', userId: 'u2' }],
      })
      await expect(
        messagesRouter.createCaller(c).markRead({ conversationId: 'c1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('createConversation', () => {
    it('creates a new DM conversation', async () => {
      const c = ctx({
        _existingUsers: ['u1', 'u2', 'u3'],
      })
      const res = await messagesRouter.createCaller(c).createConversation({
        participantId: 'u2',
      })
      expect(res).toBeDefined()
      expect(c.prisma.conversation.create).toHaveBeenCalled()
    })

    it('rejects self-conversation', async () => {
      const c = ctx()
      await expect(
        messagesRouter.createCaller(c).createConversation({ participantId: 'u1' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects non-existent user', async () => {
      const c = ctx({ _existingUsers: ['u1'] })
      await expect(
        messagesRouter.createCaller(c).createConversation({ participantId: 'ghost' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })
})
