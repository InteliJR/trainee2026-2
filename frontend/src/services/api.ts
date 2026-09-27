import { getToken } from './authStorage'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

type MethodOptions = Omit<RequestOptions, 'method' | 'body'>

function buildUrl(path: string): string {
  const baseUrl = API_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/api/v1${normalizedPath}`
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...fetchOptions } = options
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const responseText = await response.text()
  const responseData = responseText ? JSON.parse(responseText) : undefined

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
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
