// ============================================================
// Permission Constants & Role-Permission Map
// ============================================================

export const PERMISSIONS = {
  // Events
  EVENTS_READ:    'events:read',
  EVENTS_CREATE:  'events:create',
  EVENTS_RESOLVE: 'events:resolve',  // resolve own events
  EVENTS_MANAGE:  'events:manage',   // edit any event
  EVENTS_DELETE:  'events:delete',

  // Groups
  GROUPS_READ:   'groups:read',
  GROUPS_CREATE: 'groups:create',
  GROUPS_MANAGE: 'groups:manage',    // moderate any group

  // Users
  USERS_READ:    'users:read',
  USERS_MANAGE:  'users:manage',     // edit other users' data
  USERS_SUSPEND: 'users:suspend',    // suspend / ban accounts

  // Shop
  SHOP_PURCHASE: 'shop:purchase',
  SHOP_MANAGE:   'shop:manage',      // add / edit shop items

  // Points
  POINTS_GRANT: 'points:grant',      // manually grant / deduct points

  // Quests
  QUESTS_CREATE: 'quests:create',
  QUESTS_MANAGE: 'quests:manage',    // manage any group quest

  // Uploads
  UPLOADS_MANAGE: 'uploads:manage',  // manage any upload (delete others' files, etc.)

  // Admin panel
  ADMIN_PANEL: 'admin:panel',        // access admin dashboard
  ADMIN_ROOT:  'admin:root',         // root-level operations (delete users, etc.)
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ─── Per-role permission lists ────────────────────────────────

const userPerms: Permission[] = [
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.EVENTS_CREATE,
  PERMISSIONS.EVENTS_RESOLVE,
  PERMISSIONS.GROUPS_READ,
  PERMISSIONS.GROUPS_CREATE,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.SHOP_PURCHASE,
  PERMISSIONS.QUESTS_CREATE,
]

const moderatorPerms: Permission[] = [
  ...userPerms,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.EVENTS_DELETE,
  PERMISSIONS.GROUPS_MANAGE,
  PERMISSIONS.USERS_SUSPEND,
  PERMISSIONS.QUESTS_MANAGE,
]

const adminPerms: Permission[] = [
  ...moderatorPerms,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.SHOP_MANAGE,
  PERMISSIONS.POINTS_GRANT,
  PERMISSIONS.UPLOADS_MANAGE,
  PERMISSIONS.ADMIN_PANEL,
]

const rootPerms: Permission[] = Object.values(PERMISSIONS) as Permission[]

// ─── Role → Permission Map ────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  user:      userPerms,
  moderator: moderatorPerms,
  admin:     adminPerms,
  root:      rootPerms,
}

export function getPermissionsForRole(role: string): Set<Permission> {
  return new Set(ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user)
}

// Merge role permissions with custom per-user permissions.
// Custom permissions are additive — they cannot revoke role permissions.
export function mergePermissions(role: string, customPermissions: string[] | null | undefined): Set<Permission> {
  const base = getPermissionsForRole(role)
  if (!customPermissions || customPermissions.length === 0) return base
  const allValues = new Set(Object.values(PERMISSIONS))
  const valid = customPermissions.filter(p => allValues.has(p as Permission)) as Permission[]
  return new Set([...base, ...valid])
}

export function hasPermission(role: string, permission: Permission): boolean {
  return getPermissionsForRole(role).has(permission)
}

// All valid permission values as an array (useful for validation)
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS) as Permission[]
