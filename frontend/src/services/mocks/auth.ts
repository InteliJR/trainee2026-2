import type { LoginResponse, User } from '../../types'

export const mockUser: User = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Marina Costa',
  email: 'resident@example.com',
  role: 'resident',
}

export const mockLoginResponse: LoginResponse = {
  data: {
    accessToken: 'mock-ecorota-token',
    tokenType: 'Bearer',
    user: mockUser,
  },
}
