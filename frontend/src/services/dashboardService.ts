import type { DataResponse } from '../types'
import type { ResidentDashboard, CollectorSummary, CollectorCollectionView, CollectorCollectionListResponse } from '../types/dashboard'
import { get } from './api'
import { USE_MOCKS } from './config'
import { mockCollections } from './mocks/collections'
import { mockCollector } from './mocks/auth'
import { mockUser } from './mocks/auth'

const activeStatuses = ['scheduled', 'pending', 'assigned', 'in_service', 'integration_failed']

export async function getResidentDashboard(): Promise<DataResponse<ResidentDashboard>> {
  if (!USE_MOCKS) return get<DataResponse<ResidentDashboard>>('/collections/dashboard')
  const own = mockCollections.filter((collection) => collection.resident.id === mockUser.id)
  const counts = new Map<string, number>()
  for (const collection of own) for (const material of collection.materials) {
    counts.set(material.type, (counts.get(material.type) ?? 0) + 1)
  }
  return { data: {
    total: own.length,
    active: own.filter((item) => activeStatuses.includes(item.status)).length,
    completed: own.filter((item) => item.status === 'completed').length,
    cancelled: own.filter((item) => item.status === 'cancelled').length,
    materialCounts: [...counts].map(([type, count]) => ({ type: type as ResidentDashboard['materialCounts'][number]['type'], count })),
    activeCollections: own.filter((item) => activeStatuses.includes(item.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
  } }
}

export async function getCollectorSummary(): Promise<DataResponse<CollectorSummary>> {
  if (!USE_MOCKS) return get<DataResponse<CollectorSummary>>('/collectors/me/summary')
  const completed = mockCollections.filter((item) => item.collector?.id === mockCollector.id && item.status === 'completed')
  const points = new Map<string, { id: string; name: string; count: number }>()
  for (const collection of completed) {
    const point = collection.collectionPoint
    points.set(point.id, { ...point, count: (points.get(point.id)?.count ?? 0) + 1 })
  }
  return { data: { totalCompleted: completed.length, frequentPoints: [...points.values()].sort((a, b) => b.count - a.count).slice(0, 5) } }
}

export async function listCollectorCollections(query: {
  view: CollectorCollectionView
  cursor?: string
  limit?: number
  dayStart?: string
  dayEnd?: string
}): Promise<CollectorCollectionListResponse> {
  if (!USE_MOCKS) {
    const params = new URLSearchParams({ view: query.view })
    if (query.cursor) params.set('cursor', query.cursor)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.view === 'today') {
      if (query.dayStart) params.set('dayStart', query.dayStart)
      if (query.dayEnd) params.set('dayEnd', query.dayEnd)
    }
    return get<CollectorCollectionListResponse>(`/collectors/me/collections?${params.toString()}`)
  }
  const matching = mockCollections.filter((item) => {
    if (item.collector?.id !== mockCollector.id) return false
    if (query.view === 'completed') return item.status === 'completed'
    const date = item.scheduledAt ?? item.createdAt
    return ['assigned', 'in_service'].includes(item.status) && !!query.dayStart && !!query.dayEnd && date >= query.dayStart && date < query.dayEnd
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  const start = Math.max(0, Number.parseInt(query.cursor ?? '0', 10) || 0)
  const limit = query.limit ?? 20
  const data = matching.slice(start, start + limit)
  return { data, nextCursor: start + data.length < matching.length ? String(start + data.length) : null }
}
