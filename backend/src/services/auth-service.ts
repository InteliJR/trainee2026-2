import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import type { PrismaClient } from '@prisma/client'

import type { LoginInput, User, UserRole } from '../contracts/auth.js'
import { AppError } from '../errors/app-error.js'

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// Use a valid hash for missing accounts so every login attempt runs scrypt.
const DUMMY_PASSWORD_HASH = hashPassword('invalid-password', '00000000000000000000000000000000')

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = scryptSync(password, salt, 64)
  const expectedBytes = Buffer.from(expected, 'hex')
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes)
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function publicUser(user: { id: string; name: string; email: string; role: UserRole }): User {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    const passwordMatches = verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
    if (!user || !passwordMatches) {
      throw new AppError({ code: 'UNAUTHORIZED', message: 'Invalid credentials', statusCode: 401 })
    }
    const accessToken = randomBytes(32).toString('base64url')
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: tokenHash(accessToken) },
    })
    return { accessToken, tokenType: 'Bearer' as const, user: publicUser(user) }
  }

  async authenticate(header: string | undefined, role?: UserRole): Promise<User> {
    const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header ?? '')
    if (!match?.[1]) {
      throw new AppError({ code: 'UNAUTHORIZED', message: 'Bearer token required', statusCode: 401 })
    }
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: tokenHash(match[1]) },
      include: { user: true },
    })
    if (!session) {
      throw new AppError({ code: 'UNAUTHORIZED', message: 'Invalid token', statusCode: 401 })
    }
    if (role && session.user.role !== role) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 })
    }
    return publicUser(session.user)
  }
}
