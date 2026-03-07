import type { ApiResponse, PaginatedResponse, ItemEvent, CreateItemFormData, UpdateItemFormData, ItemEventType } from '@gamexamxi/shared'
import { api } from '../api-client'

export interface ListItemsParams {
  page?: number
  pageSize?: number
  search?: string
  type?: ItemEventType
  level?: number
  parentId?: string | null
  sortBy?: 'name' | 'createdAt' | 'level'
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: ListItemsParams): string {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.search) q.set('search', params.search)
  if (params.type) q.set('type', params.type)
  if (params.level !== undefined) q.set('level', String(params.level))
  if (params.parentId !== undefined) q.set('parentId', params.parentId ?? '')
  if (params.sortBy) q.set('sortBy', params.sortBy)
  if (params.sortOrder) q.set('sortOrder', params.sortOrder)
  const str = q.toString()
  return str ? `?${str}` : ''
}

export function listItems(params: ListItemsParams = {}) {
  return api.get<PaginatedResponse<ItemEvent>>(`/items${buildQuery(params)}`)
}

export function getItem(id: string) {
  return api.get<ApiResponse<ItemEvent>>(`/items/${id}`)
}

export function getItemDetail(id: string) {
  return api.get<ApiResponse<ItemEvent & { creator: { id: string; name: string; email: string } | null; parent: { id: string; name: string; logo: string; type: string } | null; children: { id: string; name: string; logo: string; type: string; level: number }[] }>>(`/items/${id}/detail`)
}

export function getItemChildren(id: string) {
  return api.get<ApiResponse<ItemEvent[]>>(`/items/${id}/children`)
}

export function createItem(data: CreateItemFormData) {
  return api.post<ApiResponse<ItemEvent>>('/items', data)
}

export function updateItem(id: string, data: UpdateItemFormData) {
  return api.patch<ApiResponse<ItemEvent>>(`/items/${id}`, data)
}

export function deleteItem(id: string) {
  return api.delete<{ success: boolean }>(`/items/${id}`)
}
