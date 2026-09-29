import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { MaterialType, MaterialUnit } from '../../types'
import { Card, ErrorState, Loading, StatusBadge } from '../../components/ui'
import AssignmentActions from '../../components/collectors/AssignmentActions'
import { useCompleteCollection } from '../../hooks/useCompleteCollection'
import { useLiveResource } from '../../hooks/useLiveResource'
import { getCollectorCollection } from '../../services/coletoresService'
import { ApiError } from '../../services/api-error'
import { createPollingStrategy } from '../../services/sync'
import {
  collectionDateFormatters,
  materialLabels,
  unitLabels,
} from '../../utils/collection-format'
import Icon from '../../components/ui/Icon'
import styles from './DetalheAtendimento.module.css'

const pollingStrategy = createPollingStrategy()

export default function DetalheAtendimento() {
  const { id = '' } = useParams()
  const loadCollection = useCallback(async () => {
    return (await getCollectorCollection(id)).data
  }, [id])
  const {
    data: collection,
    status,
    error,
    refetch,
    setData,
  } = useLiveResource(
    loadCollection,
    pollingStrategy,
    (current) =>
      current.status === 'assigned' || current.status === 'in_service',
  )
  const {
    completing,
    error: completionError,
    errorCode,
    complete,
    clearError,
  } = useCompleteCollection()

  if (status === 'idle' || (status === 'loading' && collection === null)) {
    return <Loading label="Carregando detalhes do atendimento" />
  }

  if (
    (status === 'error' && collection === null) ||
    (error instanceof ApiError && error.code === 'RESOURCE_NOT_FOUND')
  ) {
    return (
      <section className={styles.page}>
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar o atendimento.'}
          onRetry={refetch}
        />
      </section>
    )
  }

  if (!collection) return <Loading label="Carregando detalhes do atendimento" />

  const collectionDate = collection.scheduledAt ?? collection.createdAt

  async function handleComplete() {
    if (!collection) return
    const result = await complete(collection.id)
    if (result.collection) {
      setData(result.collection)
      return
    }
    if (
      result.errorCode === 'COLLECTION_NOT_COMPLETABLE' ||
      result.errorCode === 'NO_ACTIVE_ASSIGNMENT'
    ) {
      refetch()
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/coletor">
        <Icon name="back" size={16} />
        Voltar à coleta atual
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Detalhes do atendimento</p>
        <h1>{collection.collectionPoint.name}</h1>
        <StatusBadge status={collection.status} />
      </header>

      {error && (
        <ErrorState
          message={
            error?.message ?? 'Não foi possível atualizar o atendimento.'
          }
          onRetry={refetch}
        />
      )}

      <AssignmentActions
        status={collection.status}
        completing={completing}
        error={completionError}
        onComplete={() => void handleComplete()}
        onClearError={clearError}
      />
      {collection.status === 'completed' && (
        <div className={styles.completionSuccess} role="status">
          <p>Coleta concluída</p>
          <Link className={styles.backLink} to="/coletor">
            Ver próxima coleta
          </Link>
        </div>
      )}
      {errorCode === 'NO_ACTIVE_ASSIGNMENT' && (
        <Link className={styles.backLink} to="/coletor">
          <Icon name="back" size={16} />
          Voltar à coleta atual
        </Link>
      )}

      <Card className={styles.card}>
        <section className={styles.section}>
          <h2>Morador</h2>
          <p>{collection.resident.name}</p>
        </section>

        <section className={styles.section}>
          <h2 className="inline-icon">
            <Icon name="box" size={19} />
            Materiais
          </h2>
          <ul className={styles.materials}>
            {collection.materials.map((material, index) => (
              <li key={`${material.type}-${index}`}>
                <div>
                  <strong>
                    {materialLabels[material.type as MaterialType]}
                  </strong>
                  <span>
                    {material.quantity}{' '}
                    {unitLabels[material.unit as MaterialUnit]}
                  </span>
                </div>
                {material.description && <p>{material.description}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>{collection.scheduledAt ? 'Agendamento' : 'Solicitada em'}</h2>
          <p>
            <time dateTime={collectionDate}>
              {collectionDateFormatters.long.format(new Date(collectionDate))}
            </time>
          </p>
        </section>

        {collection.notes && (
          <section className={styles.section}>
            <h2>Observações</h2>
            <p>{collection.notes}</p>
          </section>
        )}
      </Card>
    </section>
  )
}
