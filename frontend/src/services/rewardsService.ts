import type { RewardBalance, RewardTransactionListResponse } from '../types'
import type { DataResponse } from '../types/common'
import { get } from './api'
import { USE_MOCKS } from './config'
import { mockRewardTransactions } from './mocks/rewards'
import { mockCollections } from './mocks/collections'

export async function getRewardBalance(): Promise<DataResponse<RewardBalance>> {
  return USE_MOCKS
    ? {
        data: {
          balance: mockCollections.filter((item) => item.status === 'completed')
            .length,
          completedCollections: mockCollections.filter(
            (item) => item.status === 'completed',
          ).length,
        },
      }
    : get<DataResponse<RewardBalance>>('/rewards/balance')
}

export async function listRewardTransactions(query?: {
  cursor?: string
  limit?: number
}): Promise<RewardTransactionListResponse> {
  if (!USE_MOCKS) {
    const searchParams = new URLSearchParams()
    if (query?.cursor) searchParams.set('cursor', query.cursor)
    if (query?.limit !== undefined)
      searchParams.set('limit', String(query.limit))
    const suffix = searchParams.size ? `?${searchParams.toString()}` : ''
    return get<RewardTransactionListResponse>(`/rewards/transactions${suffix}`)
  }

  const start = Math.max(0, Number.parseInt(query?.cursor ?? '0', 10) || 0)
  const limit = query?.limit ?? 20
  const data = mockRewardTransactions.slice(start, start + limit)
  const nextIndex = start + data.length
  return {
    data,
    nextCursor:
      nextIndex < mockRewardTransactions.length ? String(nextIndex) : null,
  }
}
