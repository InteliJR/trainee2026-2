import { createPrisma } from '../config/prisma.js'
import { loadEnvironment } from '../config/env.js'
import { hashPassword } from '../services/auth-service.js'

const config = loadEnvironment()
if (config.NODE_ENV === 'production') throw new Error('Demo accounts are disabled in production')

const password = process.env.DEMO_PASSWORD
if (!password) {
  throw new Error('Set DEMO_PASSWORD before seeding')
}

const prisma = createPrisma(config)
try {
  for (const role of ['resident', 'collector'] as const) {
    const email = `demo-${role}@ecorota.local`
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hashPassword(password) },
      create: {
        name: role === 'resident' ? 'Morador Demo' : 'Coletor Demo',
        email,
        role,
        passwordHash: hashPassword(password),
      },
    })
    if (role === 'collector') {
      await prisma.collector.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      })
    }
    console.info(`Demo account ready: ${email}`)
  }
} finally {
  await prisma.$disconnect()
}
