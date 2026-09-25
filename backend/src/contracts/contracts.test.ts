import { describe, expect, it } from 'vitest'

import {
  collectionListQuerySchema,
  collectionResponseSchema,
  collectionStatusSchema,
  createCollectionInputSchema,
  loginInputSchema,
  materialSchema,
} from './index.js'

const uuid = '7f5b0932-51de-4b93-8526-4fdcb0d56fb8'
const now = '2026-09-25T12:00:00.000Z'

describe('API contracts', () => {
  it('accepts the demo login contract', () => {
    expect(
      loginInputSchema.parse({
        email: 'resident@example.com',
        password: 'demo-password',
      }),
    ).toEqual({
      email: 'resident@example.com',
      password: 'demo-password',
    })
  })

  it('accepts decimal kilograms and integer units', () => {
    expect(
      materialSchema.parse({ type: 'paper', quantity: 2.5, unit: 'kg' }),
    ).toEqual({ type: 'paper', quantity: 2.5, unit: 'kg' })

    expect(
      materialSchema.parse({ type: 'glass', quantity: 3, unit: 'units' }),
    ).toEqual({ type: 'glass', quantity: 3, unit: 'units' })
  })

  it('rejects fractional units and other without a description', () => {
    expect(() =>
      materialSchema.parse({ type: 'plastic', quantity: 1.5, unit: 'bags' }),
    ).toThrow()

    expect(() =>
      materialSchema.parse({ type: 'other', quantity: 1, unit: 'units' }),
    ).toThrow()
  })

  it('accepts immediate and scheduled collections', () => {
    const immediate = createCollectionInputSchema.parse({
      collectionPointId: uuid,
      materials: [{ type: 'metal', quantity: 1, unit: 'kg' }],
    })
    const scheduled = createCollectionInputSchema.parse({
      collectionPointId: uuid,
      materials: [{ type: 'electronics', quantity: 2, unit: 'units' }],
      scheduledAt: now,
      notes: 'Leave at reception',
    })

    expect(immediate.scheduledAt).toBeUndefined()
    expect(scheduled.scheduledAt).toBe(now)
  })

  it('uses cursor pagination defaults and limits', () => {
    expect(collectionListQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(() => collectionListQuerySchema.parse({ limit: 101 })).toThrow()
    expect(() => collectionListQuerySchema.parse({ cursor: 'x'.repeat(201) })).toThrow()
  })

  it('defines the seven collection states', () => {
    expect(collectionStatusSchema.options).toEqual([
      'scheduled',
      'pending',
      'assigned',
      'in_service',
      'completed',
      'cancelled',
      'integration_failed',
    ])
  })

  it('does not expose EcoRota identifiers in collection responses', () => {
    const publicCollection = {
      id: uuid,
      status: 'pending',
      resident: { id: uuid, name: 'Maria' },
      collector: null,
      collectionPoint: { id: uuid, name: 'Point A' },
      materials: [{ type: 'paper', quantity: 1, unit: 'kg' }],
      scheduledAt: null,
      notes: null,
      pointsAwarded: null,
      createdAt: now,
      updatedAt: now,
    }

    expect(collectionResponseSchema.safeParse({ data: publicCollection }).success).toBe(true)
    expect(
      collectionResponseSchema.safeParse({
        data: { ...publicCollection, externalReference: 'collection:123' },
      }).success,
    ).toBe(false)
  })
})
