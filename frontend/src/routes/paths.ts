import type { UserRole } from '../types'

export function getHomePath(role: UserRole): '/morador' | '/coletor' {
  return role === 'resident' ? '/morador' : '/coletor'
}
