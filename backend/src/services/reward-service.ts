import type { PrismaClient } from '@prisma/client'

import { AppError } from '../errors/app-error.js'

export type CollectionCreditResult = {
  awarded: boolean
  pointsAwarded: number
}

/** Records a credit chosen by the future scoring rule, at most once per collection. */
export class RewardService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(userId: string) {
    const [credits, debits, completedCollections] = await Promise.all([
      this.prisma.rewardTransaction.aggregate({
        where: { userId, kind: 'credit' }, _sum: { amount: true },
      }),
      this.prisma.rewardTransaction.aggregate({
        where: { userId, kind: 'debit' }, _sum: { amount: true },
      }),
      this.prisma.rewardTransaction.count({
        where: { userId, kind: 'credit', reason: 'collection_completed' },
      }),
    ])
    return {
      balance: Math.max(0, (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0)),
      completedCollections,
    }
  }

  async creditPendingCompletedCollections(): Promise<number> {
    const pending = await this.prisma.collection.findMany({
      where: { status: 'completed', pointsAwarded: null },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    })
    for (const collection of pending) {
      await this.creditCompletedCollectionOnce(collection.id, 1)
    }
    return pending.length
  }

  async creditCompletedCollectionOnce(
    collectionId: string,
    points: number,
  ): Promise<CollectionCreditResult> {
    if (!Number.isInteger(points) || points <= 0 || points > 2_147_483_647) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Points must be a positive 32-bit integer',
        statusCode: 400,
      })
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.collection.updateMany({
        where: { id: collectionId, status: 'completed', pointsAwarded: null },
        data: { pointsAwarded: points },
      })
      const collection = await tx.collection.findUnique({
        where: { id: collectionId },
        select: { residentId: true, pointsAwarded: true },
      })

      if (!collection) {
        throw new AppError({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Collection not found',
          statusCode: 404,
        })
      }

      if (claim.count === 0) {
        if (collection.pointsAwarded !== null) {
          return { awarded: false, pointsAwarded: collection.pointsAwarded }
        }
        throw new AppError({
          code: 'COLLECTION_NOT_COMPLETABLE',
          message: 'Only completed collections can receive points',
          statusCode: 409,
        })
      }

      await tx.rewardTransaction.create({
        data: {
          userId: collection.residentId,
          collectionId,
          kind: 'credit',
          reason: 'collection_completed',
          amount: points,
        },
      })
      return { awarded: true, pointsAwarded: points }
    })
  }
}
