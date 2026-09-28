import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Collection } from '../../types'
import { getCollection } from '../../services/coletasService'
import DetalheAtendimento from './DetalheAtendimento'

vi.mock('../../services/coletasService', () => ({
  getCollection: vi.fn(),
  cancelCollection: vi.fn(),
  createCollection: vi.fn(),
  listCollections: vi.fn(),
  completeCollection: vi.fn(),
}))

const collection: Collection = {
  id: '40000000-0000-4000-8000-000000000010',
  status: 'in_service',
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
  materials: [
    { type: 'paper', quantity: 2, unit: 'kg' },
    { type: 'other', quantity: 1, unit: 'units', description: 'Bateria' },
  ],
  scheduledAt: '2030-01-01T10:00:00.000Z',
  notes: 'Retirar na portaria',
  pointsAwarded: null,
  createdAt: '2029-12-20T10:00:00.000Z',
  updatedAt: '2029-12-20T10:00:00.000Z',
}

function renderDetails() {
  return render(
    <MemoryRouter initialEntries={[`/coletor/coletas/${collection.id}`]}>
      <Routes>
        <Route path="/coletor/coletas/:id" element={<DetalheAtendimento />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DetalheAtendimento', () => {
  const getCollectionMock = vi.mocked(getCollection)

  beforeEach(() => {
    getCollectionMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the assignment details', async () => {
    getCollectionMock.mockResolvedValue({ data: collection })
    renderDetails()

    expect(
      await screen.findByRole('heading', { name: 'Praça das Palmeiras' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Marina Costa')).toBeInTheDocument()
    expect(screen.getByText('Papel')).toBeInTheDocument()
    expect(screen.getByText('Bateria')).toBeInTheDocument()
    expect(screen.getByText('Retirar na portaria')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Voltar à coleta atual' }),
    ).toHaveAttribute('href', '/coletor')
  })

  it('offers retry when loading fails', async () => {
    getCollectionMock
      .mockRejectedValueOnce(new Error('Falha de rede'))
      .mockResolvedValueOnce({ data: collection })
    renderDetails()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Retirar na portaria')).toBeInTheDocument()
    expect(getCollectionMock).toHaveBeenCalledTimes(2)
  })
})
