import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AssignmentActions from './AssignmentActions'

describe('AssignmentActions', () => {
  afterEach(() => cleanup())

  it('disables completion while the collector is still assigned', () => {
    render(
      <AssignmentActions
        status="assigned"
        completing={false}
        error={null}
        onComplete={vi.fn()}
        onClearError={vi.fn()}
      />,
    )

    expect(screen.getByText(/liberada quando você chegar/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Concluir coleta' }),
    ).toBeDisabled()
  })

  it('requires a second confirmation before completing an in-service collection', () => {
    const onComplete = vi.fn()
    const onClearError = vi.fn()
    render(
      <AssignmentActions
        status="in_service"
        completing={false}
        error={null}
        onComplete={onComplete}
        onClearError={onClearError}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Concluir coleta' }))
    expect(
      screen.getByText('Confirmar conclusão desta coleta?'),
    ).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, concluir' }))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onClearError).toHaveBeenCalled()
  })

  it('disables both confirmation choices while completing', () => {
    const props = {
      status: 'in_service' as const,
      error: null,
      onComplete: vi.fn(),
      onClearError: vi.fn(),
    }
    const { rerender } = render(
      <AssignmentActions {...props} completing={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Concluir coleta' }))
    rerender(<AssignmentActions {...props} completing />)

    expect(screen.getByRole('button', { name: 'Concluindo...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()
  })

  it('shows terminal state messages and no action for other states', () => {
    const completed = render(
      <AssignmentActions
        status="completed"
        completing={false}
        error={null}
        onComplete={vi.fn()}
        onClearError={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Coleta concluída.')
    completed.unmount()

    render(
      <AssignmentActions
        status="cancelled"
        completing={false}
        error={null}
        onComplete={vi.fn()}
        onClearError={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta coleta foi cancelada pelo morador.',
    )
  })

  it('renders no action for scheduled status', () => {
    const { container } = render(
      <AssignmentActions
        status="scheduled"
        completing={false}
        error={null}
        onComplete={vi.fn()}
        onClearError={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
