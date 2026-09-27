import type { Collection } from '../../types'

const resident = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Marina Costa',
}

const collector = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Rafael Lima',
}

const collectionPoint = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Praça das Palmeiras',
}

const baseCollection: Omit<Collection, 'id' | 'status'> = {
  resident,
  collector: null,
  collectionPoint,
  materials: [{ type: 'paper', quantity: 3, unit: 'kg' }],
  scheduledAt: null,
  notes: null,
  pointsAwarded: null,
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
}

export const mockCollections: Collection[] = [
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000001',
    status: 'scheduled',
    scheduledAt: '2026-09-28T12:00:00.000Z',
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000002',
    status: 'pending',
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000003',
    status: 'assigned',
    collector,
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000004',
    status: 'in_service',
    collector,
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000005',
    status: 'completed',
    collector,
    pointsAwarded: 15,
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000006',
    status: 'cancelled',
  },
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000007',
    status: 'integration_failed',
  },
]
