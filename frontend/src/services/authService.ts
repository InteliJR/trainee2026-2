import type { LoginInput, LoginResponse, User } from '../types'
import type { DataResponse } from '../types/common'
import { USE_MOCKS } from './config'
import { get, post } from './api'
import { setToken } from './authStorage'
import { mockLoginResponse, mockUser } from './mocks/auth'

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = USE_MOCKS
    ? mockLoginResponse
    : await post<LoginResponse>('/auth/login', input)
  setToken(response.data.accessToken)
  return response
}

export async function getCurrentUser(): Promise<DataResponse<User>> {
  return USE_MOCKS ? { data: mockUser } : get<DataResponse<User>>('/auth/me')
}
