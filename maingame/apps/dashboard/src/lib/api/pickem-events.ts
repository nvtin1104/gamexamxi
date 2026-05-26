import type { ApiResponse, PaginatedResponse, PickemEvent, PickemEventOptionWithItem, CreatePickemEventFormData, UpdatePickemEventFormData } from '@gamexamxi/shared'
import { api } from '../api-client'

export interface ListPickemEventsParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'title' | 'eventDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: ListPickemEventsParams): string {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.search) q.set('search', params.search)
  if (params.sortBy) q.set('sortBy', params.sortBy)
  if (params.sortOrder) q.set('sortOrder', params.sortOrder)
  const str = q.toString()
  return str ? `?${str}` : ''
}

export function listPickemEvents(params: ListPickemEventsParams = {}) {
  return api.get<PaginatedResponse<PickemEvent>>(`/pickem-events${buildQuery(params)}`)
}

export function getPickemEvent(id: string) {
  return api.get<ApiResponse<PickemEvent>>(`/pickem-events/${id}`)
}

export function getPickemEventDetail(id: string) {
  return api.get<ApiResponse<PickemEvent & { options: PickemEventOptionWithItem[] }>>(`/pickem-events/${id}/detail`)
}

export function getPickemEventOptions(eventId: string) {
  return api.get<ApiResponse<PickemEventOptionWithItem[]>>(`/pickem-events/${eventId}/options`)
}

export function createPickemEvent(data: CreatePickemEventFormData) {
  return api.post<ApiResponse<PickemEvent>>('/pickem-events', data)
}

export function updatePickemEvent(id: string, data: UpdatePickemEventFormData) {
  return api.patch<ApiResponse<PickemEvent>>(`/pickem-events/${id}`, data)
}

export function deletePickemEvent(id: string) {
  return api.delete<{ success: boolean }>(`/pickem-events/${id}`)
}

export interface CreatePickemEventOptionData {
  eventItemId: string
  isWinningOption: boolean
}

export function addPickemEventOption(eventId: string, data: CreatePickemEventOptionData) {
  return api.post<ApiResponse<PickemEventOptionWithItem>>(`/pickem-events/${eventId}/options`, data)
}

export function updatePickemEventOption(optionId: string, data: { isWinningOption: boolean }) {
  return api.patch<ApiResponse<PickemEventOptionWithItem>>(`/pickem-events/options/${optionId}`, data)
}

export function deletePickemEventOption(optionId: string) {
  return api.delete<{ success: boolean }>(`/pickem-events/options/${optionId}`)
}
