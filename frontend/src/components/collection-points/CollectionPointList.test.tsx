import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CollectionPoint } from '../../types'
import CollectionPointList from './CollectionPointList'

const habitualPoint: CollectionPoint = {
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Praça das Palmeiras',
  kind: 'habitual',
  coordinates: [-23.55052, -46.633308],
}

const additionalPoint: CollectionPoint = {
  id: '30000000-0000-4000-8000-000000000002',
  name: 'Parque do Ipê',
  kind: 'additional',
  coordinates: [-23.559616, -46.658791],
}

const baseProps = {
  points: [] as CollectionPoint[],
  status: 'success' as const,
  error: null,
  onRetry: vi.fn(),
  selectedId: null,
  onSelect: vi.fn(),
}

function ControlledPointList() {
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(
    null,
  )

  return (
    <CollectionPointList
      {...baseProps}
      points={[additionalPoint, habitualPoint]}
      selectedId={selectedPoint?.id ?? null}
      onSelect={setSelectedPoint}
    />
  )
}

describe('CollectionPointList', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a loading state', () => {
    render(<CollectionPointList {...baseProps} status="loading" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Buscando pontos de coleta',
    )
  })

  it('renders an error state and exposes retry', () => {
    const onRetry = vi.fn()
    render(
      <CollectionPointList
        {...baseProps}
        status="error"
        error={new Error('Falha ao buscar pontos')}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao buscar pontos',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders an empty state when there are no points', () => {
    render(<CollectionPointList {...baseProps} />)

    expect(
      screen.getByRole('heading', {
        name: 'Nenhum ponto de coleta disponível',
      }),
    ).toBeInTheDocument()
  })

  it('renders points with habitual points first and reports the selected point', () => {
    const onSelect = vi.fn()
    render(
      <CollectionPointList
        {...baseProps}
        points={[additionalPoint, habitualPoint]}
        onSelect={onSelect}
      />,
    )

    const pointCards = screen.getAllByRole('button', {
      name: /ponto (habitual|adicional)/i,
    })
    expect(pointCards[0]).toHaveAccessibleName(/Praça das Palmeiras/)
    expect(pointCards[1]).toHaveAccessibleName(/Parque do Ipê/)

    fireEvent.click(pointCards[1])
    expect(onSelect).toHaveBeenCalledWith(additionalPoint)
  })

  it('enables Continue only after the controlled parent selects a point', () => {
    render(<ControlledPointList />)

    const continueButton = screen.getByRole('button', { name: 'Continuar' })
    expect(continueButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Praça das Palmeiras/ }))

    expect(continueButton).toBeEnabled()
  })
})
