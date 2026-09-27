import type { ErrorCode } from '../../types/common'
import Button from './Button'
import styles from './ErrorState.module.css'

const errorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Confira os dados informados e tente novamente.',
  INVALID_SCHEDULE: 'A data escolhida não está disponível para agendamento.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para continuar.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  RESOURCE_NOT_FOUND: 'Não encontramos o conteúdo solicitado.',
  COLLECTION_NOT_CANCELLABLE: 'Esta coleta não pode mais ser cancelada.',
  COLLECTION_NOT_COMPLETABLE: 'Esta coleta ainda não pode ser concluída.',
  NO_ACTIVE_ASSIGNMENT: 'Você não tem uma coleta atribuída no momento.',
  ECOROTA_UNAVAILABLE: 'O serviço de coleta está temporariamente indisponível.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
}

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
