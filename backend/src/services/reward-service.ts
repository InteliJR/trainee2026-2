import type { PrismaClient } from '@prisma/client'

import { AppError } from '../errors/app-error.js'

export type CollectionCreditResult = {
  awarded: boolean
  pointsAwarded: number
}

/** Records a credit chosen by the future scoring rule, at most once per collection. */
export class RewardService {
  constructor(private readonly prisma: PrismaClient) {}

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
