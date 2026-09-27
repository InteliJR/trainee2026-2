import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Collection } from '../../types'
import { listCollections } from '../../services/coletasService'
import { useCollectionHistory } from '../../hooks/useCollectionHistory'
import CollectionHistoryList from './CollectionHistoryList'

vi.mock('../../services/coletasService', () => ({
  listCollections: vi.fn(),
}))

const firstCollection: Collection = {
  id: '40000000-0000-4000-8000-000000000001',
  status: 'pending',
  resident: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Costa',
  },
  collector: null,
  collectionPoint: {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Praça das Palmeiras',
  },
  materials: [{ type: 'paper', quantity: 3, unit: 'kg' }],
  scheduledAt: null,
  notes: null,
  pointsAwarded: null,
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
}

const secondCollection: Collection = {
  ...firstCollection,
  id: '40000000-0000-4000-8000-000000000002',
  status: 'completed',
  collectionPoint: {
    ...firstCollection.collectionPoint,
    name: 'Parque do Ipê',
  },
  pointsAwarded: 15,
}

function HistoryHarness() {
  const history = useCollectionHistory()

  return (
    <CollectionHistoryList
      collections={history.collections}
      status={history.status}
      error={history.error}
      hasMore={history.hasMore}
      statusFilter={history.statusFilter}
      loadMore={history.loadMore}
      setStatusFilter={history.setStatusFilter}
      onRetry={history.refetch}
    />
  )
}

describe('CollectionHistoryList', () => {
  const listCollectionsMock = vi.mocked(listCollections)

  beforeEach(() => {
    listCollectionsMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading while the first page is pending', () => {
    listCollectionsMock.mockReturnValue(new Promise(() => {}))
    render(<HistoryHarness />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Carregando histórico de coletas',
    )
  })

  it('renders an error and allows retry', async () => {
    listCollectionsMock.mockRejectedValue(new Error('Falha ao carregar'))
    render(<HistoryHarness />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao carregar',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(listCollectionsMock).toHaveBeenCalledTimes(2))
  })

  it('renders an empty state when the response has no collections', async () => {
    listCollectionsMock.mockResolvedValue({ data: [], nextCursor: null })
    render(<HistoryHarness />)

    expect(
      await screen.findByRole('heading', {
        name: 'Nenhuma coleta no histórico',
      }),
    ).toBeInTheDocument()
  })

  it('renders collection items after a successful response', async () => {
    listCollectionsMock.mockResolvedValue({
      data: [firstCollection],
      nextCursor: null,
    })
    render(<HistoryHarness />)

    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    expect(screen.getByText('Papel')).toBeInTheDocument()
    expect(screen.getByText('3 kg')).toBeInTheDocument()
  })

  it('loads another cursor page and accumulates its collections', async () => {
    listCollectionsMock.mockImplementation(async (query) =>
      query?.cursor
        ? { data: [secondCollection], nextCursor: null }
        : { data: [firstCollection], nextCursor: 'cursor-next' },
    )
    render(<HistoryHarness />)

    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(await screen.findByText('Parque do Ipê')).toBeInTheDocument()
    expect(screen.getByText('Praça das Palmeiras')).toBeInTheDocument()
    expect(listCollectionsMock).toHaveBeenLastCalledWith({
      cursor: 'cursor-next',
      limit: 20,
      status: undefined,
    })
  })

  it('re-queries from the first page when the status filter changes', async () => {
    listCollectionsMock.mockImplementation(async (query) => ({
      data: [
        query?.status === 'completed' ? secondCollection : firstCollection,
      ],
      nextCursor: null,
    }))
    render(<HistoryHarness />)

    expect(await screen.findByText('Praça das Palmeiras')).toBeInTheDocument()
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por status' }),
      {
        target: { value: 'completed' },
      },
    )

    expect(await screen.findByText('Parque do Ipê')).toBeInTheDocument()
    expect(listCollectionsMock).toHaveBeenLastCalledWith({
      cursor: undefined,
      limit: 20,
      status: 'completed',
    })
  })
})
