import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const classes = [styles.emptyState, className].filter(Boolean).join(' ')

  return (
    <section className={classes}>
      <span className={styles.marker} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </section>
  )
}
