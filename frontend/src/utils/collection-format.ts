import type { Material, MaterialType, MaterialUnit } from '../types'

export const materialLabels: Record<MaterialType, string> = {
  paper: 'Papel',
  plastic: 'Plástico',
  glass: 'Vidro',
  metal: 'Metal',
  electronics: 'Eletrônicos',
  other: 'Outro',
}

export const unitLabels: Record<MaterialUnit, string> = {
  kg: 'kg',
  units: 'unidades',
  bags: 'sacos',
}

export const materialTypeOptions = Object.entries(materialLabels).map(
  ([value, label]) => ({ value: value as MaterialType, label }),
)

export const materialUnitOptions: { value: MaterialUnit; label: string }[] = [
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'units', label: 'Unidades' },
  { value: 'bags', label: 'Sacos' },
]

export const collectionDateFormatters = {
  medium: new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
  long: new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }),
}

export function formatMaterial(material: Material): string {
  return `${materialLabels[material.type]} · ${material.quantity} ${unitLabels[material.unit]}`
}
