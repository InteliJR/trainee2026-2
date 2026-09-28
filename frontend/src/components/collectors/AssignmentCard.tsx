import { Link } from 'react-router-dom'
import type { Collection } from '../../types'
import {
  collectionDateFormatters,
  formatMaterial,
} from '../../utils/collection-format'
import { Card, StatusBadge } from '../ui'
import styles from './AssignmentCard.module.css'

export type AssignmentCardProps = {
  collection: Collection
}

export default function AssignmentCard({ collection }: AssignmentCardProps) {
  const collectionDate = collection.scheduledAt ?? collection.createdAt

  return (
    <Card className={styles.card}>
      <header className={styles.header}>
        <div className={styles.location}>
          <span className={styles.eyebrow}>Ponto de coleta</span>
          <h2>{collection.collectionPoint.name}</h2>
        </div>
        <StatusBadge status={collection.status} />
      </header>

      <dl className={styles.details}>
        <div>
          <dt>Morador</dt>
          <dd>{collection.resident.name}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            <time dateTime={collectionDate}>
              {collectionDateFormatters.medium.format(new Date(collectionDate))}
            </time>
          </dd>
        </div>
      </dl>

      <ul className={styles.materials} aria-label="Materiais">
        {collection.materials.map((material, index) => (
          <li key={`${material.type}-${index}`}>{formatMaterial(material)}</li>
        ))}
      </ul>

      <Link className={styles.link} to={`/coletor/coletas/${collection.id}`}>
        Ver detalhes
      </Link>
    </Card>
  )
}
