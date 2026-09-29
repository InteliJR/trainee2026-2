import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { CollectionStatus } from '../../types'
import { Button, ErrorState, Loading, StatusBadge } from '../../components/ui'
import { ApiError } from '../../services/api-error'
import { cancelCollection, getCollection } from '../../services/coletasService'
import { useLiveResource } from '../../hooks/useLiveResource'
import { createPollingStrategy } from '../../services/sync'
import {
  collectionDateFormatters,
  materialLabels,
  unitLabels,
} from '../../utils/collection-format'
import { getErrorMessage } from '../../utils/error-messages'
import Icon from '../../components/ui/Icon'
import styles from './AcompanharColeta.module.css'

const pollingStrategy = createPollingStrategy()
const terminalStatuses: CollectionStatus[] = ['completed', 'cancelled']

export default function AcompanharColeta() {
  const { id = '' } = useParams()
  const loadCollection = useCallback(
    async () => (await getCollection(id)).data,
    [id],
  )
  const {
    data: collection,
    status,
    error,
    refetch,
    setData,
  } = useLiveResource(
    loadCollection,
    pollingStrategy,
    (current) => !terminalStatuses.includes(current.status),
  )
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cannotCancel, setCannotCancel] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  if (status === 'idle' || (status === 'loading' && !collection)) {
    return <Loading label="Carregando acompanhamento da coleta" />
  }

  if (status === 'error' || !collection) {
    return (
      <section className={styles.page}>
        <ErrorState
          message={error?.message ?? 'Não foi possível localizar esta coleta.'}
          onRetry={refetch}
        />
      </section>
    )
  }

  const showCollector =
    collection.status === 'assigned' || collection.status === 'in_service'
  const canCancel = [
    'scheduled',
    'integration_failed',
    'pending',
    'assigned',
  ].includes(collection.status)
  const collectionDate = collection.scheduledAt ?? collection.createdAt

  async function handleCancel() {
    if (!collection) return
    setCancelError(null)
    setIsCancelling(true)
    try {
      const response = await cancelCollection(collection.id)
      setData(response.data)
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === 'COLLECTION_NOT_CANCELLABLE'
      ) {
        const canRetry = collection.status === 'integration_failed'
        setCannotCancel(!canRetry)
        setCancelError(
          canRetry
            ? 'A solicitação está sendo enviada. Tente cancelar novamente em instantes.'
            : 'Esta coleta não pode mais ser cancelada.',
        )
      } else {
        setCancelError(
          getErrorMessage(cause, 'Não foi possível cancelar a coleta.'),
        )
      }
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/morador/evolucao">
        <Icon name="back" size={16} />
        Voltar ao histórico
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Acompanhamento</p>
        <h1>{collection.collectionPoint.name}</h1>
        <StatusBadge status={collection.status} />
      </header>

      {collection.status === 'integration_failed' && (
        <p role="status">
          Não foi possível confirmar a solicitação com a EcoRota. O sistema
          tentará enviá-la novamente; você também pode cancelá-la.
        </p>
      )}

      <section className={styles.section}>
        <h2 className="inline-icon">
          <Icon name="box" size={19} />
          Materiais
        </h2>
        <ul className={styles.materials}>
          {collection.materials.map((material, index) => (
            <li key={`${material.type}-${index}`}>
              <span>{materialLabels[material.type]}</span>
              <strong>
                {material.quantity} {unitLabels[material.unit]}
              </strong>
              {material.description && <small>{material.description}</small>}
            </li>
          ))}
        </ul>
      </section>

      {canCancel && (
        <section className={styles.cancelSection}>
          {cancelError && (
            <p className={styles.cancelNotice} role="alert">
              {cancelError}
            </p>
          )}
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={isCancelling || cannotCancel}
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar coleta'}
          </Button>
        </section>
      )}

      <section className={styles.section}>
        <h2 className="inline-icon">
          <Icon name="info" size={19} />
          Detalhes
        </h2>
        <dl className={styles.details}>
          <div>
            <dt>
              {collection.scheduledAt ? 'Agendada para' : 'Solicitada em'}
            </dt>
            <dd>
              <time dateTime={collectionDate}>
                {collectionDateFormatters.long.format(new Date(collectionDate))}
              </time>
            </dd>
          </div>
          {showCollector && collection.collector && (
            <div>
              <dt>Coletor</dt>
              <dd>{collection.collector.name}</dd>
            </div>
          )}
          {collection.notes && (
            <div>
              <dt>Observações</dt>
              <dd>{collection.notes}</dd>
            </div>
          )}
        </dl>
      </section>
    </section>
  )
}
