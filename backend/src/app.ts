import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { loadEnvironment, type Environment } from './config/env.js'
import { registerErrorHandlers } from './errors/error-handler.js'

export type BuildAppOptions = {
  config?: Environment
  logger?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadEnvironment()
  const loggerEnabled = options.logger ?? config.NODE_ENV !== 'test'
  const app = Fastify({
    logger: loggerEnabled ? { level: config.LOG_LEVEL } : false,
  })

  await app.register(cors, { origin: config.CORS_ORIGIN })
  registerErrorHandlers(app)
  app.get('/health', async () => ({
    status: 'ok',
    service: 'ecorota-backend',
  }))

  return app
}
