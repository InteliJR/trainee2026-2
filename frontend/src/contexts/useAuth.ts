import { useContext } from 'react'
import { authContext } from './auth-context-types'
import type { AuthContextValue } from './auth-context-types'

export function useAuth(): AuthContextValue {
  const context = useContext(authContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
