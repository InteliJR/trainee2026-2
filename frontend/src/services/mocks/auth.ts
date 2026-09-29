import type { LoginInput, LoginResponse, User } from '../../types'

export const mockUser: User = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Morador Demo',
  email: 'demo-resident@ecorota.local',
  role: 'resident',
}

export const mockCollector: User = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Coletor Demo',
  email: 'demo-collector@ecorota.local',
  role: 'collector',
}

export const mockUsers = [mockUser, mockCollector]

export function createMockLoginResponse(input: LoginInput): LoginResponse {
  const user = mockUsers.find(({ email }) => email === input.email)
  if (!user || input.password !== '123456') {
    throw new Error('Invalid demo credentials')
  }

  return {
    data: {
      accessToken: `mock-ecorota-token-${user.role}`,
      tokenType: 'Bearer',
      user,
    },
  }
}
