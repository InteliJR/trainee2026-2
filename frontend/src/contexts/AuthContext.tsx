import { useEffect, useState, type ReactNode } from 'react'
import type { LoginInput, User } from '../types'
import { authContext } from './auth-context-types'
import type { AuthStatus } from './auth-context-types'
import { getCurrentUser, login as loginService } from '../services/authService'
import { clearToken, getToken } from '../services/authStorage'

export type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'unauthenticated',
  )

  useEffect(() => {
    if (!getToken()) return
    let active = true

    getCurrentUser()
      .then((response) => {
        if (!active) return
        setUser(response.data)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        clearToken()
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  async function login(input: LoginInput): Promise<User> {
    const response = await loginService(input)
    setUser(response.data.user)
    setStatus('authenticated')
    return response.data.user
  }

  function logout() {
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
  }

  return (
    <authContext.Provider value={{ user, status, login, logout }}>
      {children}
    </authContext.Provider>
  )
}
