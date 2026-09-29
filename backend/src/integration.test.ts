import { randomUUID } from 'node:crypto'

import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from './app.js'
import type { Environment } from './config/env.js'
import { createPrisma } from './config/prisma.js'
import type { EcoRotaPoint } from './integrations/ecorota.js'
import { hashPassword } from './services/auth-service.js'
import { CollectionService } from './services/coletaService.js'
import { PointService } from './services/pontosService.js'
import { RewardService } from './services/reward-service.js'
import { runNodeTool, startTestDatabase } from './test/database.js'
import { FakeEcoRota } from './test/fake-ecorota.js'

const pointId = '0e76397e-154d-48a0-bf76-689a8fed00ac'
const point: EcoRotaPoint = {
  id: pointId,
  name: 'Ponto Central',
  kind: 'habitual',
  coordinates: [-46.6, -23.5],
}

describe('resident flow with PostgreSQL', () => {
  let stopDatabase: (() => Promise<void>) | undefined
  let prisma: PrismaClient
  let app: Awaited<ReturnType<typeof buildApp>>
  let gateway: FakeEcoRota
  let residentToken: string
  let otherToken: string
  let collectorToken: string
  let residentId: string
  let service: CollectionService
  let config: Environment

  beforeAll(async () => {
    const { databaseUrl, stop } = await startTestDatabase()
    stopDatabase = stop

    config = {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: 3333,
      LOG_LEVEL: 'silent',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: databaseUrl,
      AUTH_MODE: 'mock',
      ECOROTA_API_URL: 'http://localhost:3334',
      ECOROTA_TIMEOUT_MS: 5000,
    }
    runNodeTool('npm', ['run', 'db:seed-demo'], {
      DATABASE_URL: databaseUrl,
      ECOROTA_API_URL: 'http://localhost:3334',
      NODE_ENV: 'test',
      DEMO_PASSWORD: '123456',
    })
    prisma = createPrisma(config)
    await prisma.collectionPoint.create({
      data: {
        id: point.id,
        name: point.name,
        kind: point.kind,
        longitude: point.coordinates[0],
        latitude: point.coordinates[1],
      },
    })
    gateway = new FakeEcoRota([point])
    app = await buildApp({ config, logger: false, prisma, ecorota: gateway })
    service = new CollectionService(prisma, gateway, new PointService(prisma))

    for (const [email, role] of [
      ['resident@example.com', 'resident'],
      ['other@example.com', 'resident'],
      ['collector@example.com', 'collector'],
    ] as const) {
      const user = await prisma.user.create({
        data: { name: email, email, role, passwordHash: hashPassword('test-password-123') },
      })
      if (email === 'resident@example.com') residentId = user.id
    }

    async function login(email: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'test-password-123' },
      })
      expect(response.statusCode).toBe(200)
      return response.json().data.accessToken as string
    }
    residentToken = await login('resident@example.com')
    otherToken = await login('other@example.com')
    collectorToken = await login('collector@example.com')
  }, 120_000)

  afterAll(async () => {
    if (app) await app.close()
    if (prisma) await prisma.$disconnect()
    if (stopDatabase) await stopDatabase()
  })

  function auth(token = residentToken) { return { authorization: `Bearer ${token}` } }
  function input(extra: Record<string, unknown> = {}) {
    return {
      collectionPointId: pointId,
      materials: [{ type: 'paper', quantity: 2.5, unit: 'kg' }],
      notes: 'Na portaria',
      ...extra,
    }
  }

  it('authenticates roles and reads points', async () => {
    const points = await app.inject({ method: 'GET', url: '/api/v1/collection-points', headers: auth() })
    expect(points.statusCode).toBe(200)
    expect(points.json().data[0].id).toBe(pointId)

    const noToken = await app.inject({ method: 'GET', url: '/api/v1/collections' })
    expect(noToken.statusCode).toBe(401)

    const collector = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(collectorToken), payload: input(),
    })
    expect(collector.statusCode).toBe(403)
  })

  it('keeps the API bootable while the EcoRota adapter is pending', async () => {
    const isolated = await buildApp({ config, logger: false, prisma })
    try {
      const points = await isolated.inject({
        method: 'GET', url: '/api/v1/collection-points', headers: auth(),
      })
      expect(points.statusCode).toBe(200)
      expect(points.json().data[0].id).toBe(pointId)

      const created = await isolated.inject({
        method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
      })
      expect(created.statusCode).toBe(201)
      expect(created.json().data.status).toBe('integration_failed')
      const cancelled = await isolated.inject({
        method: 'POST', url: `/api/v1/collections/${created.json().data.id}/cancel`, headers: auth(),
      })
      expect(cancelled.statusCode).toBe(200)
      expect(cancelled.json().data.status).toBe('cancelled')
    } finally {
      await isolated.close()
    }
  })

  it('returns the same error for unknown emails and wrong passwords', async () => {
    const responses = await Promise.all([
      app.inject({
        method: 'POST', url: '/api/v1/auth/login',
        payload: { email: 'missing@example.com', password: 'wrong-password' },
      }),
      app.inject({
        method: 'POST', url: '/api/v1/auth/login',
        payload: { email: 'resident@example.com', password: 'wrong-password' },
      }),
    ])
    expect(responses.map((response) => response.statusCode)).toEqual([401, 401])
    expect(responses[0]?.json().message).toBe(responses[1]?.json().message)
  })

  it('seeds usable demo accounts', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'demo-resident@ecorota.local', password: '123456' },
    })
    expect(login.statusCode).toBe(200)
    expect(login.json().data.user.role).toBe('resident')
    const collector = await prisma.user.findUniqueOrThrow({
      where: { email: 'demo-collector@ecorota.local' },
      include: { collector: true },
    })
    expect(collector.collector).not.toBeNull()
  })

  it('persists an immediate request, links EcoRota and protects ownership', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    expect(response.statusCode).toBe(201)
    const created = response.json().data
    expect(created.status).toBe('pending')
    expect(created.materials[0].quantity).toBe(2.5)
    expect(created.externalReference).toBeUndefined()

    const saved = await prisma.collection.findUniqueOrThrow({
      where: { id: created.id }, include: { materials: true },
    })
    expect(saved.externalReference).toBe(`collection:${created.id}`)
    expect(saved.ecorotaRequestId).toBeTruthy()
    expect(saved.materials[0]?.description).toBeNull()
    expect(saved.notes).toBe('Na portaria')

    const own = await app.inject({
      method: 'GET', url: `/api/v1/collections/${created.id}`, headers: auth(),
    })
    expect(own.statusCode).toBe(200)

    const other = await app.inject({
      method: 'GET', url: `/api/v1/collections/${created.id}`, headers: auth(otherToken),
    })
    expect(other.statusCode).toBe(404)
    const foreignCancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${created.id}/cancel`, headers: auth(otherToken),
    })
    expect(foreignCancel.statusCode).toBe(404)

    const cancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${created.id}/cancel`, headers: auth(),
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().data.status).toBe('cancelled')
    const again = await app.inject({
      method: 'POST', url: `/api/v1/collections/${created.id}/cancel`, headers: auth(),
    })
    expect(again.statusCode).toBe(409)
  })

  it('keeps future requests local and dispatches them when due', async () => {
    const later = new Date(Date.now() + 60_000).toISOString()
    const before = gateway.createCalls.length
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ scheduledAt: later }),
    })
    expect(response.statusCode).toBe(201)
    const created = response.json().data
    expect(created.status).toBe('scheduled')
    expect(gateway.createCalls).toHaveLength(before)

    await prisma.collection.update({
      where: { id: created.id },
      data: { scheduledAt: new Date(Date.now() - 1000) },
    })
    expect(await service.processDue()).toBeGreaterThanOrEqual(1)
    const saved = await prisma.collection.findUniqueOrThrow({ where: { id: created.id } })
    expect(saved.status).toBe('pending')
    expect(saved.ecorotaRequestId).toBeTruthy()
  })

  it('cancels a future collection without sending it to EcoRota', async () => {
    const before = gateway.createCalls.length
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ scheduledAt: new Date(Date.now() + 60_000).toISOString() }),
    })
    const id = response.json().data.id as string
    const cancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().data.status).toBe('cancelled')
    expect(gateway.createCalls).toHaveLength(before)
  })

  it('dispatches a scheduled collection automatically while the server runs', async () => {
    const runningApp = await buildApp({
      config: { ...config, NODE_ENV: 'development' },
      logger: false,
      prisma,
      ecorota: gateway,
      schedulerIntervalMs: 25,
    })
    try {
      const response = await runningApp.inject({
        method: 'POST',
        url: '/api/v1/collections',
        headers: auth(),
        payload: input({ scheduledAt: new Date(Date.now() + 300).toISOString() }),
      })
      expect(response.statusCode).toBe(201)
      const id = response.json().data.id as string
      expect(response.json().data.status).toBe('scheduled')

      let status = 'scheduled'
      const deadline = Date.now() + 3_000
      while (status !== 'pending' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 30))
        status = (await prisma.collection.findUniqueOrThrow({ where: { id } })).status
      }
      expect(status).toBe('pending')
    } finally {
      await runningApp.close()
    }
  })

  it('keeps failed requests and retries with the same reference', async () => {
    gateway.failCreate = true
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    expect(response.statusCode).toBe(201)
    const created = response.json().data
    expect(created.status).toBe('integration_failed')
    const before = await prisma.collection.findUniqueOrThrow({ where: { id: created.id } })

    gateway.failCreate = false
    await prisma.collection.update({
      where: { id: created.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    })
    await service.processDue()
    const after = await prisma.collection.findUniqueOrThrow({ where: { id: created.id } })
    expect(after.status).toBe('pending')
    expect(after.externalReference).toBe(before.externalReference)
    expect(gateway.createCalls.filter((call) => call.externalReference === before.externalReference)).toHaveLength(2)
  })

  it('recovers a previously accepted EcoRota request without duplicating it', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ scheduledAt: new Date(Date.now() + 60_000).toISOString() }),
    })
    const id = response.json().data.id as string
    const stored = await prisma.collection.findUniqueOrThrow({ where: { id } })
    const remote = await gateway.createRequest({
      pointId: stored.collectionPointId,
      externalReference: stored.externalReference,
    })
    await prisma.collection.update({
      where: { id },
      data: {
        status: 'integration_failed',
        scheduledAt: null,
        dispatchLockedAt: new Date(Date.now() - 120_000),
      },
    })

    await service.processDue()
    const recovered = await prisma.collection.findUniqueOrThrow({ where: { id } })
    expect(recovered.ecorotaRequestId).toBe(remote.id)
    expect(recovered.status).toBe('pending')
    expect([...gateway.requests.values()].filter(
      (item) => item.externalReference === stored.externalReference,
    )).toHaveLength(1)
  })

  it('cancels a failed collection locally without creating an EcoRota request', async () => {
    gateway.failCreate = true
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    gateway.failCreate = false
    const id = response.json().data.id as string
    const createCalls = gateway.createCalls.length
    const cancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().data.status).toBe('cancelled')
    const saved = await prisma.collection.findUniqueOrThrow({ where: { id } })
    expect(saved.ecorotaRequestId).toBeNull()
    expect(saved.nextAttemptAt).toBeNull()
    expect(gateway.createCalls).toHaveLength(createCalls)
    await service.processDue()
    expect(gateway.createCalls).toHaveLength(createCalls)
  })

  it('waits for a live dispatch lock before cancelling a failed collection', async () => {
    gateway.failCreate = true
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    gateway.failCreate = false
    const id = response.json().data.id as string
    await prisma.collection.update({ where: { id }, data: { dispatchLockedAt: new Date() } })
    const locked = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
    })
    expect(locked.statusCode).toBe(409)
    await prisma.collection.update({
      where: { id }, data: { dispatchLockedAt: new Date(Date.now() - 120_000) },
    })
    const cancelled = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
    })
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json().data.status).toBe('cancelled')
  })

  it('does not restore a cancelled status when an expired dispatch finishes late', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ scheduledAt: new Date(Date.now() + 60_000).toISOString() }),
    })
    const id = response.json().data.id as string
    await prisma.collection.update({
      where: { id }, data: { scheduledAt: new Date(Date.now() - 1_000) },
    })
    let release: (() => void) | undefined
    let started: (() => void) | undefined
    const startedPromise = new Promise<void>((resolve) => { started = resolve })
    const releasePromise = new Promise<void>((resolve) => { release = resolve })
    const realCreate = gateway.createRequest.bind(gateway)
    const create = vi.spyOn(gateway, 'createRequest').mockImplementationOnce(async (request) => {
      started?.()
      await releasePromise
      return realCreate(request)
    })
    try {
      const dispatch = service.dispatch(id)
      await startedPromise
      await prisma.collection.update({
        where: { id }, data: { dispatchLockedAt: new Date(Date.now() - 120_000) },
      })
      const cancel = await app.inject({
        method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
      })
      expect(cancel.statusCode).toBe(200)
      release?.()
      await dispatch
      expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).status).toBe('cancelled')
    } finally {
      release?.()
      create.mockRestore()
    }
  })

  it('returns the persisted collection if EcoRota accepted but saving its id fails', async () => {
    const realUpdateMany = prisma.collection.updateMany.bind(prisma.collection)
    const updateMany = vi.spyOn(prisma.collection, 'updateMany')
      .mockImplementationOnce(realUpdateMany)
      .mockRejectedValueOnce(new Error('Database write failed'))
    try {
      const countBefore = await prisma.collection.count({ where: { residentId } })
      const response = await app.inject({
        method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
      })
      expect(response.statusCode).toBe(201)
      const id = response.json().data.id as string
      expect(response.json().data.status).toBe('integration_failed')
      expect(await prisma.collection.count({ where: { residentId } })).toBe(countBefore + 1)
      const saved = await prisma.collection.findUniqueOrThrow({ where: { id } })
      expect(saved.ecorotaRequestId).toBeNull()
      expect(saved.dispatchLockedAt).not.toBeNull()
      const remote = [...gateway.requests.values()].find(
        (request) => request.externalReference === saved.externalReference,
      )
      expect(remote).toBeDefined()
      await prisma.collection.update({
        where: { id }, data: { dispatchLockedAt: new Date(Date.now() - 120_000) },
      })
      await service.processDue()
      const recovered = await prisma.collection.findUniqueOrThrow({ where: { id } })
      expect(recovered.ecorotaRequestId).toBe(remote?.id)
      expect(recovered.status).toBe('pending')
      expect([...gateway.requests.values()].filter(
        (request) => request.externalReference === saved.externalReference,
      )).toHaveLength(1)
    } finally {
      updateMany.mockRestore()
    }
  })

  it('uses the locally recorded status to prevent late cancellation', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    await prisma.collection.update({ where: { id }, data: { status: 'in_service' } })

    const detail = await app.inject({
      method: 'GET', url: `/api/v1/collections/${id}`, headers: auth(),
    })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().data.status).toBe('in_service')

    const cancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
    })
    expect(cancel.statusCode).toBe(409)
    expect(cancel.json().code).toBe('COLLECTION_NOT_CANCELLABLE')
  })

  it('maps an EcoRota cancellation conflict to 409', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    gateway.rejectCancel = true
    try {
      const cancel = await app.inject({
        method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth(),
      })
      expect(cancel.statusCode).toBe(409)
    } finally {
      gateway.rejectCancel = false
    }
  })

  it('serves the authenticated API over a real HTTP socket', async () => {
    const runningApp = await buildApp({ config, logger: false, prisma, ecorota: gateway })
    try {
      const address = await runningApp.listen({ host: '127.0.0.1', port: 0 })
      const response = await fetch(`${address}/api/v1/auth/me`, { headers: auth() })
      expect(response.status).toBe(200)
      const body: unknown = await response.json()
      expect(body).toMatchObject({ data: { id: residentId, role: 'resident' } })
    } finally {
      await runningApp.close()
    }
  })

  it('filters history using the locally recorded status', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    await prisma.collection.update({ where: { id }, data: { status: 'completed' } })

    const pending = await app.inject({
      method: 'GET', url: '/api/v1/collections?status=pending&limit=100', headers: auth(),
    })
    expect(pending.statusCode).toBe(200)
    expect(pending.json().data.some((item: { id: string }) => item.id === id)).toBe(false)

    const completed = await app.inject({
      method: 'GET', url: '/api/v1/collections?status=completed&limit=100', headers: auth(),
    })
    expect(completed.statusCode).toBe(200)
    expect(completed.json().data.some((item: { id: string }) => item.id === id)).toBe(true)
  })

  it('validates inputs and lists history by cursor', async () => {
    const invalid = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ materials: [{ type: 'plastic', quantity: 1.5, unit: 'bags' }] }),
    })
    expect(invalid.statusCode).toBe(400)

    const past = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ scheduledAt: new Date(Date.now() - 10_000).toISOString() }),
    })
    expect(past.statusCode).toBe(400)
    expect(past.json().code).toBe('INVALID_SCHEDULE')

    const first = await app.inject({
      method: 'GET', url: '/api/v1/collections?limit=1', headers: auth(),
    })
    expect(first.statusCode).toBe(200)
    expect(first.json().data).toHaveLength(1)
    expect(first.json().nextCursor).toBeTruthy()
    const second = await app.inject({
      method: 'GET',
      url: `/api/v1/collections?limit=1&cursor=${first.json().nextCursor}`,
      headers: auth(),
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().data[0].id).not.toBe(first.json().data[0].id)

    const others = await app.inject({
      method: 'GET', url: '/api/v1/collections', headers: auth(otherToken),
    })
    expect(others.json().data).toHaveLength(0)
    expect(await prisma.collection.count({ where: { residentId } })).toBeGreaterThan(1)
  })

  it('persists multiple materials and the chosen future date without dispatching early', async () => {
    const scheduledAt = new Date(Date.now() + 120_000).toISOString()
    const before = gateway.createCalls.length
    const response = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({
        scheduledAt,
        notes: 'Retirar na portaria',
        materials: [
          { type: 'paper', quantity: 1.25, unit: 'kg' },
          { type: 'other', quantity: 2, unit: 'units', description: 'Baterias' },
        ],
      }),
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().data.status).toBe('scheduled')
    expect(response.json().data.materials).toHaveLength(2)
    expect(gateway.createCalls).toHaveLength(before)

    const saved = await prisma.collection.findUniqueOrThrow({
      where: { id: response.json().data.id }, include: { materials: true },
    })
    expect(saved.scheduledAt?.toISOString()).toBe(scheduledAt)
    expect(saved.notes).toBe('Retirar na portaria')
    expect(saved.materials.map((material) => material.type)).toEqual(
      expect.arrayContaining(['paper', 'other']),
    )
    expect(saved.materials.find((material) => material.type === 'other')?.description).toBe('Baterias')
  })

  it('rejects invalid history cursors and unknown collection points', async () => {
    const cursor = await app.inject({
      method: 'GET', url: '/api/v1/collections?cursor=not-a-cursor', headers: auth(),
    })
    expect(cursor.statusCode).toBe(400)
    expect(cursor.json().code).toBe('VALIDATION_ERROR')

    const before = await prisma.collection.count({ where: { residentId } })
    const unknownPoint = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(),
      payload: input({ collectionPointId: randomUUID() }),
    })
    expect(unknownPoint.statusCode).toBe(404)
    expect(await prisma.collection.count({ where: { residentId } })).toBe(before)
  })

  it('credits a completed collection once under concurrent attempts', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    await prisma.collection.update({ where: { id }, data: { status: 'completed' } })

    const rewards = new RewardService(prisma)
    const results = await Promise.all([
      rewards.creditCompletedCollectionOnce(id, 12),
      rewards.creditCompletedCollectionOnce(id, 12),
    ])
    expect(results.map((result) => result.awarded).sort()).toEqual([false, true])
    expect(results.every((result) => result.pointsAwarded === 12)).toBe(true)

    const transactions = await prisma.rewardTransaction.findMany({
      where: { collectionId: id, reason: 'collection_completed' },
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({ userId: residentId, kind: 'credit', amount: 12 })
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).pointsAwarded).toBe(12)

    const replay = await rewards.creditCompletedCollectionOnce(id, 99)
    expect(replay).toEqual({ awarded: false, pointsAwarded: 12 })
    expect(await prisma.rewardTransaction.count({ where: { collectionId: id } })).toBe(1)
  })

  it('rejects credit before completion and invalid point amounts', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    const rewards = new RewardService(prisma)

    await expect(rewards.creditCompletedCollectionOnce(id, 10)).rejects.toMatchObject({
      code: 'COLLECTION_NOT_COMPLETABLE', statusCode: 409,
    })
    for (const points of [0, -1, 1.5, 2_147_483_648]) {
      await expect(rewards.creditCompletedCollectionOnce(id, points)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR', statusCode: 400,
      })
    }
    expect(await prisma.rewardTransaction.count({ where: { collectionId: id } })).toBe(0)
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).pointsAwarded).toBeNull()
  })

  it('rolls back the collection update if the unique ledger entry already exists', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth(), payload: input(),
    })
    const id = created.json().data.id as string
    await prisma.collection.update({ where: { id }, data: { status: 'completed' } })
    await prisma.rewardTransaction.create({
      data: {
        userId: residentId, collectionId: id, kind: 'credit',
        reason: 'collection_completed', amount: 3,
      },
    })

    await expect(new RewardService(prisma).creditCompletedCollectionOnce(id, 12)).rejects.toBeTruthy()
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).pointsAwarded).toBeNull()
    expect(await prisma.rewardTransaction.count({ where: { collectionId: id } })).toBe(1)
  })
})
