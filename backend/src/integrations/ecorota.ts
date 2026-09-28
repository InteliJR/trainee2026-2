import { z } from 'zod'

import { AppError } from '../errors/app-error.js'

// Only the fields this API uses are declared; zod drops the rest, so new
// upstream fields do not break parsing.
export const ecorotaPointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(['habitual', 'additional']),
  coordinates: z.tuple([z.number(), z.number()]),
})

export const ecorotaCollectorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  origin: z.enum(['system', 'custom']),
  available: z.boolean(),
  status: z.enum(['idle', 'moving', 'collecting', 'unavailable']),
})

export const ecorotaRequestSchema = z.object({
  id: z.string().uuid(),
  pointId: z.string().uuid(),
  externalReference: z.string(),
  status: z.enum(['pending', 'assigned', 'in_service', 'completed', 'cancelled']),
  collectorId: z.string().uuid().nullable(),
})

export const ecorotaEnvironmentSchema = z.object({
  generation: z.number().int(),
  paused: z.boolean(),
  maxCollectors: z.number().int(),
  occupiedSlots: z.number().int(),
  pollIntervalMs: z.number(),
})

export const ecorotaSnapshotSchema = z.object({
  generation: z.number().int(),
  revision: z.number().int(),
  points: z.array(ecorotaPointSchema),
  collectors: z.array(ecorotaCollectorSchema),
  requests: z.array(ecorotaRequestSchema),
})

export type EcoRotaPoint = z.infer<typeof ecorotaPointSchema>
export type EcoRotaCollector = z.infer<typeof ecorotaCollectorSchema>
export type EcoRotaRequest = z.infer<typeof ecorotaRequestSchema>
export type EcoRotaEnvironment = z.infer<typeof ecorotaEnvironmentSchema>
export type EcoRotaSnapshot = z.infer<typeof ecorotaSnapshotSchema>

export interface EcoRotaGateway {
  getEnvironment(): Promise<EcoRotaEnvironment>
  getSnapshot(): Promise<EcoRotaSnapshot>
  listPoints(): Promise<EcoRotaPoint[]>
  listCollectors(): Promise<EcoRotaCollector[]>
  createCollector(input: { name: string }): Promise<EcoRotaCollector>
  updateCollector(id: string, input: { name?: string; available?: boolean }): Promise<EcoRotaCollector>
  createRequest(input: { pointId: string; externalReference: string }): Promise<EcoRotaRequest>
  getRequest(id: string): Promise<EcoRotaRequest>
  cancelRequest(id: string): Promise<EcoRotaRequest>
  completeRequest(id: string): Promise<EcoRotaRequest>
}

async function integrationPending(): Promise<never> {
  throw new AppError({
    code: 'ECOROTA_UNAVAILABLE',
    message: 'EcoRota integration is not configured',
    statusCode: 503,
  })
}

// Keeps the local API bootable while ECOROTA_API_TOKEN is not set.
export const unavailableEcoRotaGateway: EcoRotaGateway = {
  getEnvironment: integrationPending,
  getSnapshot: integrationPending,
  listPoints: integrationPending,
  listCollectors: integrationPending,
  createCollector: integrationPending,
  updateCollector: integrationPending,
  createRequest: integrationPending,
  getRequest: integrationPending,
  cancelRequest: integrationPending,
  completeRequest: integrationPending,
}
