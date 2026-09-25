import { z } from 'zod'

import {
  cursorQuerySchema,
  dataResponseSchema,
  isoDateTimeSchema,
  paginatedResponseSchema,
  uuidSchema,
} from './common.js'

export const rewardBalanceSchema = z
  .object({
    balance: z.number().int().nonnegative(),
  })
  .strict()

export const rewardTransactionKindSchema = z.enum(['credit', 'debit'])
export const rewardTransactionReasonSchema = z.enum([
  'collection_completed',
  'reward_redeemed',
  'adjustment',
])

export const rewardTransactionSchema = z
  .object({
    id: uuidSchema,
    collectionId: uuidSchema.nullable(),
    kind: rewardTransactionKindSchema,
    amount: z.number().int().positive(),
    reason: rewardTransactionReasonSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict()

export const rewardBalanceResponseSchema = dataResponseSchema(rewardBalanceSchema)
export const rewardTransactionQuerySchema = cursorQuerySchema
export const rewardTransactionListResponseSchema =
  paginatedResponseSchema(rewardTransactionSchema)

export type RewardBalance = z.infer<typeof rewardBalanceSchema>
export type RewardTransaction = z.infer<typeof rewardTransactionSchema>
