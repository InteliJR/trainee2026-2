import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from './app.js'
import type { Environment } from './config/env.js'
import { createPrisma } from './config/prisma.js'
import type { EcoRotaPoint } from './integrations/ecorota.js'
import { hashPassword } from './services/auth-service.js'
import { CollectorService } from './services/collector-service.js'
import { EcoRotaSyncService } from './services/ecorota-sync-service.js'
import { startTestDatabase } from './test/database.js'
import { FakeEcoRota } from './test/fake-ecorota.js'

const point: EcoRotaPoint = {
  id: '0e76397e-154d-48a0-bf76-689a8fed00ac',
  name: 'Ponto Central',
  kind: 'habitual',
  coordinates: [-46.6, -23.5],
}
const systemCollectorId = '9d4b7a52-3e61-4c8f-b0a2-71e5d6c4f3a1'

describe('collector operation and EcoRota sync', () => {
  let stopDatabase: (() => Promise<void>) | undefined
  let prisma: PrismaClient
  let app: Awaited<ReturnType<typeof buildApp>>
  let gateway: FakeEcoRota
  let sync: EcoRotaSyncService
  let collectors: CollectorService
  const users: Record<'resident' | 'collector' | 'otherCollector', { id: string; token: string }> =
    {} as never

  beforeAll(async () => {
    const { databaseUrl, stop } = await startTestDatabase()
    stopDatabase = stop
    const config: Environment = {
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
    prisma = createPrisma(config)
    gateway = new FakeEcoRota([point])
    gateway.collectors.set(systemCollectorId, {
      id: systemCollectorId, name: 'Sistema 1', origin: 'system', available: true, status: 'idle',
    })
    app = await buildApp({ config, logger: false, prisma, ecorota: gateway })
    sync = new EcoRotaSyncService(prisma, gateway)
    collectors = new CollectorService(prisma, gateway)

    for (const [key, role] of [
      ['resident', 'resident'],
      ['collector', 'collector'],
      ['otherCollector', 'collector'],
    ] as const) {
      const email = `${key.toLowerCase()}@example.com`
      const user = await prisma.user.create({
        data: { name: key, email, role, passwordHash: hashPassword('test-password-123') },
      })
      const login = await app.inject({
        method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'test-password-123' },
      })
      users[key] = { id: user.id, token: login.json().data.accessToken }
    }
  }, 120_000)

  afterAll(async () => {
    if (app) await app.close()
    if (prisma) await prisma.$disconnect()
    if (stopDatabase) await stopDatabase()
  })

  beforeEach(async () => {
    // Every test starts from a synced point and a provisioned custom collector.
    await sync.syncOnce()
    await collectors.provision(users.collector.id)
  })

  const auth = (key: keyof typeof users) => ({ authorization: `Bearer ${users[key].token}` })

  async function ecorotaIdOf(key: keyof typeof users) {
    const collector = await prisma.collector.findUniqueOrThrow({ where: { userId: users[key].id } })
    return collector.ecorotaCollectorId!
  }

  async function createCollection() {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/collections',
      headers: auth('resident'),
      payload: { collectionPointId: point.id, materials: [{ type: 'paper', quantity: 2, unit: 'kg' }] },
    })
    expect(response.statusCode).toBe(201)
    const collection = await prisma.collection.findUniqueOrThrow({ where: { id: response.json().data.id } })
    return { id: collection.id, requestId: collection.ecorotaRequestId! }
  }

  it('syncs points from the snapshot into the resident catalogue', async () => {
    gateway.points = [point, { ...point, id: '5b0f3c1e-8d4a-4f6e-9a51-2c7d9e3b1a44', name: 'Novo', kind: 'additional' }]
    const result = await sync.syncOnce()

    expect(result.points).toBe(1)
    const response = await app.inject({
      method: 'GET', url: '/api/v1/collection-points', headers: auth('resident'),
    })
    expect(response.json().data.map((item: { name: string }) => item.name)).toEqual(['Novo', 'Ponto Central'])
    expect((await sync.syncOnce()).points).toBe(0)
    gateway.points = [point]
  })

  it('provisions one custom collector per user, idempotently and within the slots', async () => {
    const ecorotaId = await ecorotaIdOf('collector')
    expect(gateway.collectors.get(ecorotaId)).toMatchObject({ origin: 'custom', available: false })

    const again = await collectors.provision(users.collector.id)
    expect(again).toEqual({ ecorotaCollectorId: ecorotaId, created: false })

    const before = gateway.collectors.size
    gateway.maxCollectors = before
    await expect(collectors.provision(users.otherCollector.id)).rejects.toThrow(/no free collector slot/)
    expect(gateway.collectors.size).toBe(before)
    gateway.maxCollectors = 4
  })

  it('links a custom collector that was created outside the platform', async () => {
    const existing = await gateway.createCollector({ name: 'Criado no Swagger' })

    await expect(collectors.provision(users.otherCollector.id, { linkEcoRotaId: systemCollectorId }))
      .rejects.toThrow(/custom collector not found/)
    const linked = await collectors.provision(users.otherCollector.id, { linkEcoRotaId: existing.id })

    expect(linked).toEqual({ ecorotaCollectorId: existing.id, created: false })
    await prisma.collector.update({ where: { userId: users.otherCollector.id }, data: { ecorotaCollectorId: null } })
    gateway.collectors.delete(existing.id)
  })

  it('reads the current collector profile only for registered collectors', async () => {
    const profile = await app.inject({
      method: 'GET', url: '/api/v1/collectors/me', headers: auth('collector'),
    })
    expect(profile.statusCode).toBe(200)
    expect(profile.json().data).toEqual({ id: users.collector.id, name: 'collector', available: false, status: 'unavailable' })

    const unregistered = await app.inject({
      method: 'GET', url: '/api/v1/collectors/me', headers: auth('otherCollector'),
    })
    expect(unregistered.statusCode).toBe(404)

    const resident = await app.inject({
      method: 'GET', url: '/api/v1/collectors/me', headers: auth('resident'),
    })
    expect(resident.statusCode).toBe(403)
  })

  it('changes availability only for registered collectors', async () => {
    const on = await app.inject({
      method: 'PATCH', url: '/api/v1/collectors/me/availability', headers: auth('collector'),
      payload: { available: true },
    })
    expect(on.statusCode).toBe(200)
    expect(on.json().data).toEqual({ id: users.collector.id, name: 'collector', available: true, status: 'idle' })
    expect(gateway.collectors.get(await ecorotaIdOf('collector'))?.available).toBe(true)

    const off = await app.inject({
      method: 'PATCH', url: '/api/v1/collectors/me/availability', headers: auth('collector'),
      payload: { available: false },
    })
    expect(off.json().data).toMatchObject({ available: false, status: 'unavailable' })

    const unregistered = await app.inject({
      method: 'PATCH', url: '/api/v1/collectors/me/availability', headers: auth('otherCollector'),
      payload: { available: true },
    })
    expect(unregistered.statusCode).toBe(404)

    const resident = await app.inject({
      method: 'PATCH', url: '/api/v1/collectors/me/availability', headers: auth('resident'),
      payload: { available: true },
    })
    expect(resident.statusCode).toBe(403)

    const invalid = await app.inject({
      method: 'PATCH', url: '/api/v1/collectors/me/availability', headers: auth('collector'),
      payload: { available: 'yes' },
    })
    expect(invalid.statusCode).toBe(400)
  })

  it('hides removed points from new requests while preserving collection history', async () => {
    const temporary = { ...point, id: '7c1caa82-845a-49be-b003-73adfca3df18', name: 'Ponto temporário' }
    gateway.points.push(temporary)
    await sync.syncOnce()
    const created = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth('resident'),
      payload: { collectionPointId: temporary.id, materials: [{ type: 'paper', quantity: 1, unit: 'kg' }] },
    })
    expect(created.statusCode).toBe(201)
    const id = created.json().data.id as string

    gateway.points = gateway.points.filter((item) => item.id !== temporary.id)
    await sync.syncOnce()
    const available = await app.inject({
      method: 'GET', url: '/api/v1/collection-points', headers: auth('resident'),
    })
    expect(available.json().data.some((item: { id: string }) => item.id === temporary.id)).toBe(false)
    const rejected = await app.inject({
      method: 'POST', url: '/api/v1/collections', headers: auth('resident'),
      payload: { collectionPointId: temporary.id, materials: [{ type: 'paper', quantity: 1, unit: 'kg' }] },
    })
    expect(rejected.statusCode).toBe(404)
    const history = await app.inject({
      method: 'GET', url: `/api/v1/collections/${id}`, headers: auth('resident'),
    })
    expect(history.json().data.collectionPoint.name).toBe(temporary.name)
  })

  it('runs the full custom collector flow through sync, assignment and confirmation', async () => {
    const { id, requestId } = await createCollection()
    const assignment = () => app.inject({
      method: 'GET', url: '/api/v1/collectors/me/assignment', headers: auth('collector'),
    })
    expect((await assignment()).json()).toEqual({ data: null })

    gateway.assign(requestId, await ecorotaIdOf('collector'))
    expect((await sync.syncOnce()).collectionsUpdated).toBe(1)

    const assigned = await assignment()
    expect(assigned.json().data).toMatchObject({
      id,
      status: 'assigned',
      collector: { id: users.collector.id, name: 'collector' },
      resident: { id: users.resident.id, name: 'resident' },
    })
    const residentView = await app.inject({
      method: 'GET', url: `/api/v1/collections/${id}`, headers: auth('resident'),
    })
    expect(residentView.json().data.collector).toEqual({ id: users.collector.id, name: 'collector' })

    const early = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/complete`, headers: auth('collector'),
    })
    expect(early.statusCode).toBe(409)
    expect(early.json().code).toBe('COLLECTION_NOT_COMPLETABLE')

    const stranger = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/complete`, headers: auth('otherCollector'),
    })
    expect(stranger.statusCode).toBe(403)

    gateway.arrive(requestId)
    await sync.syncOnce()
    const beforeRewards = await app.inject({
      method: 'GET', url: '/api/v1/rewards/balance', headers: auth('resident'),
    })
    const previousCount = beforeRewards.json().data.completedCollections as number
    const done = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/complete`, headers: auth('collector'),
    })
    expect(done.statusCode).toBe(200)
    expect(done.json().data).toMatchObject({ status: 'completed', pointsAwarded: 1 })
    expect(gateway.requests.get(requestId)?.status).toBe('completed')
    const rewards = await app.inject({
      method: 'GET', url: '/api/v1/rewards/balance', headers: auth('resident'),
    })
    expect(rewards.json().data.completedCollections).toBe(previousCount + 1)
    expect(rewards.json().data.balance).toBeGreaterThanOrEqual(previousCount + 1)
    const collectorRewards = await app.inject({
      method: 'GET', url: '/api/v1/rewards/balance', headers: auth('collector'),
    })
    expect(collectorRewards.statusCode).toBe(403)
    expect((await assignment()).json()).toEqual({ data: null })

    const twice = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/complete`, headers: auth('collector'),
    })
    expect(twice.statusCode).toBe(409)
  })

  it('scopes agenda, completed collections, frequent points and details to the collector', async () => {
    const { id, requestId } = await createCollection()
    gateway.assign(requestId, await ecorotaIdOf('collector'))
    await sync.syncOnce()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const params = new URLSearchParams({
      view: 'today', dayStart: start.toISOString(), dayEnd: end.toISOString(),
    })
    const today = await app.inject({
      method: 'GET', url: `/api/v1/collectors/me/collections?${params}`, headers: auth('collector'),
    })
    expect(today.statusCode).toBe(200)
    expect(today.json().data.map((item: { id: string }) => item.id)).toContain(id)

    const otherList = await app.inject({
      method: 'GET', url: `/api/v1/collectors/me/collections?${params}`, headers: auth('otherCollector'),
    })
    expect(otherList.json().data.some((item: { id: string }) => item.id === id)).toBe(false)
    const otherDetail = await app.inject({
      method: 'GET', url: `/api/v1/collectors/me/collections/${id}`, headers: auth('otherCollector'),
    })
    expect(otherDetail.statusCode).toBe(404)
    const residentDetail = await app.inject({
      method: 'GET', url: `/api/v1/collectors/me/collections/${id}`, headers: auth('resident'),
    })
    expect(residentDetail.statusCode).toBe(403)
    const ownDetail = await app.inject({
      method: 'GET', url: `/api/v1/collectors/me/collections/${id}`, headers: auth('collector'),
    })
    expect(ownDetail.json().data.id).toBe(id)

    gateway.arrive(requestId)
    await sync.syncOnce()
    const done = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/complete`, headers: auth('collector'),
    })
    expect(done.statusCode).toBe(200)
    const completed = await app.inject({
      method: 'GET', url: '/api/v1/collectors/me/collections?view=completed', headers: auth('collector'),
    })
    expect(completed.json().data.map((item: { id: string }) => item.id)).toContain(id)
    const finishedHistory = await app.inject({
      method: 'GET', url: '/api/v1/collections?stage=finished', headers: auth('resident'),
    })
    expect(finishedHistory.json().data.map((item: { id: string }) => item.id)).toContain(id)
    const activeHistory = await app.inject({
      method: 'GET', url: '/api/v1/collections?stage=active', headers: auth('resident'),
    })
    expect(activeHistory.json().data.map((item: { id: string }) => item.id)).not.toContain(id)
    const summary = await app.inject({
      method: 'GET', url: '/api/v1/collectors/me/summary', headers: auth('collector'),
    })
    expect(summary.json().data.frequentPoints).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: point.id })]),
    )
    const residentDashboard = await app.inject({
      method: 'GET', url: '/api/v1/collections/dashboard', headers: auth('resident'),
    })
    expect(residentDashboard.json().data.completed).toBeGreaterThanOrEqual(1)
    const collectorDashboard = await app.inject({
      method: 'GET', url: '/api/v1/collections/dashboard', headers: auth('collector'),
    })
    expect(collectorDashboard.statusCode).toBe(403)
  })

  it('mirrors system collectors without exposing a local collector', async () => {
    const { id, requestId } = await createCollection()
    gateway.assign(requestId, systemCollectorId)
    gateway.arrive(requestId)
    await sync.syncOnce()

    const collection = await prisma.collection.findUniqueOrThrow({ where: { id } })
    expect(collection).toMatchObject({ status: 'in_service', collectorId: null })
    expect(collection.lastSyncedAt).toBeInstanceOf(Date)

    gateway.requests.get(requestId)!.status = 'completed'
    await sync.syncOnce()
    expect(await prisma.collection.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'completed', pointsAwarded: 1,
    })
    await sync.syncOnce()
    expect(await prisma.rewardTransaction.count({
      where: { collectionId: id, reason: 'collection_completed' },
    })).toBe(1)
  })

  it('maps an EcoRota refusal to cancel after service started', async () => {
    const { id, requestId } = await createCollection()
    gateway.assign(requestId, systemCollectorId)
    await sync.syncOnce()
    gateway.arrive(requestId) // Local state still says `assigned`.

    const cancel = await app.inject({
      method: 'POST', url: `/api/v1/collections/${id}/cancel`, headers: auth('resident'),
    })
    expect(cancel.statusCode).toBe(409)
    expect(cancel.json().code).toBe('COLLECTION_NOT_CANCELLABLE')

    await sync.syncOnce()
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).status).toBe('in_service')
  })

  it('recovers a request that reached EcoRota when the local write was lost', async () => {
    const { id, requestId } = await createCollection()
    await prisma.collection.update({
      where: { id },
      data: { ecorotaRequestId: null, status: 'integration_failed', nextAttemptAt: new Date(Date.now() + 60_000) },
    })

    const result = await sync.syncOnce()

    expect(result.collectionsRecovered).toBe(1)
    const collection = await prisma.collection.findUniqueOrThrow({ where: { id } })
    expect(collection).toMatchObject({ ecorotaRequestId: requestId, status: 'pending', nextAttemptAt: null })
  })

  it('closes collections and unlinks collectors after a scenario reset without resending', async () => {
    const { id } = await createCollection()
    const createCalls = gateway.createCalls.length
    gateway.reset()

    const result = await sync.syncOnce()

    expect(result.collectionsLost).toBeGreaterThanOrEqual(1)
    expect(result.collectorsUnlinked).toBe(1)
    const collection = await prisma.collection.findUniqueOrThrow({ where: { id } })
    expect(collection.status).toBe('cancelled')
    expect(collection.integrationError).toMatch(/scenario reset/)
    expect(gateway.createCalls).toHaveLength(createCalls)
    expect(await prisma.collector.findUniqueOrThrow({ where: { userId: users.collector.id } }))
      .toMatchObject({ ecorotaCollectorId: null })
  })
})
