// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
export type UserRole = 'resident' | 'collector'

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type LoginInput = {
  email: string
  password: string
}

export type LoginResponse = DataResponse<{
  accessToken: string
  tokenType: 'Bearer'
  user: User
}>

import type { DataResponse } from './common'
