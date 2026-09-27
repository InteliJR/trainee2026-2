import type { Collection } from '../../types'
import type { CollectionHistoryStatus } from '../../hooks/useCollectionHistory'
import { Button, EmptyState, ErrorState, Loading } from '../ui'
import CollectionHistoryItem from './CollectionHistoryItem'
import styles from './CollectionHistoryList.module.css'

export type CollectionHistoryListProps = {
  collections: Collection[]
  status: CollectionHistoryStatus
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  onRetry: () => void
}

export default function CollectionHistoryList({
  collections,
  status,
  error,
  hasMore,
  loadMore,
  onRetry,
}: CollectionHistoryListProps) {
  if (collections.length === 0) {
    if (status === 'loading' || status === 'idle') {
      return <Loading label="Carregando histórico de coletas" />
    }

    if (status === 'error') {
      return (
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar o histórico.'}
          onRetry={onRetry}
        />
      )
    }

    return (
      <EmptyState
        title="Nenhuma coleta no histórico"
        description="Suas solicitações de coleta aparecerão aqui."
      />
    )
  }

  return (
    <div className={styles.history}>
      {status === 'error' && (
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar mais coletas.'}
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
