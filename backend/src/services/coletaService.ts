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
        integrationError: null,
        dispatchLockedAt: null,
        nextAttemptAt: null,
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

    if (!scheduledAt) await this.dispatch(id)
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
      await this.prisma.collection.update({
        where: { id },
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
    await this.applyRemote(id, remote)
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

    let current = record
    if (!['scheduled', 'integration_failed', 'pending', 'assigned'].includes(current.status)) {
      throw new AppError({
        code: 'COLLECTION_NOT_CANCELLABLE',
        message: 'Collection cannot be cancelled in its current state',
        statusCode: 409,
      })
    }

    if (!current.ecorotaRequestId && current.status === 'integration_failed') {
      if (current.dispatchLockedAt &&
          current.dispatchLockedAt.getTime() > Date.now() - 60_000) {
        throw new AppError({
          code: 'COLLECTION_NOT_CANCELLABLE',
          message: 'Collection is being sent to EcoRota; retry shortly',
          statusCode: 409,
        })
      }
      // Re-send the unique reference to learn whether an earlier attempt succeeded.
      const recovered = await this.ecorota.createRequest({
        pointId: current.collectionPointId,
        externalReference: current.externalReference,
      })
      current = await this.applyRemote(id, recovered)
      if (!['pending', 'assigned'].includes(current.status)) {
        throw new AppError({
          code: 'COLLECTION_NOT_CANCELLABLE',
          message: 'Collection cannot be cancelled in its current state',
          statusCode: 409,
        })
      }
    }

    if (!current.ecorotaRequestId) {
      const result = await this.prisma.collection.updateMany({
        where: { id, residentId, ecorotaRequestId: null, status: 'scheduled', dispatchLockedAt: null },
        data: { status: 'cancelled' },
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

    const remote = await this.ecorota.cancelRequest(current.ecorotaRequestId)
    return publicCollection(await this.applyRemote(id, remote))
  }
}
