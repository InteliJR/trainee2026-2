import type {
  AssignmentResponse,
  CollectorResponse,
  UpdateAvailabilityInput,
} from '../types'

export async function updateAvailability(
  input: UpdateAvailabilityInput,
): Promise<CollectorResponse> {
  void input
  throw new Error('not implemented')
}

export async function getCurrentAssignment(): Promise<AssignmentResponse> {
  throw new Error('not implemented')
}
