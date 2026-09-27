import type { Collector } from '../../types'

export const mockCollectors: Collector[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Rafael Lima',
    available: true,
    status: 'collecting',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Joana Alves',
    available: false,
    status: 'unavailable',
  },
]
