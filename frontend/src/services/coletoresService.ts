import type {
  AssignmentResponse,
  CollectorResponse,
  UpdateAvailabilityInput,
} from '../types'
import { get, patch } from './api'
import { USE_MOCKS } from './config'
import { mockCollections } from './mocks/collections'
import { mockCollectors } from './mocks/collectors'

export async function updateAvailability(
  input: UpdateAvailabilityInput,
): Promise<CollectorResponse> {
  if (!USE_MOCKS) {
    return patch<CollectorResponse>('/collectors/me/availability', input)
  }
  const collector = mockCollectors[0]
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
