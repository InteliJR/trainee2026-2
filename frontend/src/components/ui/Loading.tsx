import styles from './Loading.module.css'

export type LoadingProps = {
  label?: string
  className?: string
}

export default function Loading({ label, className }: LoadingProps) {
  const classes = [styles.loading, className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={label ? undefined : styles.visuallyHidden}>
        {label ?? 'Carregando'}
      </span>
    </div>
  )
}
