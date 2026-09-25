import { z } from 'zod'

import { dataResponseSchema, uuidSchema } from './common.js'

export const userRoleSchema = z.enum(['resident', 'collector'])

export const userSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
    email: z.string().email(),
    role: userRoleSchema,
  })
  .strict()

export const loginInputSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict()

export const loginResponseSchema = dataResponseSchema(
  z
    .object({
      accessToken: z.string().min(1),
      tokenType: z.literal('Bearer'),
      user: userSchema,
    })
    .strict(),
)

export const currentUserResponseSchema = dataResponseSchema(userSchema)

export type UserRole = z.infer<typeof userRoleSchema>
export type User = z.infer<typeof userSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
