import type { Collection, CollectionListResponse, MaterialType } from './collections'

export type ResidentDashboard = {
  total: number
  active: number
  completed: number
  cancelled: number
  materialCounts: { type: MaterialType; count: number }[]
  activeCollections: Collection[]
}

export type CollectorSummary = {
  totalCompleted: number
  frequentPoints: { id: string; name: string; count: number }[]
}

export type CollectorCollectionView = 'today' | 'completed'
export type CollectorCollectionListResponse = CollectionListResponse
