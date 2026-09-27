import { cloneElement, isValidElement, type ReactElement } from 'react'
import styles from './Field.module.css'

type FieldControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export type FieldProps = {
  id: string
  label: string
  children: ReactElement<FieldControlProps>
  error?: string
  hint?: string
  className?: string
}

export default function Field({
  id,
  label,
  children,
  error,
  hint,
  className,
}: FieldProps) {
  const messageId = `${id}-message`
  const classes = [styles.field, className].filter(Boolean).join(' ')
  const describedBy = [
    children.props['aria-describedby'],
    error || hint ? messageId : undefined,
  ]
    .filter(Boolean)
    .join(' ')
  const control = isValidElement<FieldControlProps>(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children

  return (
    <div className={classes}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {control}
      {(error || hint) && (
        <span
          className={error ? styles.error : styles.hint}
          id={messageId}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  )
}
