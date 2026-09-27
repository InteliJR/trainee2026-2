import { z } from 'zod'

import {
  cursorQuerySchema,
  dataResponseSchema,
  isoDateTimeSchema,
  paginatedResponseSchema,
  uuidSchema,
} from './common.js'

export const materialTypeSchema = z.enum([
  'paper',
  'plastic',
  'glass',
  'metal',
  'electronics',
  'other',
])

export const materialUnitSchema = z.enum(['kg', 'units', 'bags'])

export const collectionStatusSchema = z.enum([
  'scheduled',
  'pending',
  'assigned',
  'in_service',
  'completed',
  'cancelled',
  'integration_failed',
])

export const materialSchema = z
  .object({
    type: materialTypeSchema,
    quantity: z.number().positive(),
    unit: materialUnitSchema,
    description: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .superRefine((material, context) => {
    if (material.type === 'other' && !material.description) {
      context.addIssue({
        code: 'custom',
        message: 'Description is required when material type is other',
        path: ['description'],
      })
    }

    if (material.unit !== 'kg' && !Number.isInteger(material.quantity)) {
      context.addIssue({
        code: 'custom',
        message: 'Quantity must be an integer for units and bags',
        path: ['quantity'],
      })
    }
  })

export const createCollectionInputSchema = z
  .object({
    collectionPointId: uuidSchema,
    materials: z.array(materialSchema).min(1),
    scheduledAt: isoDateTimeSchema.optional(),
    notes: z.string().trim().min(1).max(500).optional(),
  })
  .strict()

const collectionPersonSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
  })
  .strict()

const collectionPointSummarySchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1),
  })
  .strict()

export const collectionSchema = z
  .object({
    id: uuidSchema,
    status: collectionStatusSchema,
    resident: collectionPersonSchema,
    collector: collectionPersonSchema.nullable(),
    collectionPoint: collectionPointSummarySchema,
    materials: z.array(materialSchema).min(1),
    scheduledAt: isoDateTimeSchema.nullable(),
    notes: z.string().nullable(),
    pointsAwarded: z.number().int().nonnegative().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()

export const collectionListQuerySchema = cursorQuerySchema.extend({
  status: collectionStatusSchema.optional(),
})

export const collectionResponseSchema = dataResponseSchema(collectionSchema)
export const collectionListResponseSchema = paginatedResponseSchema(collectionSchema)

export type MaterialType = z.infer<typeof materialTypeSchema>
export type MaterialUnit = z.infer<typeof materialUnitSchema>
export type Material = z.infer<typeof materialSchema>
export type CollectionStatus = z.infer<typeof collectionStatusSchema>
export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>
export type Collection = z.infer<typeof collectionSchema>
export type CollectionListQuery = z.infer<typeof collectionListQuerySchema>
