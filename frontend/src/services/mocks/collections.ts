import type { Collection } from '../../types'

const resident = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Morador Demo',
}

const collector = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Coletor Demo',
}

const collectionPoint = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Praça das Palmeiras',
}

const demoCreatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const demoScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

const baseCollection: Omit<Collection, 'id' | 'status'> = {
  resident,
  collector: null,
  collectionPoint,
  materials: [{ type: 'paper', quantity: 3, unit: 'kg' }],
  scheduledAt: null,
  notes: null,
  pointsAwarded: null,
  createdAt: demoCreatedAt,
  updatedAt: demoCreatedAt,
}

export const mockCollections: Collection[] = [
  {
    ...baseCollection,
    id: '40000000-0000-4000-8000-000000000001',
    status: 'scheduled',
    scheduledAt: demoScheduledAt,
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
    pointsAwarded: 1,
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
