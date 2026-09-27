import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { AppError } from './app-error.js'
import { registerErrorHandlers } from './error-handler.js'

const apps: FastifyInstance[] = []

function createTestApp() {
  const app = Fastify({ logger: false })
  registerErrorHandlers(app)
  apps.push(app)
  return app
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('error handlers', () => {
  it('serializes application errors', async () => {
    const app = createTestApp()
    app.get('/conflict', async () => {
      throw new AppError({
        code: 'COLLECTION_NOT_CANCELLABLE',
        message: 'Collection cannot be cancelled',
        statusCode: 409,
        details: { status: 'in_service' },
      })
    })

    const response = await app.inject({ method: 'GET', url: '/conflict' })
    const body = response.json()

    expect(response.statusCode).toBe(409)
    expect(body).toMatchObject({
      code: 'COLLECTION_NOT_CANCELLABLE',
      message: 'Collection cannot be cancelled',
      details: { status: 'in_service' },
    })
    expect(body.requestId).toBe(response.headers['x-request-id'])
  })

  it('serializes Zod validation errors', async () => {
    const app = createTestApp()
    app.get('/validation', async () => {
      z.object({ name: z.string() }).parse({})
    })

    const response = await app.inject({ method: 'GET', url: '/validation' })
    const body = response.json()

    expect(response.statusCode).toBe(400)
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details.fields).toHaveLength(1)
  })

  it('serializes malformed JSON as a validation error', async () => {
    const app = createTestApp()
    app.post('/json', async () => ({ data: null }))

    const response = await app.inject({
      method: 'POST',
      url: '/json',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().code).toBe('VALIDATION_ERROR')
  })

  it('returns a standardized not-found error', async () => {
    const app = createTestApp()
    const response = await app.inject({ method: 'GET', url: '/missing' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      details: {},
    })
  })

  it('does not leak unexpected error details', async () => {
    const app = createTestApp()
    app.get('/unexpected', async () => {
      throw new Error('database password leaked')
    })

    const response = await app.inject({ method: 'GET', url: '/unexpected' })
    const body = response.json()

    expect(response.statusCode).toBe(500)
    expect(body.code).toBe('INTERNAL_ERROR')
    expect(response.body).not.toContain('database password leaked')
  })
})
