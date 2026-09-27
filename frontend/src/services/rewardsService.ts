import type { RewardBalance, RewardTransactionListResponse } from '../types'
import type { DataResponse } from '../types/common'

export async function getRewardBalance(): Promise<DataResponse<RewardBalance>> {
  throw new Error('not implemented')
}

export async function listRewardTransactions(query?: {
  cursor?: string
  limit?: number
}): Promise<RewardTransactionListResponse> {
  void query
  throw new Error('not implemented')
}
