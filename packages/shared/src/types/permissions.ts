/** A named group with an array of permission strings */
export interface PermissionGroup {
  id: string
  name: string
  permissions: string[]
  createdAt: string
}

/** Resolved permissions for a user */
export interface UserPermissions {
  userId: string
  permissions: string[]
}
