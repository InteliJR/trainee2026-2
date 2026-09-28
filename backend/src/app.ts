import cors from '@fastify/cors'
import type { PrismaClient } from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'

import { loadEnvironment, type Environment } from './config/env.js'
import { createPrisma } from './config/prisma.js'
import { registerErrorHandlers } from './errors/error-handler.js'
import { unavailableEcoRotaGateway, type EcoRotaGateway } from './integrations/ecorota.js'
import { EcoRotaHttpClient } from './integrations/ecorota-client.js'
import { registerApiRoutes } from './routes/api.js'
import { EcoRotaSyncService } from './services/ecorota-sync-service.js'

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
  // The credential stays in the backend: only this client ever reads it.
  const ecorota = options.ecorota ?? (config.ECOROTA_API_TOKEN
    ? new EcoRotaHttpClient({
      baseUrl: config.ECOROTA_API_URL,
      token: config.ECOROTA_API_TOKEN,
      timeoutMs: config.ECOROTA_TIMEOUT_MS,
      logger: app.log,
    })
    : unavailableEcoRotaGateway)
  const collections = registerApiRoutes(app, { prisma, ecorota, config })
  const sync = new EcoRotaSyncService(prisma, ecorota, app.log)

  if (!options.prisma) {
    app.addHook('onClose', async () => prisma.$disconnect())
  }

  if (config.NODE_ENV !== 'test') {
    const syncEnabled = ecorota !== unavailableEcoRotaGateway
    if (!syncEnabled) app.log.warn('ECOROTA_API_TOKEN is not set; EcoRota sync is disabled')

    // One tick at a time: a slow EcoRota must not stack overlapping ticks.
    let running = false
    const tick = async () => {
      if (running) return
      running = true
      try {
        if (syncEnabled) {
          await sync.syncOnce().catch((error: unknown) => {
            app.log.error({ err: error }, 'EcoRota sync failed')
          })
        }
        await collections.processDue().catch((error: unknown) => {
          app.log.error({ err: error }, 'Scheduled collection dispatch failed')
        })
      } finally {
        running = false
      }
    }
    const timer = setInterval(() => void tick(), options.schedulerIntervalMs ?? 5_000)
    timer.unref()
    app.addHook('onReady', async () => void tick())
    app.addHook('onClose', async () => clearInterval(timer))
  }

  app.get('/health', async () => ({
    status: 'ok',
    service: 'ecorota-backend',
  }))

  return app
}
