import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../types'
import { useAuth } from '../contexts/useAuth'
import { Loading } from '../components/ui'
import { getHomePath } from './paths'

export type ProtectedRouteProps = {
  allowedRoles: UserRole[]
  children?: ReactNode
}

export default function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Loading label="Restaurando sessão" />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePath(user.role)} replace />
  }

  return children ?? <Outlet />
}
