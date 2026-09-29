import type { PrismaClient } from '@prisma/client'

import { collectionPointSchema } from '../contracts/collection-points.js'
import { AppError } from '../errors/app-error.js'

export class PointService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    const points = await this.prisma.collectionPoint.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
    return points.map((point) => collectionPointSchema.parse({
      id: point.id,
      name: point.name,
      kind: point.kind,
      coordinates: [point.longitude, point.latitude],
    }))
  }

  async get(id: string) {
    const point = await this.prisma.collectionPoint.findFirst({ where: { id, active: true } })
    if (!point) {
      throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Collection point not found', statusCode: 404 })
    }
    return collectionPointSchema.parse({
      id: point.id,
      name: point.name,
      kind: point.kind,
      coordinates: [point.longitude, point.latitude],
    })
  }
}
