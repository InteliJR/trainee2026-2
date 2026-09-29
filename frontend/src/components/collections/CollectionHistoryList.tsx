import type { Collection, CollectionStatus } from '../../types'
import type { CollectionHistoryStatus } from '../../hooks/useCollectionHistory'
import { Button, EmptyState, ErrorState, Field, Loading } from '../ui'
import CollectionHistoryItem from './CollectionHistoryItem'
import styles from './CollectionHistoryList.module.css'

export type CollectionHistoryListProps = {
  collections: Collection[]
  status: CollectionHistoryStatus
  error: Error | null
  hasMore: boolean
  statusFilter: CollectionStatus | undefined
  stageFilter: 'active' | 'finished' | undefined
  loadMore: () => void
  setStatusFilter: (status: CollectionStatus | undefined) => void
  setStageFilter: (stage: 'active' | 'finished' | undefined) => void
  onRetry: () => void
}

const statusOptions: { value: CollectionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'pending', label: 'Pendente' },
  { value: 'assigned', label: 'Atribuída' },
  { value: 'in_service', label: 'Em atendimento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'integration_failed', label: 'Falha na integração' },
]

export default function CollectionHistoryList({
  collections,
  status,
  error,
  hasMore,
  statusFilter,
  stageFilter,
  loadMore,
  setStatusFilter,
  setStageFilter,
  onRetry,
}: CollectionHistoryListProps) {
  let content

  if (collections.length === 0) {
    if (status === 'loading' || status === 'idle') {
      content = <Loading label="Carregando histórico de coletas" />
    } else if (status === 'error') {
      content = (
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar o histórico.'}
          onRetry={onRetry}
        />
      )
    } else {
      content = (
        <EmptyState
          title="Nenhuma coleta no histórico"
          description="Suas solicitações de coleta aparecerão aqui."
        />
      )
    }
  } else {
    content = (
      <div className={styles.history}>
        {status === 'error' && (
          <ErrorState
            message={
              error?.message ?? 'Não foi possível carregar mais coletas.'
            }
            onRetry={onRetry}
          />
        )}
        <ul className={styles.items} aria-label="Histórico de coletas">
          {collections.map((collection) => (
            <li key={collection.id}>
              <CollectionHistoryItem collection={collection} />
            </li>
          ))}
        </ul>
        {status === 'loading' && <Loading label="Carregando mais coletas" />}
        <div className={styles.loadMore}>
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={!hasMore || status === 'loading'}
          >
            Carregar mais
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.stageFilters} role="group" aria-label="Etapa das coletas">
        <Button variant={stageFilter === undefined && !statusFilter ? 'primary' : 'secondary'} onClick={() => setStageFilter(undefined)}>Todas</Button>
        <Button variant={stageFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setStageFilter('active')}>Ativas</Button>
        <Button variant={stageFilter === 'finished' ? 'primary' : 'secondary'} onClick={() => setStageFilter('finished')}>Finalizadas</Button>
      </div>
      <Field id="collection-status-filter" label="Filtrar por status">
        <select
          value={statusFilter ?? ''}
          onChange={(event) =>
            setStatusFilter(
              (event.target.value as CollectionStatus | '') || undefined,
            )
          }
        >
          <option value="">Todos os status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      {content}
    </div>
  )
}
