import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Collection } from '../../types'
import { getCurrentAssignment } from '../../services/coletoresService'
import ColetorHome from './ColetorHome'

vi.mock('../../services/coletoresService', () => ({
  getCurrentAssignment: vi.fn(),
  getCurrentCollector: vi.fn(),
  updateAvailability: vi.fn(),
}))

const collection: Collection = {
  id: '40000000-0000-4000-8000-000000000010',
  status: 'assigned',
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
  pointsAwarded: null,
  createdAt: '2029-12-20T10:00:00.000Z',
  updatedAt: '2029-12-20T10:00:00.000Z',
}

function renderHome() {
  return render(
    <MemoryRouter>
      <ColetorHome />
    </MemoryRouter>,
  )
}

describe('ColetorHome', () => {
  const getAssignmentMock = vi.mocked(getCurrentAssignment)

  beforeEach(() => {
    getAssignmentMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders an empty state with a link to availability profile', async () => {
    getAssignmentMock.mockResolvedValue({ data: null })
    renderHome()

    expect(
      await screen.findByRole('heading', {
        name: 'Nenhuma coleta atribuída',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver perfil e disponibilidade' }),
    ).toHaveAttribute('href', '/coletor/perfil')
  })

  it('renders the current assignment card', async () => {
    getAssignmentMock.mockResolvedValue({ data: collection })
    renderHome()

    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    expect(screen.getByText('Marina Costa')).toBeInTheDocument()
    expect(screen.getByText('Papel · 2 kg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute(
      'href',
      `/coletor/coletas/${collection.id}`,
    )
  })
})
