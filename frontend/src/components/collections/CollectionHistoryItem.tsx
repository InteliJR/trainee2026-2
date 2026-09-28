import type { Collection } from '../../types'
import { Card, StatusBadge } from '../ui'
import {
  collectionDateFormatters,
  materialLabels,
  unitLabels,
} from '../../utils/collection-format'
import styles from './CollectionHistoryItem.module.css'

export type CollectionHistoryItemProps = {
  collection: Collection
}

export default function CollectionHistoryItem({
  collection,
}: CollectionHistoryItemProps) {
  const collectionDate = collection.scheduledAt ?? collection.createdAt

  return (
    <Card className={styles.item}>
      <div className={styles.heading}>
        <div className={styles.location}>
          <span className={styles.label}>Ponto de coleta</span>
          <h2>{collection.collectionPoint.name}</h2>
        </div>
        <StatusBadge status={collection.status} />
      </div>

      <ul className={styles.materials} aria-label="Materiais">
        {collection.materials.map((material, index) => (
          <li key={`${material.type}-${index}`}>
            <span>{materialLabels[material.type]}</span>
            <strong>
              {material.quantity} {unitLabels[material.unit]}
            </strong>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <time dateTime={collectionDate}>
          {collectionDateFormatters.medium.format(new Date(collectionDate))}
        </time>
        {collection.status === 'completed' &&
          collection.pointsAwarded !== null && (
            <span className={styles.points}>
              +{collection.pointsAwarded} pontos
            </span>
          )}
      </div>
    </Card>
  )
}
