import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { getHomePath } from './paths'

export default function ProfileHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />
}
