import type { CollectionPoint } from '../../types'
import type { CollectionPointsStatus } from '../../hooks/useCollectionPoints'
import { Button, EmptyState, ErrorState, Loading } from '../ui'
import CollectionPointCard from './CollectionPointCard'
import styles from './CollectionPointList.module.css'

export type CollectionPointListProps = {
  points: CollectionPoint[]
  status: CollectionPointsStatus
  error: Error | null
  onRetry: () => void
  selectedId: string | null
  onSelect: (point: CollectionPoint) => void
  onContinue?: () => void
}

export default function CollectionPointList({
  points,
  status,
  error,
  onRetry,
  selectedId,
  onSelect,
  onContinue,
}: CollectionPointListProps) {
  if (status === 'loading' || status === 'idle') {
    return <Loading label="Buscando pontos de coleta" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={
          error?.message ?? 'Não foi possível carregar os pontos de coleta.'
        }
        onRetry={onRetry}
      />
    )
  }

  if (points.length === 0) {
    return (
      <EmptyState
        title="Nenhum ponto de coleta disponível"
        description="Ainda não há pontos cadastrados para esta região."
      />
    )
  }

  const orderedPoints = [...points].sort(
    (first, second) =>
      Number(first.kind !== 'habitual') - Number(second.kind !== 'habitual'),
  )

  return (
    <div className={styles.content}>
      <div className={styles.list} aria-label="Pontos de coleta">
        {orderedPoints.map((point) => (
          <CollectionPointCard
            key={point.id}
            point={point}
            selected={point.id === selectedId}
            onClick={onSelect}
          />
        ))}
      </div>
      <div className={styles.actions}>
        <Button disabled={!selectedId} onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
