import { z } from 'zod'

import { dataResponseSchema, uuidSchema } from './common.js'

export const collectionPointKindSchema = z.enum(['habitual', 'additional'])

export const collectionPointSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
    kind: collectionPointKindSchema,
    coordinates: z.tuple([z.number(), z.number()]),
  })
  .strict()

export const collectionPointListResponseSchema = dataResponseSchema(
  z.array(collectionPointSchema),
)
export const collectionPointResponseSchema = dataResponseSchema(collectionPointSchema)

export type CollectionPoint = z.infer<typeof collectionPointSchema>
