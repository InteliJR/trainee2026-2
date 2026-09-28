import type { PrismaClient } from '@prisma/client'

import { collectorSchema, type Collector } from '../contracts/collectors.js'
import { AppError } from '../errors/app-error.js'
import type { EcoRotaGateway } from '../integrations/ecorota.js'

export class CollectorService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ecorota: EcoRotaGateway,
  ) {}

  async setAvailability(userId: string, available: boolean): Promise<Collector> {
    const collector = await this.prisma.collector.findUnique({
      where: { userId },
      include: { user: true },
    })
    if (!collector?.ecorotaCollectorId) {
      throw new AppError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Collector is not registered in EcoRota',
        statusCode: 404,
      })
    }
    const remote = await this.ecorota.updateCollector(collector.ecorotaCollectorId, { available })
    // The public id is the user id, matching `collection.collector.id`.
    return collectorSchema.parse({
      id: userId,
      name: collector.user.name,
      available: remote.available,
      status: remote.status,
    })
  }

  /**
   * Registers the user's custom collector in EcoRota, or links one created
   * elsewhere (e.g. Swagger). Idempotent: an existing link is returned as is.
   */
  async provision(userId: string, options: { linkEcoRotaId?: string } = {}) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'collector') {
      throw new Error('User must exist and have the collector role')
    }
    const collector = await this.prisma.collector.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
    if (collector.ecorotaCollectorId) {
      return { ecorotaCollectorId: collector.ecorotaCollectorId, created: false }
    }

    if (options.linkEcoRotaId) {
      const remote = (await this.ecorota.listCollectors()).find(
        (item) => item.id === options.linkEcoRotaId,
      )
      if (!remote || remote.origin !== 'custom') {
        throw new Error('EcoRota custom collector not found')
      }
      await this.prisma.collector.update({
        where: { id: collector.id },
        data: { ecorotaCollectorId: remote.id },
      })
      return { ecorotaCollectorId: remote.id, created: false }
    }

    const environment = await this.ecorota.getEnvironment()
    if (environment.occupiedSlots >= environment.maxCollectors) {
      throw new Error(
        `EcoRota has no free collector slot (${environment.occupiedSlots}/${environment.maxCollectors})`,
      )
    }
    const remote = await this.ecorota.createCollector({ name: user.name })
    try {
      await this.prisma.collector.update({
        where: { id: collector.id },
        data: { ecorotaCollectorId: remote.id },
      })
    } catch (error) {
      // The slot is already taken upstream; surface the id so it can be linked.
      throw new Error(`Created EcoRota collector ${remote.id} but could not save it; link it manually`, {
        cause: error,
      })
    }
    return { ecorotaCollectorId: remote.id, created: true }
  }
}
