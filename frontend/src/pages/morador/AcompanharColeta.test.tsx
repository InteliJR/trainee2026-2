import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Collection } from '../../types'
import { getCollection } from '../../services/coletasService'
import AcompanharColeta from './AcompanharColeta'

vi.mock('../../services/coletasService', () => ({
  getCollection: vi.fn(),
  cancelCollection: vi.fn(),
  createCollection: vi.fn(),
  listCollections: vi.fn(),
  completeCollection: vi.fn(),
}))

const completedCollection: Collection = {
  id: '40000000-0000-4000-8000-000000000010',
  status: 'completed',
  resident: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Costa',
  },
  collector: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Rafael Lima',
  },
  collectionPoint: {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Praça das Palmeiras',
  },
  materials: [{ type: 'paper', quantity: 2, unit: 'kg' }],
  scheduledAt: '2030-01-01T10:00:00.000Z',
  notes: null,
  pointsAwarded: 15,
  createdAt: '2029-12-20T10:00:00.000Z',
  updatedAt: '2029-12-20T10:00:00.000Z',
}

describe('AcompanharColeta', () => {
  const getCollectionMock = vi.mocked(getCollection)

  beforeEach(() => {
    getCollectionMock
      .mockReset()
      .mockResolvedValue({ data: completedCollection })
  })

  afterEach(() => {
    cleanup()
  })

  it('does not offer cancellation for a completed collection', async () => {
    render(
      <MemoryRouter
        initialEntries={[`/morador/coletas/${completedCollection.id}`]}
      >
        <Routes>
          <Route path="/morador/coletas/:id" element={<AcompanharColeta />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cancelar coleta' }),
    ).not.toBeInTheDocument()
  })
})
