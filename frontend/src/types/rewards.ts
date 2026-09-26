// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
import type { PaginatedResponse } from './common'

export type RewardBalance = {
  balance: number
}

export type RewardTransactionKind = 'credit' | 'debit'
export type RewardTransactionReason =
  'collection_completed' | 'reward_redeemed' | 'adjustment'

export type RewardTransaction = {
  id: string
  collectionId: string | null
  kind: RewardTransactionKind
  amount: number
  reason: RewardTransactionReason
  createdAt: string
}

export type RewardTransactionListResponse = PaginatedResponse<RewardTransaction>
