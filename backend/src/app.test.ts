import { afterEach, describe, expect, it } from 'vitest'

import { buildApp } from './app.js'
import type { Environment } from './config/env.js'

const testEnvironment: Environment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3333,
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://ecorota:ecorota@localhost:5432/ecorota',
  AUTH_MODE: 'mock',
  ECOROTA_API_URL: 'http://localhost:3334',
  ECOROTA_TIMEOUT_MS: 5000,
}

const apps = [] as Awaited<ReturnType<typeof buildApp>>[]

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('GET /health', () => {
  it('informa que a API esta disponivel', async () => {
    const app = await buildApp({ config: testEnvironment, logger: false })
    apps.push(app)
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', service: 'ecorota-backend' })
  })
})
