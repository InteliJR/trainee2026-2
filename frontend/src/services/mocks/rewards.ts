import type { RewardBalance, RewardTransaction } from '../../types'

export const mockRewardBalance: RewardBalance = { balance: 85 }

export const mockRewardTransactions: RewardTransaction[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    collectionId: '40000000-0000-4000-8000-000000000005',
    kind: 'credit',
    amount: 15,
    reason: 'collection_completed',
    createdAt: '2026-09-25T11:00:00.000Z',
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    collectionId: null,
    kind: 'credit',
    amount: 70,
    reason: 'adjustment',
    createdAt: '2026-09-20T11:00:00.000Z',
  },
]
