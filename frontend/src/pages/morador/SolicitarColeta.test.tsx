import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Collection } from '../../types'
import { listCollectionPoints } from '../../services/pontosService'
import { createCollection } from '../../services/coletasService'
import SolicitarColeta from './SolicitarColeta'

vi.mock('../../services/pontosService', () => ({
  listCollectionPoints: vi.fn(),
}))

vi.mock('../../services/coletasService', () => ({
  createCollection: vi.fn(),
  listCollections: vi.fn(),
  getCollection: vi.fn(),
  cancelCollection: vi.fn(),
  completeCollection: vi.fn(),
}))

const point = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Praça das Palmeiras',
  kind: 'habitual' as const,
  coordinates: [-23.55052, -46.633308] as [number, number],
}

const createdCollection: Collection = {
  id: '40000000-0000-4000-8000-000000000010',
  status: 'scheduled',
  resident: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Costa',
  },
  collector: null,
  collectionPoint: { id: point.id, name: point.name },
  materials: [{ type: 'paper', quantity: 2, unit: 'kg' }],
  scheduledAt: '2030-01-01T10:00:00.000Z',
  notes: null,
  pointsAwarded: null,
  createdAt: '2029-12-20T10:00:00.000Z',
  updatedAt: '2029-12-20T10:00:00.000Z',
}

function renderRequestForm() {
  return render(
    <MemoryRouter initialEntries={[`/morador/solicitar/${point.id}`]}>
      <Routes>
        <Route
          path="/morador/solicitar/:pontoId"
          element={<SolicitarColeta />}
        />
        <Route
          path="/morador/coletas/:id"
          element={<p>acompanhamento carregado</p>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SolicitarColeta', () => {
  const listPointsMock = vi.mocked(listCollectionPoints)
  const createCollectionMock = vi.mocked(createCollection)

  beforeEach(() => {
    listPointsMock.mockReset().mockResolvedValue({ data: [point] })
    createCollectionMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('blocks invalid material quantities and missing schedule', async () => {
    renderRequestForm()
    await screen.findByText(point.name)

    fireEvent.click(screen.getByLabelText('Escolher data futura'))
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar coleta' }))

    expect(
      await screen.findByText('Informe uma quantidade maior que zero.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Informe a data e o horário da coleta.'),
    ).toBeInTheDocument()
    expect(createCollectionMock).not.toHaveBeenCalled()
  })

  it('sends an immediate collection without scheduledAt', async () => {
    createCollectionMock.mockResolvedValue({
      data: { ...createdCollection, status: 'pending', scheduledAt: null },
    })
    renderRequestForm()
    await screen.findByText(point.name)

    fireEvent.change(screen.getByLabelText('Quantidade'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar coleta' }))

    expect(
      await screen.findByText('acompanhamento carregado'),
    ).toBeInTheDocument()
    expect(createCollectionMock).toHaveBeenCalledWith({
      collectionPointId: point.id,
      materials: [{ type: 'paper', quantity: 2, unit: 'kg' }],
      notes: undefined,
    })
  })

  it('creates the collection and navigates to its tracking page', async () => {
    createCollectionMock.mockResolvedValue({ data: createdCollection })
    renderRequestForm()
    await screen.findByText(point.name)

    fireEvent.change(screen.getByLabelText('Quantidade'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByLabelText('Escolher data futura'))
    fireEvent.change(screen.getByLabelText('Data e horário da coleta'), {
      target: { value: '2030-01-01T10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar coleta' }))

    expect(
      await screen.findByText('acompanhamento carregado'),
    ).toBeInTheDocument()
    expect(createCollectionMock).toHaveBeenCalledWith({
      collectionPointId: point.id,
      materials: [{ type: 'paper', quantity: 2, unit: 'kg' }],
      scheduledAt: new Date('2030-01-01T10:00').toISOString(),
      notes: undefined,
    })
  })
})
