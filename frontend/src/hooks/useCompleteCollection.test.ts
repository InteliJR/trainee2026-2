import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Collection } from '../types'
import { completeCollection } from '../services/coletasService'
import { ApiError } from '../services/api-error'
import { errorMessages } from '../utils/error-messages'
import { useCompleteCollection } from './useCompleteCollection'

vi.mock('../services/coletasService', () => ({
  completeCollection: vi.fn(),
}))

const completedCollection: Collection = {
  id: '40000000-0000-4000-8000-000000000010',
  status: 'completed',
  resident: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Costa',
  },
  collector: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Rafael Lima',
  },
  collectionPoint: {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Praça das Palmeiras',
  },
  materials: [{ type: 'paper', quantity: 1, unit: 'kg' }],
  scheduledAt: null,
  notes: null,
  pointsAwarded: 10,
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
}

describe('useCompleteCollection', () => {
  const completeMock = vi.mocked(completeCollection)

  beforeEach(() => completeMock.mockReset())
  afterEach(() => cleanup())

  it('returns completed collection and resets completing', async () => {
    completeMock.mockResolvedValue({ data: completedCollection })
    const { result } = renderHook(() => useCompleteCollection())
    let response:
      Awaited<ReturnType<typeof result.current.complete>> | undefined

    await act(async () => {
      response = await result.current.complete(completedCollection.id)
    })

    expect(response).toEqual({
      collection: completedCollection,
      errorCode: null,
    })
    expect(result.current.completing).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it.each([
    'COLLECTION_NOT_COMPLETABLE',
    'NO_ACTIVE_ASSIGNMENT',
    'ECOROTA_UNAVAILABLE',
  ] as const)('exposes mapped error %s', async (code) => {
    const error = new ApiError({
      code,
      message: 'backend error',
      requestId: 'test',
    })
    completeMock.mockResolvedValue({
      get data() {
        throw error
      },
    } as never)
    const { result } = renderHook(() => useCompleteCollection())

    let response:
      Awaited<ReturnType<typeof result.current.complete>> | undefined
    await act(async () => {
      response = await result.current.complete(completedCollection.id)
    })

    expect(response).toEqual({ collection: null, errorCode: code })
    expect(result.current.errorCode).toBe(code)
    expect(result.current.error).toBe(errorMessages[code])
    expect(result.current.completing).toBe(false)
  })
})
