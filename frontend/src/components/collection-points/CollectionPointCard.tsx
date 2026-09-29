import type { KeyboardEvent } from 'react'
import type { CollectionPoint } from '../../types'
import Icon from '../ui/Icon'
import { Card } from '../ui'
import styles from './CollectionPointCard.module.css'

export type CollectionPointCardProps = {
  point: CollectionPoint
  selected?: boolean
  onClick: (point: CollectionPoint) => void
}

export default function CollectionPointCard({
  point,
  selected = false,
  onClick,
}: CollectionPointCardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(point)
    }
  }

  return (
    <Card
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${point.name}, ${point.kind === 'habitual' ? 'ponto habitual' : 'ponto adicional'}`}
      onClick={() => onClick(point)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.top}>
        <span className={styles.pin}>
          <Icon name="pin" size={21} />
        </span>
        <span className={styles.kind} data-kind={point.kind}>
          {point.kind === 'habitual' ? 'Habitual' : 'Adicional'}
        </span>
      </div>
      <span className={styles.name}>{point.name}</span>
      <span className={styles.coordinates}>
        {point.coordinates[0].toFixed(4)}, {point.coordinates[1].toFixed(4)}
      </span>
      <span className={styles.selection} aria-hidden="true">
        {selected ? 'Selecionado' : 'Selecionar ponto'}
        <Icon name={selected ? 'check' : 'arrow'} size={16} />
      </span>
    </Card>
  )
}
