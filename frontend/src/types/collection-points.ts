// Espelho manual dos contratos do backend; mantenha sincronizado com os schemas Zod.
export type CollectionPointKind = 'habitual' | 'additional'

export type CollectionPoint = {
  id: string
  name: string
  kind: CollectionPointKind
  coordinates: [number, number]
}
