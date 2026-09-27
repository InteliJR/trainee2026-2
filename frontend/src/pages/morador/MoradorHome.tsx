import { useState } from 'react'
import type { CollectionPoint } from '../../types'
import CollectionPointList from '../../components/collection-points/CollectionPointList'
import { useCollectionPoints } from '../../hooks/useCollectionPoints'
import styles from './MoradorHome.module.css'

export default function MoradorHome() {
  const { points, status, error, refetch } = useCollectionPoints()
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(
    null,
  )

  function continueToRequest() {
    if (!selectedPoint) return
    // TODO: navegar para o formulário de solicitação (task 7)
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Nova coleta</p>
        <h1>Escolha um ponto de coleta</h1>
        <p>
          Selecione o ponto mais conveniente para entregar seus recicláveis.
        </p>
      </div>
      <CollectionPointList
        points={points}
        status={status}
        error={error}
        onRetry={refetch}
        selectedId={selectedPoint?.id ?? null}
        onSelect={setSelectedPoint}
        onContinue={continueToRequest}
      />
    </section>
  )
}
