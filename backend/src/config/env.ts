import 'dotenv/config'

import { z } from 'zod'

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
)

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().refine(
    (value) => value.startsWith('postgresql://'),
    'Deve usar o protocolo postgresql://',
  ),
  AUTH_MODE: z.enum(['mock', 'jwt']).default('mock'),
  ECOROTA_API_URL: z.string().url(),
  ECOROTA_API_TOKEN: optionalNonEmptyString,
  ECOROTA_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
})

export type Environment = z.infer<typeof environmentSchema>

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Variaveis de ambiente invalidas: ${z.prettifyError(result.error)}`)
  }
  return result.data
}
