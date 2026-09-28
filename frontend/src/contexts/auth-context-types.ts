import { createContext } from 'react'
import type { LoginInput, User } from '../types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (input: LoginInput) => Promise<User>
  logout: () => void
}

export const authContext = createContext<AuthContextValue | null>(null)
