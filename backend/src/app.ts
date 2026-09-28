import cors from '@fastify/cors'
import type { PrismaClient } from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'

import { loadEnvironment, type Environment } from './config/env.js'
import { createPrisma } from './config/prisma.js'
import { registerErrorHandlers } from './errors/error-handler.js'
import { unavailableEcoRotaGateway, type EcoRotaGateway } from './integrations/ecorota.js'
import { registerApiRoutes } from './routes/api.js'

export type BuildAppOptions = {
  config?: Environment
  logger?: boolean
  prisma?: PrismaClient
  ecorota?: EcoRotaGateway
  schedulerIntervalMs?: number
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadEnvironment()
  if (config.AUTH_MODE !== 'mock') {
    throw new Error('AUTH_MODE=jwt is not implemented')
  }
  const loggerEnabled = options.logger ?? config.NODE_ENV !== 'test'
  const app = Fastify({
    logger: loggerEnabled ? { level: config.LOG_LEVEL } : false,
  })

  await app.register(cors, { origin: config.CORS_ORIGIN })
  registerErrorHandlers(app)

  const prisma = options.prisma ?? createPrisma(config)
  const ecorota = options.ecorota ?? unavailableEcoRotaGateway
  const collections = registerApiRoutes(app, { prisma, ecorota, config })

  if (!options.prisma) {
    app.addHook('onClose', async () => prisma.$disconnect())
  }

  if (config.NODE_ENV !== 'test') {
    const timer = setInterval(() => {
      void collections.processDue().catch((error: unknown) => {
        app.log.error({ err: error }, 'Scheduled collection dispatch failed')
      })
    }, options.schedulerIntervalMs ?? 5_000)
    timer.unref()
    app.addHook('onClose', async () => clearInterval(timer))
  }

  app.get('/health', async () => ({
    status: 'ok',
    service: 'ecorota-backend',
  }))

  return app
}
