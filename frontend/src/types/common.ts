// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_SCHEDULE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'COLLECTION_NOT_CANCELLABLE'
  | 'COLLECTION_NOT_COMPLETABLE'
  | 'NO_ACTIVE_ASSIGNMENT'
  | 'ECOROTA_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export type ErrorResponse = {
  code: ErrorCode
  message: string
  details: Record<string, unknown>
  requestId: string
}

export type DataResponse<T> = {
  data: T
}

export type PaginatedResponse<T> = {
  data: T[]
  nextCursor: string | null
}
