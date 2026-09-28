import { afterEach, describe, expect, it } from 'vitest'
import { cancelCollection, completeCollection } from './coletasService'
import { mockCollections } from './mocks/collections'
import { ApiError } from './api-error'

describe('collection state mock rules', () => {
  afterEach(() => {
    mockCollections.find(({ id }) => id.endsWith('000003'))!.status = 'assigned'
    mockCollections.find(({ id }) => id.endsWith('000005'))!.status =
      'completed'
    mockCollections.find(({ id }) => id.endsWith('000005'))!.pointsAwarded = 15
  })

  it('rejects cancellation after the allowed statuses', async () => {
    const completedId = mockCollections.find(
      ({ status }) => status === 'completed',
    )!.id

    await expect(cancelCollection(completedId)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'COLLECTION_NOT_CANCELLABLE',
      status: 409,
      details: { status: 'completed' },
    })
  })

  it('rejects completion unless the collection is in service', async () => {
    const assigned = mockCollections.find(
      ({ status }) => status === 'assigned',
    )!

    await expect(completeCollection(assigned.id)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'COLLECTION_NOT_COMPLETABLE',
      status: 409,
      details: { status: 'assigned' },
    } satisfies Partial<ApiError>)
  })
})
