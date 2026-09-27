import type { CollectionPoint } from '../types'
import type { DataResponse } from '../types/common'
import { get } from './api'
import { USE_MOCKS } from './config'
import { mockCollectionPoints } from './mocks/collection-points'
import { ApiError } from './api-error'

export async function listCollectionPoints(): Promise<
  DataResponse<CollectionPoint[]>
> {
  return USE_MOCKS
    ? { data: mockCollectionPoints }
    : get<DataResponse<CollectionPoint[]>>('/collection-points')
}

export async function getCollectionPoint(
  id: string,
): Promise<DataResponse<CollectionPoint>> {
  if (USE_MOCKS) {
    const collectionPoint = mockCollectionPoints.find(
      (point) => point.id === id,
    )
    if (!collectionPoint) {
      throw new ApiError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Collection point not found',
        requestId: 'mock',
      })
    }
    return { data: collectionPoint }
  }

  return get<DataResponse<CollectionPoint>>(
    `/collection-points/${encodeURIComponent(id)}`,
  )
}
