import { getToken } from './authStorage'
import { ApiError } from './api-error'
import type { ErrorCode, ErrorResponse } from '../types/common'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
export const DEFAULT_TIMEOUT_MS = 10_000

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  timeoutMs?: number
}

type MethodOptions = Omit<RequestOptions, 'method' | 'body' | 'timeoutMs'> & {
  timeoutMs?: number
}

const errorCodes: ErrorCode[] = [
  'VALIDATION_ERROR',
  'INVALID_SCHEDULE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'COLLECTION_NOT_CANCELLABLE',
  'COLLECTION_NOT_COMPLETABLE',
  'NO_ACTIVE_ASSIGNMENT',
  'ECOROTA_UNAVAILABLE',
  'INTERNAL_ERROR',
]

function buildUrl(path: string): string {
  const baseUrl = API_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/api/v1${normalizedPath}`
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    headers,
    signal: callerSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const abortFromCaller = () => controller.abort(callerSignal?.reason)
  if (callerSignal?.aborted) {
    abortFromCaller()
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  let response: Response
  let responseText: string
  try {
    response = await fetch(buildUrl(path), {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    responseText = await response.text()
  } catch {
    const message = timedOut
      ? 'The request timed out.'
      : 'The API could not be reached.'
    throw new ApiError({
      code: 'ECOROTA_UNAVAILABLE',
      message,
      requestId: 'client',
      kind: timedOut ? 'timeout' : 'network',
    })
  } finally {
    clearTimeout(timeoutId)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }

  let responseData: unknown
  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      throw new ApiError({
        code: 'INTERNAL_ERROR',
        message: 'The API returned an invalid response.',
        requestId: response.headers.get('x-request-id') ?? 'client',
        status: response.status,
        kind: 'response',
      })
    }
  }

  if (!response.ok) {
    const errorBody = responseData as Partial<ErrorResponse> | undefined
    const code = errorCodes.includes(errorBody?.code as ErrorCode)
      ? (errorBody?.code as ErrorCode)
      : 'INTERNAL_ERROR'
    throw new ApiError({
      code,
      message:
        errorBody?.message ?? `Request failed with status ${response.status}`,
      requestId:
        errorBody?.requestId ??
        response.headers.get('x-request-id') ??
        'client',
      details: errorBody?.details,
      status: response.status,
      kind: 'http',
    })
  }

  return responseData as T
}

export function get<T>(path: string, options: MethodOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' })
}

export function post<T>(
  path: string,
  body?: unknown,
  options: MethodOptions = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body })
}

export function patch<T>(
  path: string,
  body?: unknown,
  options: MethodOptions = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'PATCH', body })
}

export function del<T>(path: string, options: MethodOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' })
}
