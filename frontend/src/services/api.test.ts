import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from './api'

describe('API client', () => {
  const fetchMock = vi.fn()
  const storageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }

  beforeEach(() => {
    fetchMock.mockReset()
    storageMock.getItem.mockReset().mockReturnValue(null)
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('sessionStorage', storageMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('attaches a saved token as a Bearer authorization header', async () => {
    storageMock.getItem.mockReturnValue('saved-token')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: 'ok' }), { status: 200 }),
    )

    await get<{ data: string }>('/auth/me')

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).get('Authorization')).toBe(
      'Bearer saved-token',
    )
  })

  it('parses the backend error envelope into an ApiError', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'FORBIDDEN',
          message: 'Not allowed',
          details: { action: 'cancel' },
          requestId: 'request-123',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(get('/restricted')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'FORBIDDEN',
      message: 'Not allowed',
      requestId: 'request-123',
      details: { action: 'cancel' },
      status: 403,
      kind: 'http',
    })
  })

  it('aborts requests when the timeout elapses', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )

    const request = get('/slow', { timeoutMs: 100 })
    const assertion = expect(request).rejects.toMatchObject({
      name: 'ApiError',
      code: 'ECOROTA_UNAVAILABLE',
      kind: 'timeout',
      message: 'The request timed out.',
    })
    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })
})
