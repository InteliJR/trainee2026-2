import type { Environment } from '../config/env.js'
import { EcoRotaHttpClient } from '../integrations/ecorota-client.js'

export function clientFromEnvironment(config: Environment): EcoRotaHttpClient {
  if (!config.ECOROTA_API_TOKEN) {
    throw new Error('Set ECOROTA_API_TOKEN in backend/.env before calling EcoRota')
  }
  return new EcoRotaHttpClient({
    baseUrl: config.ECOROTA_API_URL,
    token: config.ECOROTA_API_TOKEN,
    timeoutMs: config.ECOROTA_TIMEOUT_MS,
  })
}
