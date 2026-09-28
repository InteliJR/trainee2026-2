import type {
  AssignmentResponse,
  Collector,
  CollectorResponse,
  UpdateAvailabilityInput,
} from '../types'
import type { DataResponse } from '../types/common'
import { get, patch } from './api'
import { USE_MOCKS } from './config'
import { mockCollections } from './mocks/collections'
import { mockCollectors } from './mocks/collectors'

function getMockCurrentCollector(): Collector {
  return mockCollectors[0]
}

export async function getCurrentCollector(): Promise<DataResponse<Collector>> {
  if (USE_MOCKS) return { data: getMockCurrentCollector() }

  // Provisional: GET /collectors/me is not yet part of docs/projeto-ecorota.md section 10.
  return get<DataResponse<Collector>>('/collectors/me')
}

export async function updateAvailability(
  input: UpdateAvailabilityInput,
): Promise<CollectorResponse> {
  if (!USE_MOCKS) {
    return patch<CollectorResponse>('/collectors/me/availability', input)
  }
  const collector = getMockCurrentCollector()
  collector.available = input.available
  collector.status = input.available ? 'idle' : 'unavailable'
  return { data: collector }
}

export async function getCurrentAssignment(): Promise<AssignmentResponse> {
  if (!USE_MOCKS) {
    return get<AssignmentResponse>('/collectors/me/assignment')
  }
  const assignment = mockCollections.find(
    ({ status, collector }) =>
      (status === 'assigned' || status === 'in_service') && collector !== null,
  )
  return { data: assignment ?? null }
}
