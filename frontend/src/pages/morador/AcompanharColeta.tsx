import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Collection } from '../../types'
import { Button, ErrorState, Loading, StatusBadge } from '../../components/ui'
import { ApiError } from '../../services/api-error'
import { cancelCollection, getCollection } from '../../services/coletasService'
import {
  collectionDateFormatters,
  materialLabels,
  unitLabels,
} from '../../utils/collection-format'
import styles from './AcompanharColeta.module.css'

type LoadStatus = 'loading' | 'error' | 'success'

export default function AcompanharColeta() {
  const { id = '' } = useParams()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cannotCancel, setCannotCancel] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  const refetch = useCallback((silent = false) => {
    if (!silent) setStatus('loading')
    setError(null)
    setRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => refetch(true), 15_000)
    return () => window.clearInterval(intervalId)
  }, [refetch])

  useEffect(() => {
    let active = true

    getCollection(id)
      .then((response) => {
        if (!active) return
        setCollection(response.data)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [id, requestVersion])

  if (status === 'loading') {
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
  const canCancel = ['scheduled', 'pending', 'assigned'].includes(
    collection.status,
  )
  const collectionDate = collection.scheduledAt ?? collection.createdAt

  async function handleCancel() {
    if (!collection) return
    setCancelError(null)
    setIsCancelling(true)
    try {
      const response = await cancelCollection(collection.id)
      setCollection(response.data)
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === 'COLLECTION_NOT_CANCELLABLE'
      ) {
        setCannotCancel(true)
        setCancelError('Esta coleta não pode mais ser cancelada.')
      } else {
        setCancelError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível cancelar a coleta.',
        )
      }
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/morador/historico">
        Voltar ao histórico
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Acompanhamento</p>
        <h1>{collection.collectionPoint.name}</h1>
        <StatusBadge status={collection.status} />
      </header>

      <section className={styles.section}>
        <h2>Materiais</h2>
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
        <h2>Detalhes</h2>
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
