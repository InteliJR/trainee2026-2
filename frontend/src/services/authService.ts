import type { LoginInput, LoginResponse, User } from '../types'
import type { DataResponse } from '../types/common'
import { USE_MOCKS } from './config'
import { get, post } from './api'
import { ApiError } from './api-error'
import { setToken } from './authStorage'
import { createMockLoginResponse, mockUsers } from './mocks/auth'

export async function login(input: LoginInput): Promise<LoginResponse> {
  let response: LoginResponse
  if (USE_MOCKS) {
    try {
      response = createMockLoginResponse(input)
    } catch {
      throw new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        requestId: 'mock',
        status: 401,
      })
    }
  } else {
    response = await post<LoginResponse>('/auth/login', input)
  }
  setToken(response.data.accessToken)
  return response
}

export async function getCurrentUser(): Promise<DataResponse<User>> {
  if (USE_MOCKS) {
    const token = sessionStorage.getItem('ecorota.accessToken')
    const user = mockUsers.find(
      ({ role }) => token === `mock-ecorota-token-${role}`,
    )
    if (user) return { data: user }
    throw new ApiError({
      code: 'UNAUTHORIZED',
      message: 'Invalid demo session',
      requestId: 'mock',
      status: 401,
    })
  }
  return get<DataResponse<User>>('/auth/me')
}
