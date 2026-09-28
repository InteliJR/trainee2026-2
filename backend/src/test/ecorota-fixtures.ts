// Sample EcoRota v1 payloads shaped after /docs/openapi.json and checked
// against the real API. Extra fields (circuit, demand, position, routes...) are
// kept on purpose: the client must ignore what it does not use.

export const ids = {
  point: '0e76397e-154d-48a0-bf76-689a8fed00ac',
  additionalPoint: '5b0f3c1e-8d4a-4f6e-9a51-2c7d9e3b1a44',
  systemCollector: '9d4b7a52-3e61-4c8f-b0a2-71e5d6c4f3a1',
  customCollector: 'c3a1e7d9-5b2f-4a86-9e14-0f6b8d2c7a35',
  request: 'a8e5c2f1-7d3b-4e9a-8c61-b2f4d0e9a7c3',
}

const meta = {
  revision: 42,
  generation: 1,
  simulationTime: 84_000,
  observedAt: '2026-09-27T12:00:00.000Z',
}

export function envelope<T>(data: T, extra: Record<string, unknown> = {}) {
  return { data, ...meta, ...extra }
}

export const environment = {
  id: 'env-team-a',
  name: 'Equipe A',
  generation: 1,
  revision: 42,
  simulationTime: 84_000,
  paused: false,
  observedAt: meta.observedAt,
  maxCollectors: 4,
  occupiedSlots: 2,
  tickMs: 1000,
  pollIntervalMs: 5000,
}

export const point = {
  id: ids.point,
  name: 'Ponto Central',
  kind: 'habitual',
  coordinates: [-46.6333, -23.5505],
  circuit: 1,
  demand: { pending: 1, assigned: 0, in_service: 0, completed: 3, cancelled: 0 },
}

export const additionalPoint = {
  ...point,
  id: ids.additionalPoint,
  name: 'Ponto Adicional Norte',
  kind: 'additional',
  coordinates: [-46.62, -23.54],
  circuit: 0,
}

export const systemCollector = {
  id: ids.systemCollector,
  name: 'Coletor Sistema 1',
  origin: 'system',
  available: true,
  status: 'moving',
  circuit: 1,
  position: { type: 'Point', coordinates: [-46.63, -23.55] },
  observedAt: meta.observedAt,
  destinationId: ids.point,
  routeRevision: 7,
}

export const customCollector = {
  ...systemCollector,
  id: ids.customCollector,
  name: 'Coletor Demo',
  origin: 'custom',
  available: false,
  status: 'unavailable',
  destinationId: null,
}

export const request = {
  id: ids.request,
  pointId: ids.point,
  externalReference: 'collection:11111111-1111-4111-8111-111111111111',
  status: 'pending',
  collectorId: null,
  createdAt: meta.observedAt,
  createdSimulationTime: 80_000,
  updatedAt: meta.observedAt,
}

export const snapshot = {
  ...environment,
  points: [point, additionalPoint],
  collectors: [systemCollector, customCollector],
  routes: [],
  requests: [request],
  eventCursor: '125',
}

// unauthorized, notFound and invalidInput were captured from the real API on
// 2026-09-28; conflict, rateLimited and server keep the documented shape.
export const errors = {
  unauthorized: {
    code: 'UNAUTHORIZED', message: 'Credencial ausente ou inválida.', details: {}, requestId: 'req-2l8',
  },
  notFound: { code: 'NOT_FOUND', message: 'Solicitação não encontrada.', details: {}, requestId: 'req-2l7' },
  invalidInput: {
    code: 'INVALID_INPUT', message: 'params/id must match format "uuid"', details: {}, requestId: 'req-2l9',
  },
  conflict: {
    code: 'INVALID_STATE',
    message: 'Request cannot be cancelled after service started',
    details: { status: 'in_service' },
    requestId: 'up-3',
  },
  rateLimited: { code: 'RATE_LIMITED', message: 'Too many requests', details: {}, requestId: 'up-4' },
  server: { code: 'INTERNAL', message: 'Unexpected error', details: {}, requestId: 'up-5' },
}
