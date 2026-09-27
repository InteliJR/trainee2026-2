import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import type { Environment } from './env.js'

export function createPrisma(config: Environment): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
  })
}
