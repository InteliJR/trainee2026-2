// Read-only check of the team's EcoRota environment: credential, slots,
// collectors, points and requests. Usage: npm run ecorota:status
import { loadEnvironment } from '../config/env.js'
import { clientFromEnvironment } from './ecorota-client.js'

const ecorota = clientFromEnvironment(loadEnvironment())
const [environment, snapshot] = await Promise.all([ecorota.getEnvironment(), ecorota.getSnapshot()])

console.info(`Generation ${environment.generation}${environment.paused ? ' (paused)' : ''}`)
console.info(`Collector slots: ${environment.occupiedSlots}/${environment.maxCollectors}`)
console.info(`Suggested poll interval: ${environment.pollIntervalMs} ms\n`)

console.info('Collectors:')
console.table(snapshot.collectors.map(({ id, name, origin, available, status }) => (
  { id, name, origin, available, status }
)))

console.info(`Points: ${snapshot.points.length} ` +
  `(${snapshot.points.filter((point) => point.kind === 'habitual').length} habitual)`)

const byStatus: Record<string, number> = {}
for (const request of snapshot.requests) byStatus[request.status] = (byStatus[request.status] ?? 0) + 1
console.info('Requests:', byStatus)
