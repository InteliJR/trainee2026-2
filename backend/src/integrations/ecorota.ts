import { AppError } from '../errors/app-error.js'

export type EcoRotaPoint = {
  id: string
  name: string
  kind: 'habitual' | 'additional'
  coordinates: [number, number]
}

export type EcoRotaRequest = {
  id: string
  pointId: string
  externalReference: string
  status: 'pending' | 'assigned' | 'in_service' | 'completed' | 'cancelled'
  collectorId: string | null
}

// Glauco implements the external client behind this contract.
export interface EcoRotaGateway {
  listPoints(): Promise<EcoRotaPoint[]>
  createRequest(input: { pointId: string; externalReference: string }): Promise<EcoRotaRequest>
  getRequest(id: string): Promise<EcoRotaRequest>
  cancelRequest(id: string): Promise<EcoRotaRequest>
}

async function integrationPending(): Promise<never> {
  throw new AppError({
    code: 'ECOROTA_UNAVAILABLE',
    message: 'EcoRota integration is not installed',
    statusCode: 503,
  })
}

// Keeps the local API bootable until the external adapter is supplied.
export const unavailableEcoRotaGateway: EcoRotaGateway = {
  listPoints: integrationPending,
  createRequest: integrationPending,
  getRequest: integrationPending,
  cancelRequest: integrationPending,
}
