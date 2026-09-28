import { useState } from 'react'
import type { CollectionStatus } from '../../types'
import { Button } from '../ui'
import styles from './AssignmentActions.module.css'

export type AssignmentActionsProps = {
  status: CollectionStatus
  completing: boolean
  error: string | null
  onComplete: () => void
  onClearError: () => void
}

export default function AssignmentActions({
  status,
  completing,
  error,
  onComplete,
  onClearError,
}: AssignmentActionsProps) {
  const [confirming, setConfirming] = useState(false)

  if (status === 'assigned') {
    return (
      <section className={styles.actions}>
        <p className={styles.notice}>
          A conclusão será liberada quando você chegar ao ponto de coleta.
        </p>
        <Button disabled>Concluir coleta</Button>
      </section>
    )
  }

  if (status === 'completed') {
    return (
      <p className={styles.success} role="status">
        Coleta concluída.
      </p>
    )
  }

  if (status === 'cancelled') {
    return (
      <p className={styles.notice} role="status">
        Esta coleta foi cancelada pelo morador.
      </p>
    )
  }

  if (status !== 'in_service') return null

  return (
    <section className={styles.actions}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {confirming ? (
        <div className={styles.confirmation}>
          <span>Confirmar conclusão desta coleta?</span>
          <div className={styles.buttons}>
            <Button
              variant="primary"
              onClick={() => {
                onClearError()
                onComplete()
              }}
              disabled={completing}
            >
              {completing ? 'Concluindo...' : 'Sim, concluir'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false)
                onClearError()
              }}
              disabled={completing}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => {
            onClearError()
            setConfirming(true)
          }}
        >
          Concluir coleta
        </Button>
      )}
    </section>
  )
}
