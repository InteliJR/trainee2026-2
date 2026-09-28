import type { MaterialType, MaterialUnit } from '../../types'
import {
  materialTypeOptions,
  materialUnitOptions,
} from '../../utils/collection-format'
import { Button, Field } from '../ui'
import styles from './MaterialField.module.css'

export type MaterialDraft = {
  type: MaterialType
  quantity: number
  unit: MaterialUnit
  description: string
}

export type MaterialFieldErrors = Partial<Record<keyof MaterialDraft, string>>

export type MaterialFieldProps = {
  index: number
  value: MaterialDraft
  errors?: MaterialFieldErrors
  canRemove?: boolean
  onChange: (value: MaterialDraft) => void
  onRemove?: () => void
}

export default function MaterialField({
  index,
  value,
  errors = {},
  canRemove = false,
  onChange,
  onRemove,
}: MaterialFieldProps) {
  const fieldId = `material-${index}`

  return (
    <fieldset className={styles.material}>
      <legend className={styles.legend}>Material {index + 1}</legend>
      {canRemove && onRemove && (
        <Button
          className={styles.remove}
          variant="ghost"
          type="button"
          onClick={onRemove}
          aria-label={`Remover material ${index + 1}`}
        >
          Remover
        </Button>
      )}
      <div className={styles.fields}>
        <Field
          id={`${fieldId}-type`}
          label="Tipo de material"
          error={errors.type}
        >
          <select
            value={value.type}
            onChange={(event) =>
              onChange({ ...value, type: event.target.value as MaterialType })
            }
            required
          >
            {materialTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${fieldId}-quantity`}
          label="Quantidade"
          error={errors.quantity}
        >
          <input
            type="number"
            min="0.01"
            step={value.unit === 'kg' ? '0.01' : '1'}
            value={value.quantity || ''}
            onChange={(event) =>
              onChange({
                ...value,
                quantity: Number(event.target.value) || 0,
              })
            }
            required
          />
        </Field>
        <Field id={`${fieldId}-unit`} label="Unidade" error={errors.unit}>
          <select
            value={value.unit}
            onChange={(event) =>
              onChange({ ...value, unit: event.target.value as MaterialUnit })
            }
          >
            {materialUnitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${fieldId}-description`}
          label="Descrição (opcional)"
          error={errors.description}
        >
          <input
            type="text"
            maxLength={120}
            value={value.description}
            onChange={(event) =>
              onChange({ ...value, description: event.target.value })
            }
            required={value.type === 'other'}
          />
        </Field>
      </div>
    </fieldset>
  )
}
