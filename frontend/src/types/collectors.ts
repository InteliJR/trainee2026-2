// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
import type { Collection } from './collections'
import type { DataResponse } from './common'

export type CollectorStatus = 'idle' | 'moving' | 'collecting' | 'unavailable'

export type Collector = {
  id: string
  name: string
  available: boolean
  status: CollectorStatus
}

export type UpdateAvailabilityInput = {
  available: boolean
}

export type CollectorResponse = DataResponse<Collector>
export type AssignmentResponse = DataResponse<Collection | null>
