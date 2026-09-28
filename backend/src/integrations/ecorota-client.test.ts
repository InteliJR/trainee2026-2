import { describe, expect, it, vi } from 'vitest'

import * as fixtures from '../test/ecorota-fixtures.js'
import { EcoRotaHttpClient, EcoRotaRejectedError, EcoRotaUnavailableError } from './ecorota-client.js'

const token = 'secret-team-token'

type Reply = { status: number; body?: unknown; headers?: Record<string, string> } | Error

function setup(...replies: Reply[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const reply = replies.shift()
    if (!reply) throw new Error('Unexpected extra call')
    if (reply instanceof Error) throw reply
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json', ...reply.headers },
    })
  })
  const sleep = vi.fn(async () => {})
  const logger = { warn: vi.fn(), error: vi.fn() }
  const client = new EcoRotaHttpClient({
    baseUrl: 'https://ecorota.test/',
    token,
    timeoutMs: 1000,
    fetch: fetchMock as typeof fetch,
    sleep,
    logger,
  })
  return { client, calls, sleep, logger }
}

function timeoutError() {
  return Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
}

describe('EcoRotaHttpClient', () => {
  it('sends the bearer credential and unwraps the envelope', async () => {
    const { client, calls } = setup({ status: 200, body: fixtures.envelope([fixtures.point]) })

    const points = await client.listPoints()

    expect(points).toEqual([{
      id: fixtures.ids.point,
      name: 'Ponto Central',
      kind: 'habitual',
      coordinates: [-46.6333, -23.5505],
    }])
    expect(calls[0]?.url).toBe('https://ecorota.test/v1/points')
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe(`Bearer ${token}`)
  })

  it('parses the snapshot and ignores fields it does not use', async () => {
    const { client } = setup({ status: 200, body: fixtures.envelope(fixtures.snapshot) })

    const snapshot = await client.getSnapshot()

    expect(snapshot.points).toHaveLength(2)
    expect(snapshot.collectors[1]).toEqual({
      id: fixtures.ids.customCollector,
      name: 'Coletor Demo',
      origin: 'custom',
      available: false,
      status: 'unavailable',
    })
    expect(snapshot.requests[0]?.collectorId).toBeNull()
  })

  it('posts requests with pointId and externalReference', async () => {
    const { client, calls } = setup({ status: 200, body: fixtures.envelope(fixtures.request) })
    const input = { pointId: fixtures.ids.point, externalReference: fixtures.request.externalReference }

    await client.createRequest(input)

    expect(calls[0]?.init.method).toBe('POST')
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(input)
  })

  it('escapes ids placed in the path', async () => {
    const { client, calls } = setup({ status: 200, body: fixtures.envelope(fixtures.request) })

    await client.getRequest('../environment')

    expect(calls[0]?.url).toBe('https://ecorota.test/v1/requests/..%2Fenvironment')
  })

  it('waits for Retry-After and retries after 429', async () => {
    const { client, calls, sleep } = setup(
      { status: 429, body: fixtures.errors.rateLimited, headers: { 'retry-after': '2' } },
      { status: 200, body: fixtures.envelope(fixtures.request) },
    )

    await client.cancelRequest(fixtures.ids.request)

    expect(calls).toHaveLength(2)
    expect(sleep).toHaveBeenCalledWith(2000)
  })

  it('reports rate limiting after exhausting attempts', async () => {
    const limited = { status: 429, body: fixtures.errors.rateLimited, headers: { 'retry-after': '1' } }
    const { client, calls } = setup(limited, limited, limited)

    const error = await client.listPoints().catch((caught: unknown) => caught)

    expect(calls).toHaveLength(3)
    expect(error).toBeInstanceOf(EcoRotaUnavailableError)
    expect(error).toMatchObject({ statusCode: 503, details: { reason: 'rate_limited', retryAfterSeconds: 1 } })
  })

  it('does not wait for a Retry-After longer than the limit', async () => {
    const { client, calls, sleep } = setup(
      { status: 429, body: fixtures.errors.rateLimited, headers: { 'retry-after': '60' } },
    )

    await expect(client.listPoints()).rejects.toMatchObject({ details: { reason: 'rate_limited' } })
    expect(calls).toHaveLength(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('maps a rejected credential to 503 without retrying or leaking it', async () => {
    const { client, calls, logger } = setup({ status: 401, body: fixtures.errors.unauthorized })

    const error = await client.listPoints().catch((caught: unknown) => caught)

    expect(calls).toHaveLength(1)
    expect(error).toMatchObject({ code: 'ECOROTA_UNAVAILABLE', statusCode: 503, details: { reason: 'auth' } })
    expect(JSON.stringify(error)).not.toContain(token)
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(token)
  })

  it('retries idempotent calls after timeouts and server errors', async () => {
    const { client, calls } = setup(
      timeoutError(),
      { status: 502, body: fixtures.errors.server },
      { status: 200, body: fixtures.envelope(fixtures.environment) },
    )

    const environment = await client.getEnvironment()

    expect(calls).toHaveLength(3)
    expect(environment.maxCollectors).toBe(4)
  })

  it('does not blindly resend non-idempotent commands', async () => {
    const { client, calls } = setup({ status: 500, body: fixtures.errors.server })

    await expect(client.completeRequest(fixtures.ids.request)).rejects.toMatchObject({
      details: { reason: 'upstream_error', upstreamStatus: 500 },
    })
    expect(calls).toHaveLength(1)

    const second = setup(timeoutError())
    await expect(second.client.createCollector({ name: 'Coletor' })).rejects.toMatchObject({
      details: { reason: 'timeout' },
    })
    expect(second.calls).toHaveLength(1)
  })

  it('reports network failures after the last attempt', async () => {
    const failure = new TypeError('fetch failed')
    const { client } = setup(failure, failure, failure)

    await expect(client.getSnapshot()).rejects.toMatchObject({ details: { reason: 'network' } })
  })

  it('exposes business errors with the upstream status and code', async () => {
    const { client } = setup({ status: 409, body: fixtures.errors.conflict })

    const error = await client.cancelRequest(fixtures.ids.request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(EcoRotaRejectedError)
    expect(error).toMatchObject({ upstreamStatus: 409, upstreamCode: 'INVALID_STATE' })
  })

  it('rejects responses outside the contract', async () => {
    const { client, logger } = setup({
      status: 200,
      body: fixtures.envelope({ ...fixtures.request, status: 'lost' }),
    })

    await expect(client.getRequest(fixtures.ids.request)).rejects.toMatchObject({
      details: { reason: 'invalid_response' },
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
