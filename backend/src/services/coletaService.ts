import { randomUUID } from 'node:crypto'

import { Prisma, type PrismaClient } from '@prisma/client'

import {
  collectionSchema,
  type Collection,
  type CollectionListQuery,
  type CreateCollectionInput,
} from '../contracts/collections.js'
import { AppError } from '../errors/app-error.js'
import type { EcoRotaGateway, EcoRotaRequest } from '../integrations/ecorota.js'
import { EcoRotaRejectedError } from '../integrations/ecorota-client.js'
import { localCollectorId } from './ecorota-sync-service.js'
import { PointService } from './pontosService.js'

const collectionInclude = {
  resident: true,
  collector: { include: { user: true } },
  collectionPoint: true,
  materials: true,
} satisfies Prisma.CollectionInclude

type CollectionRecord = Prisma.CollectionGetPayload<{ include: typeof collectionInclude }>

function publicCollection(record: CollectionRecord): Collection {
  return collectionSchema.parse({
    id: record.id,
    status: record.status,
    resident: { id: record.resident.id, name: record.resident.name },
    collector: record.collector
      ? { id: record.collector.user.id, name: record.collector.user.name }
      : null,
    collectionPoint: { id: record.collectionPoint.id, name: record.collectionPoint.name },
    materials: record.materials.map((material) => ({
      type: material.type,
      quantity: material.quantity.toNumber(),
      unit: material.unit,
      ...(material.description ? { description: material.description } : {}),
    })),
    scheduledAt: record.scheduledAt?.toISOString() ?? null,
    notes: record.notes,
    pointsAwarded: record.pointsAwarded,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  })
}

function encodeCursor(record: CollectionRecord): string {
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt.toISOString(), id: record.id }))
    .toString('base64url')
}

function decodeCursor(value: string): { createdAt: Date; id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString())
    if (
      typeof parsed !== 'object' || parsed === null ||
      !('createdAt' in parsed) || typeof parsed.createdAt !== 'string' ||
      !('id' in parsed) || typeof parsed.id !== 'string'
    ) throw new Error('Invalid cursor')
    const createdAt = new Date(parsed.createdAt)
    if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(parsed.id)) {
      throw new Error('Invalid cursor')
    }
    return { createdAt, id: parsed.id }
  } catch {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid cursor', statusCode: 400 })
  }
}

export class CollectionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ecorota: EcoRotaGateway,
    private readonly points: PointService,
  ) {}

  private record(id: string) {
    return this.prisma.collection.findUniqueOrThrow({ where: { id }, include: collectionInclude })
  }

  private async applyRemote(id: string, remote: EcoRotaRequest): Promise<CollectionRecord> {
    await this.prisma.collection.update({
      where: { id },
      data: {
        ecorotaRequestId: remote.id,
        status: remote.status,
        collectorId: await localCollectorId(this.prisma, remote.collectorId),
        integrationError: null,
        dispatchLockedAt: null,
        nextAttemptAt: null,
        lastSyncedAt: new Date(),
      },
    })
    return this.record(id)
  }

  async create(residentId: string, input: CreateCollectionInput): Promise<Collection> {
    const point = await this.points.get(input.collectionPointId)
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      throw new AppError({ code: 'INVALID_SCHEDULE', message: 'scheduledAt must be in the future', statusCode: 400 })
    }

    const id = randomUUID()
    await this.prisma.collection.create({
      data: {
        id,
        residentId,
        collectionPointId: point.id,
        externalReference: `collection:${id}`,
        status: scheduledAt ? 'scheduled' : 'integration_failed',
        scheduledAt,
        notes: input.notes ?? null,
        materials: { create: input.materials.map((item) => ({
          type: item.type,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          description: item.description ?? null,
        })) },
      },
    })

    if (!scheduledAt) {
      try {
        await this.dispatch(id)
      } catch {
        // The collection is already persisted. A dispatch write may fail after
        // EcoRota accepts it; the locked row can be retried with its reference.
      }
    }
    return publicCollection(await this.record(id))
  }

  async dispatch(id: string): Promise<void> {
    const now = new Date()
    const claimed = await this.prisma.collection.updateMany({
      where: {
        id,
        status: { in: ['scheduled', 'integration_failed'] },
        OR: [{ dispatchLockedAt: null }, { dispatchLockedAt: { lt: new Date(now.getTime() - 60_000) } }],
        AND: [
          { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
          { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        ],
      },
      data: { dispatchLockedAt: now },
    })
    if (claimed.count === 0) return

    const record = await this.record(id)
    let remote: EcoRotaRequest
    try {
      remote = await this.ecorota.createRequest({
        pointId: record.collectionPointId,
        externalReference: record.externalReference,
      })
      if (remote.pointId !== record.collectionPointId ||
          remote.externalReference !== record.externalReference) {
        throw new Error('EcoRota returned a different request')
      }
    } catch (error) {
      await this.prisma.collection.updateMany({
        where: { id, dispatchLockedAt: now, status: { in: ['scheduled', 'integration_failed'] } },
        data: {
          status: 'integration_failed',
          integrationError: error instanceof Error ? error.message : 'Unknown EcoRota error',
          dispatchLockedAt: null,
          nextAttemptAt: new Date(now.getTime() + 60_000),
        },
      })
      return
    }

    // If persistence fails after EcoRota accepted the request, keep the lock.
    // A retry with the same reference recovers the existing upstream request.
    await this.prisma.collection.updateMany({
      where: { id, dispatchLockedAt: now, status: { in: ['scheduled', 'integration_failed'] } },
      data: {
        ecorotaRequestId: remote.id,
        status: remote.status,
        collectorId: await localCollectorId(this.prisma, remote.collectorId),
        integrationError: null,
        dispatchLockedAt: null,
        nextAttemptAt: null,
        lastSyncedAt: new Date(),
      },
    })
  }

  async processDue(): Promise<number> {
    const now = new Date()
    const rows = await this.prisma.collection.findMany({
      where: {
        status: { in: ['scheduled', 'integration_failed'] },
        OR: [{ dispatchLockedAt: null }, { dispatchLockedAt: { lt: new Date(now.getTime() - 60_000) } }],
        AND: [
          { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
          { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { id: true },
    })
    await Promise.all(rows.map((row) => this.dispatch(row.id)))
    return rows.length
  }

  async get(residentId: string, id: string): Promise<Collection> {
    const record = await this.prisma.collection.findFirst({
      where: { id, residentId },
      include: collectionInclude,
    })
    if (!record) {
      throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Collection not found', statusCode: 404 })
    }
    return publicCollection(record)
  }

  async list(residentId: string, query: CollectionListQuery) {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null
    const records = await this.prisma.collection.findMany({
      where: {
        residentId,
        ...(query.status ? { status: query.status } : {}),
        ...(cursor ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      include: collectionInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    })
    const page = records.slice(0, query.limit)
    return {
      data: page.map(publicCollection),
      nextCursor: records.length > query.limit && page.length
        ? encodeCursor(page[page.length - 1]!)
        : null,
    }
  }

  async cancel(residentId: string, id: string): Promise<Collection> {
    const record = await this.prisma.collection.findFirst({
      where: { id, residentId },
      include: collectionInclude,
    })
    if (!record) {
      throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Collection not found', statusCode: 404 })
    }

    if (!['scheduled', 'integration_failed', 'pending', 'assigned'].includes(record.status)) {
      throw new AppError({
        code: 'COLLECTION_NOT_CANCELLABLE',
        message: 'Collection cannot be cancelled in its current state',
        statusCode: 409,
      })
    }

    if (!record.ecorotaRequestId) {
      const now = new Date()
      const result = await this.prisma.collection.updateMany({
        where: {
          id,
          residentId,
          ecorotaRequestId: null,
          status: { in: ['scheduled', 'integration_failed'] },
          OR: [
            { dispatchLockedAt: null },
            { dispatchLockedAt: { lt: new Date(now.getTime() - 60_000) } },
          ],
        },
        data: { status: 'cancelled', dispatchLockedAt: null, nextAttemptAt: null },
      })
      if (!result.count) {
        throw new AppError({
          code: 'COLLECTION_NOT_CANCELLABLE',
          message: 'Collection is being sent to EcoRota; retry shortly',
          statusCode: 409,
        })
      }
      return publicCollection(await this.record(id))
    }

    let remote: EcoRotaRequest
    try {
      remote = await this.ecorota.cancelRequest(record.ecorotaRequestId)
    } catch (error) {
      // EcoRota refuses once service started; the sync brings the new status.
      if (error instanceof EcoRotaRejectedError && error.upstreamStatus === 409) {
        throw new AppError({
          code: 'COLLECTION_NOT_CANCELLABLE',
          message: 'Collection cannot be cancelled in its current state',
          statusCode: 409,
          details: { upstreamCode: error.upstreamCode },
        })
      }
      throw error
    }
    return publicCollection(await this.applyRemote(id, remote))
  }

  /** Current job of a custom collector, read from the synced local state. */
  async assignmentFor(collectorUserId: string): Promise<Collection | null> {
    const record = await this.prisma.collection.findFirst({
      where: { collector: { userId: collectorUserId }, status: { in: ['assigned', 'in_service'] } },
      include: collectionInclude,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    })
    return record ? publicCollection(record) : null
  }

  async complete(collectorUserId: string, id: string): Promise<Collection> {
    const record = await this.prisma.collection.findUnique({ where: { id }, include: collectionInclude })
    if (!record) {
      throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Collection not found', statusCode: 404 })
    }
    if (record.collector?.userId !== collectorUserId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Collection is not assigned to this collector',
        statusCode: 403,
      })
    }
    // Local status may lag the 5 s sync, so an `assigned` job is still sent and
    // EcoRota decides whether the collector has arrived.
    if (!record.ecorotaRequestId || !['assigned', 'in_service'].includes(record.status)) {
      throw new AppError({
        code: 'COLLECTION_NOT_COMPLETABLE',
        message: 'Collection cannot be completed in its current state',
        statusCode: 409,
        details: { status: record.status },
      })
    }

    let remote: EcoRotaRequest
    try {
      remote = await this.ecorota.completeRequest(record.ecorotaRequestId)
    } catch (error) {
      if (error instanceof EcoRotaRejectedError && [404, 409].includes(error.upstreamStatus)) {
        throw new AppError({
          code: 'COLLECTION_NOT_COMPLETABLE',
          message: 'EcoRota did not accept the confirmation; the collector may not have arrived yet',
          statusCode: 409,
          details: { status: record.status, upstreamCode: error.upstreamCode },
        })
      }
      throw error
    }
    return publicCollection(await this.applyRemote(id, remote))
  }
}
