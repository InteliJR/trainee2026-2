import type { LoginInput, LoginResponse, User } from '../types'
import type { DataResponse } from '../types/common'

export async function login(input: LoginInput): Promise<LoginResponse> {
  void input
  throw new Error('not implemented')
}

export async function getCurrentUser(): Promise<DataResponse<User>> {
  throw new Error('not implemented')
}
