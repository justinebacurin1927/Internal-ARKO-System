import { auth } from "@/auth";
import type { Role } from "@prisma/client";

/** Returns the current session or null. */
export async function getSession() {
  return auth();
}

/** Throws if not authenticated. Returns the session user. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}

/** Throws unless the current user has the given role. */
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) throw new Error("FORBIDDEN");
  return user;
}

/** True if the user may edit content they don't own (admins can). */
export function canManage(user: { role: Role }) {
  return user.role === "ADMIN";
}

/** True if the user owns the resource or is an admin. */
export function canEdit(
  user: { id: string; role: Role },
  ownerId: string,
) {
  return user.role === "ADMIN" || user.id === ownerId;
}
