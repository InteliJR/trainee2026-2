import type { ErrorCode } from '../../types/common'
import { errorMessages } from '../../utils/error-messages'
import Button from './Button'
import styles from './ErrorState.module.css'

export type ErrorStateProps = {
  code?: ErrorCode
  message?: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({
  code = 'INTERNAL_ERROR',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const classes = [styles.errorState, className].filter(Boolean).join(' ')

  return (
    <section className={classes} role="alert" aria-live="assertive">
      <span className={styles.icon} aria-hidden="true">
        !
      </span>
      <div className={styles.content}>
        <h2>Não foi possível concluir</h2>
        <p>{message ?? errorMessages[code]}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    </section>
  )
}
