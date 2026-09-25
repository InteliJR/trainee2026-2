import { z } from 'zod'

export const uuidSchema = z.string().uuid()
export const isoDateTimeSchema = z.string().datetime({ offset: true })

export const idParamsSchema = z.object({ id: uuidSchema }).strict()

export const cursorQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'INVALID_SCHEDULE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'COLLECTION_NOT_CANCELLABLE',
  'COLLECTION_NOT_COMPLETABLE',
  'NO_ACTIVE_ASSIGNMENT',
  'ECOROTA_UNAVAILABLE',
  'INTERNAL_ERROR',
])

export const errorResponseSchema = z
  .object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
    requestId: z.string(),
  })
  .strict()

export function dataResponseSchema<Schema extends z.ZodType>(schema: Schema) {
  return z.object({ data: schema }).strict()
}

export function paginatedResponseSchema<Schema extends z.ZodType>(schema: Schema) {
  return z
    .object({
      data: z.array(schema),
      nextCursor: z.string().nullable(),
    })
    .strict()
}

export type CursorQuery = z.infer<typeof cursorQuerySchema>
export type IdParams = z.infer<typeof idParamsSchema>
export type ErrorCode = z.infer<typeof errorCodeSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
