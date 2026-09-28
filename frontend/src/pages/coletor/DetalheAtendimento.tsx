import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { MaterialType, MaterialUnit } from '../../types'
import { Card, ErrorState, Loading, StatusBadge } from '../../components/ui'
import { useLiveResource } from '../../hooks/useLiveResource'
import { getCollection } from '../../services/coletasService'
import { createPollingStrategy } from '../../services/sync'
import {
  collectionDateFormatters,
  materialLabels,
  unitLabels,
} from '../../utils/collection-format'
import styles from './DetalheAtendimento.module.css'

const pollingStrategy = createPollingStrategy()

export default function DetalheAtendimento() {
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
  } = useLiveResource(loadCollection, pollingStrategy)

  if (status === 'idle' || (status === 'loading' && collection === null)) {
    return <Loading label="Carregando detalhes do atendimento" />
  }

  if (status === 'error' && collection === null) {
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

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/coletor">
        Voltar à coleta atual
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Detalhes do atendimento</p>
        <h1>{collection.collectionPoint.name}</h1>
        <StatusBadge status={collection.status} />
      </header>

      {status === 'error' && (
        <ErrorState
          message={
            error?.message ?? 'Não foi possível atualizar o atendimento.'
          }
          onRetry={refetch}
        />
      )}

      <Card className={styles.card}>
        <section className={styles.section}>
          <h2>Morador</h2>
          <p>{collection.resident.name}</p>
        </section>

        <section className={styles.section}>
          <h2>Materiais</h2>
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
          <h2>Agendamento</h2>
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
