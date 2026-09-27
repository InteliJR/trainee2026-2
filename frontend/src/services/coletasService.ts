import type {
  Collection,
  CollectionListQuery,
  CollectionListResponse,
  CreateCollectionInput,
} from '../types'
import type { DataResponse } from '../types/common'

export async function createCollection(
  input: CreateCollectionInput,
): Promise<DataResponse<Collection>> {
  void input
  throw new Error('not implemented')
}

export async function listCollections(
  query?: Partial<CollectionListQuery>,
): Promise<CollectionListResponse> {
  void query
  throw new Error('not implemented')
}

export async function getCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  void id
  throw new Error('not implemented')
}

export async function cancelCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  void id
  throw new Error('not implemented')
}

export async function completeCollection(
  id: string,
): Promise<DataResponse<Collection>> {
  void id
  throw new Error('not implemented')
}
