import type { PrismaClient } from '@prisma/client'

import { EcoRotaRejectedError } from '../integrations/ecorota-client.js'
import { RewardService } from './reward-service.js'
import type {
  EcoRotaCollector,
  EcoRotaGateway,
  EcoRotaPoint,
  EcoRotaRequest,
} from '../integrations/ecorota.js'

type Logger = {
  info(details: object, message: string): void
  warn(details: object, message: string): void
}

export type SyncResult = {
  points: number
  collectorsUnlinked: number
  collectionsUpdated: number
  collectionsRecovered: number
  collectionsLost: number
}

const ACTIVE_STATUSES = ['pending', 'assigned', 'in_service'] as const
// Requests missing from the snapshot are checked one by one; the cap keeps a
// single tick far below the 300 calls/minute limit.
const MAX_LOOKUPS_PER_TICK = 5

/** Maps an EcoRota collector id to the local custom collector, if any. */
export async function localCollectorId(
  prisma: PrismaClient,
  remoteCollectorId: string | null,
): Promise<string | null> {
  if (!remoteCollectorId) return null
  const collector = await prisma.collector.findUnique({
    where: { ecorotaCollectorId: remoteCollectorId },
    select: { id: true },
  })
  return collector?.id ?? null
}

/**
 * Polling strategy: one GET /v1/snapshot per tick keeps points, collector
 * links and collection statuses in the local database, so the front-ends
 * only read local data and never depend on how EcoRota is observed.
 */
export class EcoRotaSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ecorota: EcoRotaGateway,
    private readonly logger?: Logger,
  ) {}

  async syncOnce(): Promise<SyncResult> {
    const snapshot = await this.ecorota.getSnapshot()
    const points = await this.syncPoints(snapshot.points)
    const collectorsUnlinked = await this.syncCollectors(snapshot.collectors)
    const requests = await this.syncRequests(snapshot.requests)
    await new RewardService(this.prisma).creditPendingCompletedCollections()
    return { points, collectorsUnlinked, ...requests }
  }

  async syncPoints(points: EcoRotaPoint[]): Promise<number> {
    const existing = new Map(
      (await this.prisma.collectionPoint.findMany()).map((point) => [point.id, point]),
    )
    let changed = 0
    for (const point of points) {
      const [longitude, latitude] = point.coordinates
      const current = existing.get(point.id)
      if (current && current.name === point.name && current.kind === point.kind && current.active &&
          current.longitude === longitude && current.latitude === latitude) continue
      const data = { name: point.name, kind: point.kind, longitude, latitude, active: true }
      await this.prisma.collectionPoint.upsert({
        where: { id: point.id },
        update: data,
        create: { id: point.id, ...data },
      })
      changed++
    }
    // Keep historical point records, but do not offer absent points for new requests.
    await this.prisma.collectionPoint.updateMany({
      where: { id: { notIn: points.map((point) => point.id) }, active: true },
      data: { active: false },
    })
    return changed
  }

  /** Unlinks local collectors whose custom collector no longer exists upstream. */
  async syncCollectors(collectors: EcoRotaCollector[]): Promise<number> {
    const remoteIds = collectors.map((collector) => collector.id)
    const stale = await this.prisma.collector.findMany({
      where: { ecorotaCollectorId: { not: null, notIn: remoteIds } },
      select: { id: true, ecorotaCollectorId: true },
    })
    for (const collector of stale) {
      this.logger?.warn(
        { collectorId: collector.id, ecorotaCollectorId: collector.ecorotaCollectorId },
        'EcoRota collector no longer exists; provision it again',
      )
    }
    if (!stale.length) return 0
    const result = await this.prisma.collector.updateMany({
      where: { id: { in: stale.map((collector) => collector.id) } },
      data: { ecorotaCollectorId: null },
    })
    return result.count
  }

  async syncRequests(requests: EcoRotaRequest[]) {
    const byId = new Map(requests.map((request) => [request.id, request]))
    const byReference = new Map(requests.map((request) => [request.externalReference, request]))
    let collectionsUpdated = 0
    let collectionsRecovered = 0
    let collectionsLost = 0

    const active = await this.prisma.collection.findMany({
      where: { ecorotaRequestId: { not: null }, status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true, status: true, collectorId: true, ecorotaRequestId: true },
    })
    const missing: typeof active = []
    for (const row of active) {
      const remote = byId.get(row.ecorotaRequestId!)
      if (!remote) {
        missing.push(row)
        continue
      }
      if (await this.apply(row, remote)) collectionsUpdated++
    }

    for (const row of missing.slice(0, MAX_LOOKUPS_PER_TICK)) {
      try {
        const remote = await this.ecorota.getRequest(row.ecorotaRequestId!)
        if (await this.apply(row, remote)) collectionsUpdated++
      } catch (error) {
        if (!(error instanceof EcoRotaRejectedError && error.upstreamStatus === 404)) throw error
        // The scenario was reset. EcoRota asks platforms not to resend old
        // requests automatically, so the collection is closed locally.
        const lost = await this.prisma.collection.updateMany({
          where: { id: row.id, status: row.status },
          data: {
            status: 'cancelled',
            integrationError: 'Request no longer exists in EcoRota (scenario reset)',
            lastSyncedAt: new Date(),
          },
        })
        if (lost.count) {
          collectionsLost++
          this.logger?.warn({ collectionId: row.id }, 'EcoRota request disappeared; collection cancelled')
        }
      }
    }

    // An earlier dispatch may have reached EcoRota even though the local write
    // failed; the stable reference links it back without resending.
    const unlinked = await this.prisma.collection.findMany({
      where: { ecorotaRequestId: null, status: { in: ['scheduled', 'integration_failed'] } },
      select: { id: true, externalReference: true, collectionPointId: true },
    })
    for (const row of unlinked) {
      const remote = byReference.get(row.externalReference)
      if (!remote || remote.pointId !== row.collectionPointId) continue
      const recovered = await this.prisma.collection.updateMany({
        where: { id: row.id, ecorotaRequestId: null, status: { in: ['scheduled', 'integration_failed'] } },
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
      collectionsRecovered += recovered.count
    }

    return { collectionsUpdated, collectionsRecovered, collectionsLost }
  }

  private async apply(
    row: { id: string; status: string; collectorId: string | null },
    remote: EcoRotaRequest,
  ): Promise<boolean> {
    const collectorId = await localCollectorId(this.prisma, remote.collectorId)
    if (row.status === remote.status && row.collectorId === collectorId) return false
    // Guarded by the status read above so a concurrent cancel is not overwritten.
    const result = await this.prisma.collection.updateMany({
      where: { id: row.id, status: row.status as (typeof ACTIVE_STATUSES)[number] },
      data: { status: remote.status, collectorId, lastSyncedAt: new Date() },
    })
    return result.count > 0
  }
}
