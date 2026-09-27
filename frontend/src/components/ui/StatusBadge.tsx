import type { CollectionStatus } from '../../types'
import styles from './StatusBadge.module.css'

const statusDetails: Record<
  CollectionStatus,
  { label: string; style: string }
> = {
  scheduled: { label: 'Agendada', style: styles.scheduled },
  pending: { label: 'Pendente', style: styles.pending },
  assigned: { label: 'Atribuída', style: styles.assigned },
  in_service: { label: 'Em atendimento', style: styles.inService },
  completed: { label: 'Concluída', style: styles.completed },
  cancelled: { label: 'Cancelada', style: styles.cancelled },
  integration_failed: {
    label: 'Falha na integração',
    style: styles.integrationFailed,
  },
}

export type StatusBadgeProps = {
  status: CollectionStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const details = statusDetails[status]
  const classes = [styles.badge, details.style, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      {status === 'in_service' && (
        <span className={styles.activeDot} aria-hidden="true" />
      )}
      {status === 'integration_failed' && (
        <span className={styles.failureIcon} aria-hidden="true">
          !
        </span>
      )}
      {details.label}
    </span>
  )
}
