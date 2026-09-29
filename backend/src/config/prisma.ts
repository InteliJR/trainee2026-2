import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { fileURLToPath } from 'node:url'

import type { Environment } from './env.js'

export function createPrisma(config: Environment): PrismaClient {
  const databaseUrl = new URL(config.DATABASE_URL)

  if (databaseUrl.hostname.endsWith('.pooler.supabase.com') && !databaseUrl.searchParams.has('sslrootcert')) {
    const rootCertificate = fileURLToPath(new URL('../../certs/supabase-root-2021.crt', import.meta.url))
    databaseUrl.searchParams.set('sslmode', 'verify-full')
    databaseUrl.searchParams.set('sslrootcert', rootCertificate)
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl.toString() }),
  })
}
