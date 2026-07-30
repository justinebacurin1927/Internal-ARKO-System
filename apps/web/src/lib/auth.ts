import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma, type Role } from '@arko/db'
import { compare } from 'bcryptjs'
import { authLimiter, authIpLimiter, loginLockout, requestKey } from './rate-limit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Normalize so a capitalized (mobile auto-cap) or space-padded email
        // still matches the stored address.
        const email = (credentials.email as string).trim().toLowerCase()

        // Per-IP throttle: blocks password spraying across many accounts from one source.
        const ipKey = request instanceof Request ? requestKey(request) : 'unknown'
        if (!authIpLimiter.check(ipKey).success) return null

        // Account lockout: if this email has too many recent failures, block without
        // consuming (peek). Generic failure — no distinction from a bad password.
        if (!loginLockout.peek(email).success) return null

        // Rate limit: 10 login attempts per minute per email
        if (!authLimiter.check(email).success) return null

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user || !user.password) {
          loginLockout.check(email) // record failure toward lockout
          return null
        }

        // Block restricted / suspended users
        if (user.status !== 'ACTIVE') return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) {
          loginLockout.check(email) // record failure toward lockout
          return null
        }

        // Successful login — clear the failure counter for this email.
        loginLockout.clear(email)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // absolute session lifetime: 8 hours
    updateAge: 60 * 30, // re-issue the JWT (and re-check status/role) every 30 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      // Reload status + role from DB on every token refresh. This is where an
      // already-issued session gets revoked: if the user was suspended/restricted
      // (or deleted) after login, returning null invalidates their session on the
      // next request instead of letting it live until natural expiry.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true },
        })
        if (!dbUser || dbUser.status !== 'ACTIVE') return null
        token.role = dbUser.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
})
