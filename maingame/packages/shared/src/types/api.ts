/** Standard success response */
export interface ApiResponse<T> {
  data: T
}

/** Standard error response */
export interface ApiError {
  error: string
  code?: string
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
