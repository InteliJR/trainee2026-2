// Registers the custom collector of a collector account in EcoRota, or links
// one created elsewhere. Uses one of the environment's two custom slots.
//
//   npm run ecorota:provision-collector -- demo-collector@ecorota.local
//   npm run ecorota:provision-collector -- demo-collector@ecorota.local --link <ecorota-id>
import { parseArgs } from 'node:util'

import { loadEnvironment } from '../config/env.js'
import { createPrisma } from '../config/prisma.js'
import { CollectorService } from '../services/collector-service.js'
import { clientFromEnvironment } from './ecorota-client.js'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { link: { type: 'string' } },
})
const email = positionals[0]?.toLowerCase()
if (!email) throw new Error('Usage: npm run ecorota:provision-collector -- <email> [--link <ecorota-id>]')

const config = loadEnvironment()
const ecorota = clientFromEnvironment(config)
const prisma = createPrisma(config)
try {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`No user with email ${email}`)
  const result = await new CollectorService(prisma, ecorota).provision(
    user.id,
    values.link ? { linkEcoRotaId: values.link } : {},
  )
  console.info(result.created
    ? `Created EcoRota custom collector ${result.ecorotaCollectorId} (starts unavailable)`
    : `Collector linked to EcoRota ${result.ecorotaCollectorId}`)
} finally {
  await prisma.$disconnect()
}
