import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MoradorHome from './MoradorHome'
import { getResidentDashboard } from '../../services/dashboardService'

vi.mock('../../hooks/useCollectionPoints', () => ({
  useCollectionPoints: () => ({ points: [], status: 'success', error: null, refetch: vi.fn() }),
}))
vi.mock('../../services/dashboardService', () => ({ getResidentDashboard: vi.fn() }))

afterEach(cleanup)

describe('MoradorHome', () => {
  it('shows current collections in the Coletas tab', async () => {
    vi.mocked(getResidentDashboard).mockResolvedValue({
      data: { total: 1, active: 1, completed: 0, cancelled: 0, materialCounts: [], activeCollections: [{
        id: '40000000-0000-4000-8000-000000000001', status: 'pending',
        resident: { id: '10000000-0000-4000-8000-000000000001', name: 'Marina' },
        collector: null,
        collectionPoint: { id: '30000000-0000-4000-8000-000000000001', name: 'Praça das Palmeiras' },
        materials: [{ type: 'paper', quantity: 1, unit: 'kg' }], scheduledAt: null,
        notes: null, pointsAwarded: null,
        createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z',
      }] },
    })
    render(<MemoryRouter><MoradorHome /></MemoryRouter>)
    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acompanhar coleta' })).toHaveAttribute('href', '/morador/coletas/40000000-0000-4000-8000-000000000001')
  })
})
