import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance, FastifyRequest } from 'fastify'

import type { Environment } from '../config/env.js'
import {
  collectionListQuerySchema,
  createCollectionInputSchema,
  idParamsSchema,
  loginInputSchema,
  updateAvailabilityInputSchema,
} from '../contracts/index.js'
import type { EcoRotaGateway } from '../integrations/ecorota.js'
import { AuthService } from '../services/auth-service.js'
import { CollectionService } from '../services/coletaService.js'
import { CollectorService } from '../services/collector-service.js'
import { PointService } from '../services/pontosService.js'

export type ApiDependencies = {
  prisma: PrismaClient
  ecorota: EcoRotaGateway
  config: Environment
}

export function registerApiRoutes(app: FastifyInstance, deps: ApiDependencies): CollectionService {
  const auth = new AuthService(deps.prisma)
  const points = new PointService(deps.prisma)
  const collections = new CollectionService(deps.prisma, deps.ecorota, points)
  const collectors = new CollectorService(deps.prisma, deps.ecorota)
  const resident = (request: FastifyRequest) => auth.authenticate(request.headers.authorization, 'resident')
  const collector = (request: FastifyRequest) => auth.authenticate(request.headers.authorization, 'collector')

  app.post('/api/v1/auth/login', async (request) => ({
    data: await auth.login(loginInputSchema.parse(request.body)),
  }))

  app.get('/api/v1/auth/me', async (request) => ({
    data: await auth.authenticate(request.headers.authorization),
  }))

  app.get('/api/v1/collection-points', async (request) => {
    await auth.authenticate(request.headers.authorization)
    return { data: await points.list() }
  })

  app.get('/api/v1/collection-points/:id', async (request) => {
    await auth.authenticate(request.headers.authorization)
    const { id } = idParamsSchema.parse(request.params)
    return { data: await points.get(id) }
  })

  app.post('/api/v1/collections', async (request, reply) => {
    const user = await resident(request)
    const input = createCollectionInputSchema.parse(request.body)
    return reply.status(201).send({ data: await collections.create(user.id, input) })
  })

  app.get('/api/v1/collections', async (request) => {
    const user = await resident(request)
    const query = collectionListQuerySchema.parse(request.query)
    return collections.list(user.id, query)
  })

  app.get('/api/v1/collections/:id', async (request) => {
    const user = await resident(request)
    const { id } = idParamsSchema.parse(request.params)
    return { data: await collections.get(user.id, id) }
  })

  app.post('/api/v1/collections/:id/cancel', async (request) => {
    const user = await resident(request)
    const { id } = idParamsSchema.parse(request.params)
    return { data: await collections.cancel(user.id, id) }
  })

  app.patch('/api/v1/collectors/me/availability', async (request) => {
    const user = await collector(request)
    const { available } = updateAvailabilityInputSchema.parse(request.body)
    return { data: await collectors.setAvailability(user.id, available) }
  })

  app.get('/api/v1/collectors/me/assignment', async (request) => {
    const user = await collector(request)
    return { data: await collections.assignmentFor(user.id) }
  })

  app.post('/api/v1/collections/:id/complete', async (request) => {
    const user = await collector(request)
    const { id } = idParamsSchema.parse(request.params)
    return { data: await collections.complete(user.id, id) }
  })

  return collections
}
