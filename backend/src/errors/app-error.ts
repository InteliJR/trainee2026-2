import type { ErrorCode } from '../contracts/common.js'

export type AppErrorOptions = {
  code: ErrorCode
  message: string
  statusCode: number
  details?: Record<string, unknown>
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly details: Record<string, unknown>

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details ?? {}
  }
}
