// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
import type { PaginatedResponse } from './common'

export type MaterialType =
  'paper' | 'plastic' | 'glass' | 'metal' | 'electronics' | 'other'
export type MaterialUnit = 'kg' | 'units' | 'bags'
export type CollectionStatus =
  | 'scheduled'
  | 'pending'
  | 'assigned'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'integration_failed'

export type Material = {
  type: MaterialType
  quantity: number
  unit: MaterialUnit
  description?: string
}

export type CreateCollectionInput = {
  collectionPointId: string
  materials: Material[]
  scheduledAt?: string
  notes?: string
}

export type CollectionPerson = {
  id: string
  name: string
}

export type CollectionPointSummary = {
  id: string
  name: string
}

export type Collection = {
  id: string
  status: CollectionStatus
  resident: CollectionPerson
  collector: CollectionPerson | null
  collectionPoint: CollectionPointSummary
  materials: Material[]
  scheduledAt: string | null
  notes: string | null
  pointsAwarded: number | null
  createdAt: string
  updatedAt: string
}

export type CollectionListQuery = {
  cursor?: string
  limit: number
  status?: CollectionStatus
  stage?: 'active' | 'finished'
}

export type CollectionListResponse = PaginatedResponse<Collection>
