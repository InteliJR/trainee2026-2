import type {
  Collection,
  CollectionListQuery,
  CollectionListResponse,
  CreateCollectionInput,
} from '../types'
import type { DataResponse } from '../types/common'
import { get, post } from './api'
import { ApiError } from './api-error'
import { USE_MOCKS } from './config'
import { mockUser } from './mocks/auth'
import { mockCollectionPoints } from './mocks/collection-points'
import { mockCollections } from './mocks/collections'

function findMockCollection(id: string): Collection {
  const collection = mockCollections.find((item) => item.id === id)
  if (!collection) {
    throw new ApiError({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Collection not found',
      requestId: 'mock',
    })
  }
  return collection
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<DataResponse<Collection>> {
  if (!USE_MOCKS) return post<DataResponse<Collection>>('/collections', input)

  const point = mockCollectionPoints.find(
    ({ id }) => id === input.collectionPointId,
  )
  if (!point) {
    throw new ApiError({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Collection point not found',
      requestId: 'mock',
    })
  }

  const now = new Date().toISOString()
  const collection: Collection = {
    id: crypto.randomUUID(),
    status: input.scheduledAt ? 'scheduled' : 'pending',
    resident: { id: mockUser.id, name: mockUser.name },
    collector: null,
    collectionPoint: { id: point.id, name: point.name },
    materials: input.materials,
    scheduledAt: input.scheduledAt ?? null,
    notes: input.notes ?? null,
    pointsAwarded: null,
    createdAt: now,
    updatedAt: now,
  }
  mockCollections.unshift(collection)
  return { data: collection }
}

export async function listCollections(
  query?: Partial<CollectionListQuery>,
): Promise<CollectionListResponse> {
  if (!USE_MOCKS) {
    const searchParams = new URLSearchParams()
    if (query?.cursor) searchParams.set('cursor', query.cursor)
    if (query?.limit !== undefined)
      searchParams.set('limit', String(query.limit))
    if (query?.status) searchParams.set('status', query.status)
    const suffix = searchParams.size ? `?${searchParams.toString()}` : ''
    return get<CollectionListResponse>(`/collections${suffix}`)
  }

  const matching = query?.status
    ? mockCollections.filter(({ status }) => status === query.status)
    : mockCollections
  const start = Math.max(0, Number.parseInt(query?.cursor ?? '0', 10) || 0)
  const limit = query?.limit ?? 20
  const data = matching.slice(start, start + limit)
  const nextIndex = start + data.length
  return {
    data,
    nextCursor: nextIndex < matching.length ? String(nextIndex) : null,
  }
}

export async function getCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  return USE_MOCKS
    ? { data: findMockCollection(id) }
    : get<DataResponse<Collection>>(`/collections/${encodeURIComponent(id)}`)
}

export async function cancelCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  if (!USE_MOCKS) {
    return post<DataResponse<Collection>>(
      `/collections/${encodeURIComponent(id)}/cancel`,
    )
  }
  const collection = findMockCollection(id)
  collection.status = 'cancelled'
  collection.updatedAt = new Date().toISOString()
  return { data: collection }
}

export async function completeCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  if (!USE_MOCKS) {
    return post<DataResponse<Collection>>(
      `/collections/${encodeURIComponent(id)}/complete`,
    )
  }
  const collection = findMockCollection(id)
  collection.status = 'completed'
  collection.pointsAwarded = collection.pointsAwarded ?? 15
  collection.updatedAt = new Date().toISOString()
  return { data: collection }
}
