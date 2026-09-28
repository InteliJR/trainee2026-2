import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Collector } from '../../types'
import {
  getCurrentCollector,
  updateAvailability,
} from '../../services/coletoresService'
import PerfilColetor from './PerfilColetor'

vi.mock('../../services/coletoresService', () => ({
  getCurrentCollector: vi.fn(),
  updateAvailability: vi.fn(),
  getCurrentAssignment: vi.fn(),
}))

vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Rafael Lima',
      email: 'collector@example.com',
      role: 'collector',
    },
  }),
}))

const collector: Collector = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Rafael Lima',
  available: false,
  status: 'unavailable',
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <PerfilColetor />
    </MemoryRouter>,
  )
}

describe('PerfilColetor', () => {
  const getCollectorMock = vi.mocked(getCurrentCollector)
  const updateAvailabilityMock = vi.mocked(updateAvailability)

  beforeEach(() => {
    getCollectorMock.mockReset()
    updateAvailabilityMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows a loading state while reading the profile', () => {
    getCollectorMock.mockReturnValue(new Promise(() => {}))
    renderProfile()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Carregando perfil do coletor',
    )
  })

  it('shows an error state and retries profile loading', async () => {
    getCollectorMock
      .mockRejectedValueOnce(new Error('Falha ao carregar perfil'))
      .mockResolvedValue({ data: collector })
    renderProfile()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao carregar perfil',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('collector@example.com')).toBeInTheDocument()
    expect(getCollectorMock).toHaveBeenCalledTimes(2)
  })

  it('renders collector identity and availability', async () => {
    getCollectorMock.mockResolvedValue({ data: collector })
    renderProfile()

    expect(
      await screen.findByRole('heading', { name: 'Rafael Lima' }),
    ).toBeInTheDocument()
    expect(screen.getByText('collector@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Indisponível')).toHaveLength(2)
  })

  it('updates availability and toggles the button label', async () => {
    getCollectorMock.mockResolvedValue({ data: collector })
    updateAvailabilityMock.mockResolvedValue({
      data: { ...collector, available: true, status: 'idle' },
    })
    renderProfile()

    const button = await screen.findByRole('button', {
      name: 'Ficar disponível',
    })
    fireEvent.click(button)

    expect(
      await screen.findByRole('button', { name: 'Ficar indisponível' }),
    ).toBeEnabled()
    expect(updateAvailabilityMock).toHaveBeenCalledWith({ available: true })
  })
})
