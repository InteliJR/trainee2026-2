import { buildApp } from './app.js'
import { loadEnvironment } from './config/env.js'

const env = loadEnvironment()
const app = await buildApp({ config: env })

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'Encerrando o servidor')
  await app.close()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
