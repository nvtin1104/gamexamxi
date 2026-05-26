import type { ApiResponse, PermissionGroup } from '@gamexamxi/shared'
import { api } from '../api-client'

export function listGroups() {
  return api.get<ApiResponse<PermissionGroup[]>>('/permissions/groups')
}

export function createGroup(data: { name: string; permissions: string[] }) {
  return api.post<ApiResponse<PermissionGroup>>('/permissions/groups', data)
}

export function updateGroup(id: string, permissions: string[]) {
  return api.patch<ApiResponse<PermissionGroup>>(`/permissions/groups/${id}`, { permissions })
}

export function deleteGroup(id: string) {
  return api.delete<{ success: boolean }>(`/permissions/groups/${id}`)
}

export function assignUserToGroup(groupId: string, userId: string) {
  return api.post<{ success: boolean }>(`/permissions/groups/${groupId}/users`, { userId })
}

export function removeUserFromGroup(groupId: string, userId: string) {
  return api.delete<{ success: boolean }>(`/permissions/groups/${groupId}/users/${userId}`)
}

export function getUserPermissions(userId: string) {
  return api.get<ApiResponse<{ userId: string; permissions: string[] }>>(`/permissions/users/${userId}`)
}
