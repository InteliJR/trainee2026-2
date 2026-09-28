import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export default function ProfileHomeRedirect() {
  const { user } = useAuth()
  return (
    <Navigate
      to={user?.role === 'collector' ? '/coletor' : '/morador'}
      replace
    />
  )
}
