import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from '../../types'
import Header from './Header'

let currentUser: User

vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: currentUser,
    logout: vi.fn(),
  }),
}))

const resident: User = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Marina Costa',
  email: 'resident@example.com',
  role: 'resident',
}

const collector: User = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Rafael Lima',
  email: 'collector@example.com',
  role: 'collector',
}

function renderHeader(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Header profile navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows collector navigation and only marks Atendimento active at its index route', () => {
    currentUser = collector
    renderHeader('/coletor/perfil')

    expect(screen.getByRole('link', { name: 'Atendimento' })).toHaveAttribute(
      'href',
      '/coletor',
    )
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute(
      'href',
      '/coletor/perfil',
    )
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/coletor/agenda')
    expect(screen.getByRole('link', { name: 'Realizadas' })).toHaveAttribute('href', '/coletor/realizadas')
    expect(screen.getByText('Rafael Lima')).toBeInTheDocument()
  })

  it('shows all resident tabs', () => {
    currentUser = resident
    renderHeader('/morador')

    expect(screen.getByRole('link', { name: 'Coletas' })).toHaveAttribute(
      'href',
      '/morador',
    )
    expect(
      screen.getByRole('link', { name: 'Evolução' }),
    ).toHaveAttribute('href', '/morador/evolucao')
    expect(screen.getByRole('link', { name: 'Conquistas' })).toHaveAttribute('href', '/morador/conquistas')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/morador/perfil')
    expect(
      screen.queryByRole('link', { name: 'Atendimento' }),
    ).not.toBeInTheDocument()
  })
})
