import { z } from 'zod'

import { collectionSchema } from './collections.js'
import { dataResponseSchema, uuidSchema } from './common.js'

export const collectorStatusSchema = z.enum(['idle', 'moving', 'collecting', 'unavailable'])

export const collectorSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
    available: z.boolean(),
    status: collectorStatusSchema,
  })
  .strict()

export const updateAvailabilityInputSchema = z
  .object({
    available: z.boolean(),
  })
  .strict()

export const collectorResponseSchema = dataResponseSchema(collectorSchema)
export const assignmentResponseSchema = dataResponseSchema(collectionSchema.nullable())

export type CollectorStatus = z.infer<typeof collectorStatusSchema>
export type Collector = z.infer<typeof collectorSchema>
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityInputSchema>
