import { randomUUID } from 'node:crypto'

import { EcoRotaRejectedError } from '../integrations/ecorota-client.js'
import type {
  EcoRotaCollector,
  EcoRotaGateway,
  EcoRotaPoint,
  EcoRotaRequest,
} from '../integrations/ecorota.js'

/** In-memory EcoRota that follows the documented v1 rules used by the API. */
export class FakeEcoRota implements EcoRotaGateway {
  points: EcoRotaPoint[]
  collectors = new Map<string, EcoRotaCollector>()
  requests = new Map<string, EcoRotaRequest>()
  createCalls: { pointId: string; externalReference: string }[] = []
  failCreate = false
  rejectCancel = false
  generation = 1
  maxCollectors = 4

  constructor(points: EcoRotaPoint[]) {
    this.points = points
  }

  private reject(status: number, code: string): never {
    throw new EcoRotaRejectedError(status, code, code)
  }

  private findRequest(id: string) {
    return this.requests.get(id) ?? this.reject(404, 'NOT_FOUND')
  }

  async getEnvironment() {
    return {
      generation: this.generation,
      paused: false,
      maxCollectors: this.maxCollectors,
      occupiedSlots: this.collectors.size,
      pollIntervalMs: 5000,
    }
  }

  async getSnapshot() {
    return {
      generation: this.generation,
      revision: 1,
      points: this.points,
      collectors: [...this.collectors.values()],
      requests: [...this.requests.values()],
    }
  }

  async listPoints() { return this.points }
  async listCollectors() { return [...this.collectors.values()] }

  async createCollector(input: { name: string }) {
    if (this.collectors.size >= this.maxCollectors) this.reject(409, 'NO_COLLECTOR_SLOT')
    const collector: EcoRotaCollector = {
      id: randomUUID(), name: input.name, origin: 'custom', available: false, status: 'unavailable',
    }
    this.collectors.set(collector.id, collector)
    return collector
  }

  async updateCollector(id: string, input: { name?: string; available?: boolean }) {
    const collector = this.collectors.get(id) ?? this.reject(404, 'NOT_FOUND')
    if (collector.origin === 'system') this.reject(409, 'SYSTEM_COLLECTOR')
    if (input.name !== undefined) collector.name = input.name
    if (input.available !== undefined) {
      collector.available = input.available
      collector.status = input.available ? 'idle' : 'unavailable'
    }
    return collector
  }

  async createRequest(input: { pointId: string; externalReference: string }) {
    this.createCalls.push(input)
    if (this.failCreate) throw new Error('EcoRota offline')
    const existing = [...this.requests.values()].find(
      (item) => item.pointId === input.pointId && item.externalReference === input.externalReference,
    )
    if (existing) return existing
    const request: EcoRotaRequest = {
      id: randomUUID(),
      pointId: input.pointId,
      externalReference: input.externalReference,
      status: 'pending',
      collectorId: null,
    }
    this.requests.set(request.id, request)
    return request
  }

  async getRequest(id: string) { return this.findRequest(id) }

  async cancelRequest(id: string) {
    const request = this.findRequest(id)
    if (this.rejectCancel || !['pending', 'assigned'].includes(request.status)) {
      this.reject(409, 'INVALID_STATE')
    }
    request.status = 'cancelled'
    return request
  }

  async completeRequest(id: string) {
    const request = this.findRequest(id)
    const collector = request.collectorId ? this.collectors.get(request.collectorId) : undefined
    if (request.status !== 'in_service' || collector?.origin !== 'custom') this.reject(409, 'INVALID_STATE')
    request.status = 'completed'
    collector.status = 'idle'
    return request
  }

  // Simulation helpers: what EcoRota does on its own between calls.
  assign(requestId: string, collectorId: string) {
    const request = this.findRequest(requestId)
    request.status = 'assigned'
    request.collectorId = collectorId
  }

  arrive(requestId: string) {
    this.findRequest(requestId).status = 'in_service'
  }

  /** Scenario reset: every request and custom collector disappears. */
  reset() {
    this.generation++
    this.requests.clear()
    this.collectors.clear()
  }
}
