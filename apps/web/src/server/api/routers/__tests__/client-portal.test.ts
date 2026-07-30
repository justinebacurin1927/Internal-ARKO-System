import { describe, expect, it, jest } from '@jest/globals'
import { clientPortalRouter } from '../client-portal'

function context(role: 'ADMIN' | 'USER' | 'CLIENT', userId = 'user-1') {
  return {
    user: { id: userId, name: 'Test User' },
    session: { user: { id: userId } },
    userRole: role,
    prisma: {
      clientProject: {
        findMany: jest.fn(async () => []),
      },
      projectDeliverable: {
        findFirst: jest.fn(async () => null),
      },
    },
  } as any
}

describe('client portal access control', () => {
  it('scopes client projects to the signed-in client', async () => {
    const ctx = context('CLIENT', 'client-1')

    await clientPortalRouter.createCaller(ctx).dashboard()

    expect(ctx.prisma.clientProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' } }),
    )
  })

  it('rejects regular users from the portal', async () => {
    await expect(clientPortalRouter.createCaller(context('USER')).dashboard())
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('prevents a client from reviewing another client deliverable', async () => {
    await expect(
      clientPortalRouter.createCaller(context('CLIENT')).reviewDeliverable({
        id: 'other-client-deliverable',
        decision: 'APPROVED',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
