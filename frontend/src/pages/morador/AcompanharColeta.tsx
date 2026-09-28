import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Collection, MaterialType, MaterialUnit } from '../../types'
import { ErrorState, Loading, StatusBadge } from '../../components/ui'
import { getCollection } from '../../services/coletasService'
import styles from './AcompanharColeta.module.css'

const materialLabels: Record<MaterialType, string> = {
  paper: 'Papel',
  plastic: 'Plástico',
  glass: 'Vidro',
  metal: 'Metal',
  electronics: 'Eletrônicos',
  other: 'Outro',
}

const unitLabels: Record<MaterialUnit, string> = {
  kg: 'kg',
  units: 'unidades',
  bags: 'sacos',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

type LoadStatus = 'loading' | 'error' | 'success'

export default function AcompanharColeta() {
  const { id = '' } = useParams()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  const refetch = useCallback(() => {
    setStatus('loading')
    setError(null)
    setRequestVersion((version) => version + 1)
  }, [])

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
  const collectionDate = collection.scheduledAt ?? collection.createdAt

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

      <section className={styles.section}>
        <h2>Detalhes</h2>
        <dl className={styles.details}>
          <div>
            <dt>
              {collection.scheduledAt ? 'Agendada para' : 'Solicitada em'}
            </dt>
            <dd>
              <time dateTime={collectionDate}>
                {dateFormatter.format(new Date(collectionDate))}
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
