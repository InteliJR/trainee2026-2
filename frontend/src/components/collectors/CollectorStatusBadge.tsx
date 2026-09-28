import type { CollectorStatus } from '../../types'
import styles from './CollectorStatusBadge.module.css'

const statusDetails: Record<CollectorStatus, { label: string; style: string }> =
  {
    idle: { label: 'Livre', style: styles.idle },
    moving: { label: 'A caminho', style: styles.moving },
    collecting: { label: 'Coletando', style: styles.collecting },
    unavailable: { label: 'Indisponível', style: styles.unavailable },
  }

export type CollectorStatusBadgeProps = {
  status: CollectorStatus
  className?: string
}

export default function CollectorStatusBadge({
  status,
  className,
}: CollectorStatusBadgeProps) {
  const details = statusDetails[status]
  const classes = [styles.badge, details.style, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{details.label}</span>
}
