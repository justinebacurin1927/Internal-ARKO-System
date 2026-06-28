import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe config: no Prisma, no bcrypt. Shared by the middleware instance and
// the full Node instance in auth.ts. The Credentials provider (which needs
// Prisma + bcrypt) is added only in auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
