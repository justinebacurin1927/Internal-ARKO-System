import type { Role } from '@arko/db'

/**
 * Granular permission strings.
 * Format: `<resource>:<action>`
 *
 * Resources: users, transactions, tasks, workflows, workspace
 * Actions: create, read, update, delete, manage, list
 */
export type Permission = string

/**
 * Map each Role to the set of permissions it grants.
 * ADMIN — everything
 * MEMBER — workspace-level read/write on shared resources
 * USER — self-only access to owned resources
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ['*'],
  MEMBER: [
    'transactions:create',
    'transactions:read',
    'transactions:update',
    'transactions:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'workflows:create',
    'workflows:read',
    'workflows:update',
    'workflows:execute',
    'users:read',
  ],
  USER: [
    'transactions:create',
    'transactions:read',
    'transactions:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'workflows:create',
    'workflows:read',
    'workflows:execute',
    'users:read',
  ],
}

/**
 * Check whether a role has a given permission.
 * ADMIN gets `*` which matches everything.
 */
export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes('*') || permissions.includes(permission)
}

/**
 * Check whether a role is at least one of the given roles.
 */
export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}

/**
 * Resolve effective role: ADMIN overrides everything, otherwise use the user's role.
 */
export function effectiveRole(role: Role): Role {
  return role
}
