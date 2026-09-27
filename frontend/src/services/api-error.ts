import type { ErrorCode } from '../types/common'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'response'

export type ApiErrorOptions = {
  code: ErrorCode
  message: string
  requestId: string
  details?: Record<string, unknown>
  status?: number
  kind?: ApiErrorKind
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly requestId: string
  readonly details: Record<string, unknown>
  readonly status?: number
  readonly kind: ApiErrorKind

  constructor(options: ApiErrorOptions) {
    super(options.message)
    this.name = 'ApiError'
    this.code = options.code
    this.requestId = options.requestId
    this.details = options.details ?? {}
    this.status = options.status
    this.kind = options.kind ?? 'http'
  }
}
