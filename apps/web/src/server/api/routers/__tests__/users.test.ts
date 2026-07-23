import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { usersRouter } from '../users'

// Mock bcryptjs so we don't do real hashing in tests
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}))

import { hash, compare } from 'bcryptjs'

// Track the in-memory user store for tests that need ordering/email uniqueness
interface MockUser {
  id: string
  name: string
  email: string
  password: string | null
  role: string
  status: string
  phone: string | null
  title: string | null
  image: string | null
  avatar: unknown
}

const defaultUser: MockUser = {
  id: 'u1', name: 'Alice', email: 'alice@test.com', password: '$2a$12$hashed',
  role: 'USER', status: 'ACTIVE', phone: null, title: null, image: null, avatar: null,
}

const ctx = (over: any = {}) => {
  // In-memory store for users, keyed by id and by email
  const usersById: Record<string, MockUser> = { ...over._existingUsers }
  if (!usersById['u1']) usersById['u1'] = { ...defaultUser }

  // Track transaction counts per user
  const txCounts: Record<string, number> = over._transactionCounts ?? {}

  const prisma = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.id) return Promise.resolve(usersById[where.id] ?? null)
        if (where.email) {
          const user = Object.values(usersById).find((u: any) => u.email === where.email)
          return Promise.resolve(user ?? null)
        }
        return Promise.resolve(null)
      }),
      findMany: jest.fn().mockImplementation(({ where, select }: any) => {
        let results = Object.values(usersById)
        if (where?.id?.not) {
          results = results.filter((u: any) => u.id !== where.id.not)
        }
        if (where?.OR) {
          // Simple contains search
          const q = (where.OR as any[]).find((c: any) => c.name?.contains)?.name?.contains ?? ''
          if (q) results = results.filter((u: any) => (u.name ?? '').toLowerCase().includes(q.toLowerCase()))
        }
        return Promise.resolve(results as any[])
      }),
      count: jest.fn().mockImplementation(({ where }: any) => {
        // For checking if email exists
        if (where?.email) return Promise.resolve(Object.values(usersById).some((u: any) => u.email === where.email) ? 1 : 0)
        return Promise.resolve(0)
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const newUser: MockUser = {
          id: 'u-new', name: data.name, email: data.email,
          password: data.password, role: data.role ?? 'MEMBER', status: 'ACTIVE',
          phone: data.phone ?? null, title: data.title ?? null,
          image: data.image ?? null, avatar: data.avatar ?? null,
        }
        usersById[newUser.id] = newUser
        return Promise.resolve(newUser)
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const existing = usersById[where.id]
        if (!existing) return Promise.resolve(null)
        const updated = { ...existing, ...data } as MockUser
        usersById[where.id] = updated
        return Promise.resolve(updated)
      }),
      delete: jest.fn().mockImplementation(({ where }: any) => {
        const user = usersById[where.id]
        if (!user) return Promise.resolve(null)
        delete usersById[where.id]
        return Promise.resolve(user)
      }),
      ...(over.user ?? {}),
    },
    transaction: {
      count: jest.fn().mockImplementation(({ where }: any) => {
        return Promise.resolve(txCounts[where?.userId] ?? 0)
      }),
    },
  }
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: over.userRole ?? 'USER',
    prisma,
  } as any
}

describe('updateProfile', () => {
  it('updates own name and phone (self-service)', async () => {
    const c = ctx()
    const caller = usersRouter.createCaller(c)
    const res = await caller.updateProfile({ name: 'Alice Updated', phone: '+1-555-0100' })
    expect(res.name).toBe('Alice Updated')
    expect(c.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ name: 'Alice Updated', phone: '+1-555-0100' }),
      }),
    )
  })

  it('updates own avatar', async () => {
    const c = ctx()
    const caller = usersRouter.createCaller(c)
    const avatar = { body: 'Tee', head: 'ShortOne', face: 'Smile', skinColor: '#D08B5B' }
    const res = await caller.updateProfile({ avatar })
    expect(res.avatar).toEqual(avatar)
    expect(c.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ avatar }),
      }),
    )
  })

  it('allows admin to update another user', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'u2': { id: 'u2' } } })
    const caller = usersRouter.createCaller(c)
    const res = await caller.updateProfile({ userId: 'u2', name: 'Bob Edited' })
    expect(res.name).toBe('Bob Edited')
    expect(c.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u2' } }),
    )
  })

  it('rejects non-admin editing another user', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateProfile({ userId: 'u2', name: 'Hacker' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when target user does not exist', async () => {
    const c = ctx({ userId: 'u1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateProfile({ userId: 'nonexistent', name: 'Ghost' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('changes password when current password is correct', async () => {
    jest.mocked(compare).mockResolvedValue(true as never)
    const c = ctx()
    const caller = usersRouter.createCaller(c)
    const res = await caller.changePassword({ currentPassword: 'correct-old', newPassword: 'new-password-ok' })
    expect(res).toEqual({ success: true })
    expect(compare).toHaveBeenCalledWith('correct-old', '$2a$12$hashed')
    expect(hash).toHaveBeenCalledWith('new-password-ok', 12)
  })

  it('rejects wrong current password', async () => {
    jest.mocked(compare).mockResolvedValue(false as never)
    const c = ctx()
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.changePassword({ currentPassword: 'wrong-old', newPassword: 'new-password-ok' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: /Current password is incorrect/i })
  })

  it('rejects short new password', async () => {
    const c = ctx()
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.changePassword({ currentPassword: 'old', newPassword: 'short' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rejects change for account without a password (OAuth)', async () => {
    jest.mocked(compare).mockResolvedValue(false as never)
    const c = ctx({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', password: null }),
      },
    })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.changePassword({ currentPassword: 'anything', newPassword: 'new-password-ok' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: /OAuth/i })
  })

  it('returns NOT_FOUND when user record is missing', async () => {
    jest.mocked(compare).mockResolvedValue(false as never)
    const c = ctx({ userId: 'ghost' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.changePassword({ currentPassword: 'x', newPassword: 'new-password-ok' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('create', () => {
  it('creates a user with auto-generated email and password, returns password', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    const res = await caller.create({ name: 'Test User', role: 'MEMBER' })
    expect(res.email).toMatch(/^test\.user@arko\.app$/)
    expect(res.generatedPassword).toBeTruthy()
    expect(typeof res.generatedPassword).toBe('string')
    expect(res.generatedPassword!.length).toBeGreaterThanOrEqual(14)
    expect(hash).toHaveBeenCalled()
  })

  it('creates a user with provided email and password', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    const res = await caller.create({
      name: 'Specific User',
      email: 'specific@example.com',
      password: 'provided-password-123',
      role: 'USER',
    })
    expect(res.email).toBe('specific@example.com')
  })

  it('rejects duplicate email', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'existing-1': { id: 'existing-1', email: 'alice@test.com' } as any } })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.create({ name: 'Alice Clone', email: 'alice@test.com' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('stores avatar on user after creation', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    const res = await caller.create({ name: 'Avatar User' })
    // The create procedure calls user.update after create to set avatar
    expect(c.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: res.id },
        data: expect.objectContaining({ avatar: expect.any(Object) }),
      }),
    )
  })

  it('rejects non-admin users', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.create({ name: 'Hacker' }),
    ).rejects.toThrow()
  })
})

describe('updateRole', () => {
  it('updates another user role (admin)', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'u2': { id: 'u2', name: 'Bob', role: 'USER' } as any } })
    const caller = usersRouter.createCaller(c)
    const res = await caller.updateRole({ userId: 'u2', role: 'MEMBER' })
    expect(res.role).toBe('MEMBER')
  })

  it('prevents self-demotion from ADMIN', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'admin-1': { id: 'admin-1', name: 'Admin', role: 'ADMIN' } as any } })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateRole({ userId: 'admin-1', role: 'USER' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects non-admin caller', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateRole({ userId: 'u2', role: 'ADMIN' }),
    ).rejects.toThrow()
  })

  it('returns NOT_FOUND for non-existent user', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateRole({ userId: 'ghost', role: 'MEMBER' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('updateStatus', () => {
  it('updates another user status (admin)', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'u2': { id: 'u2', name: 'Bob', status: 'ACTIVE' } as any } })
    const caller = usersRouter.createCaller(c)
    const res = await caller.updateStatus({ userId: 'u2', status: 'RESTRICTED' })
    expect(res.status).toBe('RESTRICTED')
  })

  it('prevents self-suspension', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'admin-1': { id: 'admin-1', status: 'ACTIVE' } as any } })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateStatus({ userId: 'admin-1', status: 'SUSPENDED' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects non-admin caller', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.updateStatus({ userId: 'u2', status: 'SUSPENDED' }),
    ).rejects.toThrow()
  })
})

describe('delete', () => {
  it('deletes a user with no transactions (admin)', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'u2': { id: 'u2', email: 'bob@test.com' } as any } })
    const caller = usersRouter.createCaller(c)
    const res = await caller.delete({ userId: 'u2' })
    expect(res).toEqual({ success: true })
    expect(c.prisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u2' } }),
    )
  })

  it('prevents self-deletion', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.delete({ userId: 'admin-1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('blocks deletion when user has transactions', async () => {
    const c = ctx({
      userId: 'admin-1', userRole: 'ADMIN',
      _existingUsers: { 'u2': { id: 'u2', email: 'bob@test.com' } as any },
      _transactionCounts: { u2: 3 },
    })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.delete({ userId: 'u2' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: /transaction/ })
    // Verify user was not deleted
    expect(c.prisma.user.delete).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND for non-existent user', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.delete({ userId: 'ghost' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects non-admin caller', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.delete({ userId: 'u2' }),
    ).rejects.toThrow()
  })
})

describe('resetPassword', () => {
  it('generates a new password and returns it', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN', _existingUsers: { 'u2': { id: 'u2', email: 'bob@test.com' } as any } })
    const caller = usersRouter.createCaller(c)
    const res = await caller.resetPassword({ userId: 'u2' })
    expect(res.email).toBe('bob@test.com')
    expect(res.generatedPassword).toBeTruthy()
    expect(typeof res.generatedPassword).toBe('string')
    expect(res.generatedPassword!.length).toBeGreaterThanOrEqual(14)
    // Should hash the new password
    expect(hash).toHaveBeenCalled()
    expect(c.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({ password: expect.any(String) }),
      }),
    )
  })

  it('returns NOT_FOUND for non-existent user', async () => {
    const c = ctx({ userId: 'admin-1', userRole: 'ADMIN' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.resetPassword({ userId: 'ghost' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects non-admin caller', async () => {
    const c = ctx({ userId: 'u1', userRole: 'USER' })
    const caller = usersRouter.createCaller(c)
    await expect(
      caller.resetPassword({ userId: 'u2' }),
    ).rejects.toThrow()
  })
})

describe('search', () => {
  it('returns users excluding the current user', async () => {
    const c = ctx({ userId: 'admin-1', _existingUsers: {
      'u1': { id: 'u1', name: 'Alice' } as any,
      'u2': { id: 'u2', name: 'Bob' } as any,
    }})
    const caller = usersRouter.createCaller(c)
    const res = await caller.search()
    expect(res).toHaveLength(2)
  })
})
