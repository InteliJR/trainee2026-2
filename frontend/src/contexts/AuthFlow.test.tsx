import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { LoginResponse, User } from '../types'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import Login from '../pages/auth/Login'
import ProtectedRoute from '../routes/ProtectedRoute'
import { clearToken, setToken } from '../services/authStorage'
import { getCurrentUser, login } from '../services/authService'
import { ApiError } from '../services/api-error'

vi.mock('../services/authService', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
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

function HomeRedirect() {
  const { user } = useAuth()
  return (
    <Navigate
      to={user?.role === 'collector' ? '/coletor' : '/morador'}
      replace
    />
  )
}

function AuthTestRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute allowedRoles={['resident', 'collector']}>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/morador/historico"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <p>histórico solicitado</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/morador/*"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <p>área do morador</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coletor/*"
          element={
            <ProtectedRoute allowedRoles={['collector']}>
              <p>área do coletor</p>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function renderAuthApp(initialPath = '/') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthTestRoutes />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function loginResponse(user: User): LoginResponse {
  return {
    data: {
      accessToken: `token-${user.role}`,
      tokenType: 'Bearer',
      user,
    },
  }
}

describe('authentication access flow', () => {
  beforeEach(() => {
    clearToken()
    vi.mocked(login).mockReset()
    vi.mocked(getCurrentUser).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it.each([
    { user: resident, destination: 'área do morador' },
    { user: collector, destination: 'área do coletor' },
  ])(
    'redirects $user.role to the matching profile home',
    async ({ user, destination }) => {
      vi.mocked(login).mockResolvedValue(loginResponse(user))
      renderAuthApp('/login')

      fireEvent.change(screen.getByLabelText('E-mail'), {
        target: { value: user.email },
      })
      fireEvent.change(screen.getByLabelText('Senha'), {
        target: { value: 'demo-password' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByText(destination)).toBeInTheDocument()
    },
  )

  it('shows a localized message when credentials are invalid', async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId: 'test',
        status: 401,
      }),
    )
    renderAuthApp('/login')

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'wrong@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha inválidos.',
    )
  })

  it('returns to the requested protected route after compatible login', async () => {
    vi.mocked(login).mockResolvedValue(loginResponse(resident))
    renderAuthApp('/morador/historico')

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: resident.email },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'demo-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('histórico solicitado')).toBeInTheDocument()
  })

  it('redirects an unauthenticated user to login from a protected route', async () => {
    renderAuthApp('/morador/historico')

    expect(
      await screen.findByRole('heading', { name: 'Entre na sua conta' }),
    ).toBeInTheDocument()
  })

  it('redirects a user with the wrong profile to their own home', async () => {
    setToken('token-collector')
    vi.mocked(getCurrentUser).mockResolvedValue({ data: collector })
    renderAuthApp('/morador/historico')

    expect(await screen.findByText('área do coletor')).toBeInTheDocument()
    expect(screen.queryByText('área do morador')).not.toBeInTheDocument()
  })
})
