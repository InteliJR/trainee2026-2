import type { CollectionPoint } from '../types'
import type { DataResponse } from '../types/common'

export async function listCollectionPoints(): Promise<
  DataResponse<CollectionPoint[]>
> {
  throw new Error('not implemented')
}

export async function getCollectionPoint(
  id: string,
): Promise<DataResponse<CollectionPoint>> {
  void id
  throw new Error('not implemented')
}
