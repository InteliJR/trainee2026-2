import { setTimeout as delay } from 'node:timers/promises'

import { z } from 'zod'

import { AppError } from '../errors/app-error.js'
import {
  ecorotaCollectorSchema,
  ecorotaEnvironmentSchema,
  ecorotaPointSchema,
  ecorotaRequestSchema,
  ecorotaSnapshotSchema,
  type EcoRotaGateway,
} from './ecorota.js'

export type EcoRotaFailureReason =
  | 'auth'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'upstream_error'
  | 'invalid_response'

/** EcoRota could not be reached or used; callers may retry later. */
export class EcoRotaUnavailableError extends AppError {
  constructor(readonly reason: EcoRotaFailureReason, details: Record<string, unknown> = {}) {
    super({
      code: 'ECOROTA_UNAVAILABLE',
      message: 'EcoRota is unavailable',
      statusCode: 503,
      details: { reason, ...details },
    })
    this.name = 'EcoRotaUnavailableError'
  }
}

/** EcoRota answered with a business error (4xx) such as 404 or 409. */
export class EcoRotaRejectedError extends AppError {
  constructor(
    readonly upstreamStatus: number,
    readonly upstreamCode: string | undefined,
    upstreamMessage: string | undefined,
  ) {
    super({
      code: 'ECOROTA_UNAVAILABLE',
      message: 'EcoRota rejected the operation',
      statusCode: 502,
      details: { upstreamStatus, upstreamCode, upstreamMessage },
    })
    this.name = 'EcoRotaRejectedError'
  }
}

type Logger = {
  warn(details: object, message: string): void
  error(details: object, message: string): void
}

export type EcoRotaClientOptions = {
  baseUrl: string
  token: string
  timeoutMs: number
  maxAttempts?: number
  /** Longest Retry-After the client waits for before giving up. */
  maxRetryAfterMs?: number
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<unknown>
  logger?: Logger
}

type RequestOptions<Schema extends z.ZodType> = {
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  schema: Schema
  body?: unknown
  /** Safe to resend after a timeout or 5xx (GET, PATCH and reference-keyed POST). */
  idempotent: boolean
}

const upstreamErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
})

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now())
}

function backoffMs(attempt: number): number {
  return 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100)
}

export class EcoRotaHttpClient implements EcoRotaGateway {
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeoutMs: number
  private readonly maxAttempts: number
  private readonly maxRetryAfterMs: number
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (ms: number) => Promise<unknown>
  private readonly logger: Logger | undefined

  constructor(options: EcoRotaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.token = options.token
    this.timeoutMs = options.timeoutMs
    this.maxAttempts = options.maxAttempts ?? 3
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? 10_000
    this.fetchImpl = options.fetch ?? fetch
    this.sleep = options.sleep ?? delay
    this.logger = options.logger
  }

  private async request<Schema extends z.ZodType>(
    options: RequestOptions<Schema>,
  ): Promise<z.infer<Schema>> {
    const url = `${this.baseUrl}${options.path}`
    const target = `${options.method} ${options.path}`
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${this.token}`,
    }
    if (options.body !== undefined) headers['content-type'] = 'application/json'

    for (let attempt = 1; ; attempt++) {
      const canRetry = attempt < this.maxAttempts
      let response: Response
      try {
        response = await this.fetchImpl(url, {
          method: options.method,
          headers,
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
          signal: AbortSignal.timeout(this.timeoutMs),
        })
      } catch (error) {
        const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network'
        if (options.idempotent && canRetry) {
          await this.sleep(backoffMs(attempt))
          continue
        }
        this.logger?.warn({ target, reason, attempt }, 'EcoRota request failed')
        throw new EcoRotaUnavailableError(reason)
      }

      if (response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const data = typeof body === 'object' && body !== null && 'data' in body ? body.data : undefined
        const parsed = options.schema.safeParse(data)
        if (!parsed.success) {
          this.logger?.error({ target, issues: parsed.error.issues }, 'Unexpected EcoRota response')
          throw new EcoRotaUnavailableError('invalid_response')
        }
        return parsed.data
      }

      // A 429 means the call was not processed, so every method may retry it.
      if (response.status === 429) {
        const wait = retryAfterMs(response)
        if (canRetry && (wait ?? 0) <= this.maxRetryAfterMs) {
          await this.sleep(wait ?? backoffMs(attempt))
          continue
        }
        this.logger?.warn({ target, attempt }, 'EcoRota rate limit reached')
        throw new EcoRotaUnavailableError(
          'rate_limited',
          wait === null ? {} : { retryAfterSeconds: Math.ceil(wait / 1000) },
        )
      }

      if (response.status === 401 || response.status === 403) {
        this.logger?.error({ target, status: response.status }, 'EcoRota credential rejected')
        throw new EcoRotaUnavailableError('auth')
      }

      if (response.status >= 500) {
        if (options.idempotent && canRetry) {
          await this.sleep(backoffMs(attempt))
          continue
        }
        this.logger?.warn({ target, status: response.status }, 'EcoRota server error')
        throw new EcoRotaUnavailableError('upstream_error', { upstreamStatus: response.status })
      }

      const body = upstreamErrorSchema.safeParse(await response.json().catch(() => null))
      throw new EcoRotaRejectedError(
        response.status,
        body.success ? body.data.code : undefined,
        body.success ? body.data.message : undefined,
      )
    }
  }

  getEnvironment() {
    return this.request({ method: 'GET', path: '/v1/environment', schema: ecorotaEnvironmentSchema, idempotent: true })
  }

  getSnapshot() {
    return this.request({ method: 'GET', path: '/v1/snapshot', schema: ecorotaSnapshotSchema, idempotent: true })
  }

  listPoints() {
    return this.request({ method: 'GET', path: '/v1/points', schema: z.array(ecorotaPointSchema), idempotent: true })
  }

  listCollectors() {
    return this.request({
      method: 'GET', path: '/v1/collectors', schema: z.array(ecorotaCollectorSchema), idempotent: true,
    })
  }

  // Not idempotent: a blind retry could take a second collector slot.
  createCollector(input: { name: string }) {
    return this.request({
      method: 'POST', path: '/v1/collectors', schema: ecorotaCollectorSchema, body: input, idempotent: false,
    })
  }

  updateCollector(id: string, input: { name?: string; available?: boolean }) {
    return this.request({
      method: 'PATCH',
      path: `/v1/collectors/${encodeURIComponent(id)}`,
      schema: ecorotaCollectorSchema,
      body: input,
      idempotent: true,
    })
  }

  // EcoRota returns the existing request for a repeated point and reference.
  createRequest(input: { pointId: string; externalReference: string }) {
    return this.request({
      method: 'POST', path: '/v1/requests', schema: ecorotaRequestSchema, body: input, idempotent: true,
    })
  }

  getRequest(id: string) {
    return this.request({
      method: 'GET', path: `/v1/requests/${encodeURIComponent(id)}`, schema: ecorotaRequestSchema, idempotent: true,
    })
  }

  cancelRequest(id: string) {
    return this.request({
      method: 'POST',
      path: `/v1/requests/${encodeURIComponent(id)}/cancel`,
      schema: ecorotaRequestSchema,
      idempotent: false,
    })
  }

  completeRequest(id: string) {
    return this.request({
      method: 'POST',
      path: `/v1/requests/${encodeURIComponent(id)}/complete`,
      schema: ecorotaRequestSchema,
      idempotent: false,
    })
  }
}
