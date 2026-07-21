import type { Role } from '@arko/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: Role
    }
  }

  interface JWT {
    id?: string
    role?: Role
  }
}
