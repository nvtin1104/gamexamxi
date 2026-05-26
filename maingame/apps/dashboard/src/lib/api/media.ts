import type { PaginatedResponse, Media, MediaUploadInput, MediaListQuery } from '@gamexamxi/shared'
import { api } from '../api-client'

function buildQuery(params: MediaListQuery): string {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  const str = q.toString()
  return str ? `?${str}` : ''
}

export function listMedia(params: MediaListQuery = { page: 1, pageSize: 20 }) {
  return api.get<PaginatedResponse<Media>>(`/media${buildQuery(params)}`)
}

export function getMedia(id: string) {
  return api.get<Media>(`/media/${id}`)
}

export interface UploadMediaOptions {
  file: File
  alt?: string
}

export async function uploadMedia(options: UploadMediaOptions) {
  const formData = new FormData()
  formData.append('file', options.file)
  if (options.alt) {
    formData.append('alt', options.alt)
  }

  return api.postFormData<Media>('/media/upload', formData)
}

export function updateMedia(id: string, data: MediaUploadInput) {
  return api.patch<Media>(`/media/${id}`, data)
}

export function deleteMedia(id: string) {
  return api.delete<{ success: boolean }>(`/media/${id}`)
}
