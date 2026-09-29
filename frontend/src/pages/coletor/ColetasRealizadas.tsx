import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CollectorSummary } from '../../types'
import { Button, EmptyState, ErrorState, Loading } from '../../components/ui'
import Icon from '../../components/ui/Icon'
import { useCollectorCollections } from '../../hooks/useCollectorCollections'
import { getCollectorSummary } from '../../services/dashboardService'
import { collectionDateFormatters } from '../../utils/collection-format'
import styles from './CollectorCollections.module.css'

export default function ColetasRealizadas() {
  const { collections, status, error, hasMore, loadMore, refetch } = useCollectorCollections('completed')
  const [summary, setSummary] = useState<CollectorSummary | null>(null)
  const [summaryError, setSummaryError] = useState(false)
  useEffect(() => {
    let active = true
    getCollectorSummary().then(({ data }) => { if (active) setSummary(data) }).catch(() => { if (active) setSummaryError(true) })
    return () => { active = false }
  }, [])

  return (
    <section className={styles.page}>
      <header className={styles.heading}><p className={styles.eyebrow}>SEU TRAJETO</p><h1>Coletas realizadas</h1><p>Veja os atendimentos concluídos e os pontos que você mais visitou.</p></header>
      {summaryError ? <ErrorState message="Não foi possível carregar seu resumo de coletas." /> : !summary ? <Loading label="Carregando resumo do coletor" /> : <div className={styles.summary}><div className={styles.total}><span><Icon name="check" size={23} /></span><p>COLETAS CONCLUÍDAS</p><strong>{summary.totalCompleted}</strong></div><section className={styles.frequent} aria-labelledby="frequent-title"><div><p className={styles.eyebrow}>SUAS ROTAS MAIS USADAS</p><h2 id="frequent-title">Pontos de coleta mais frequentes</h2></div>{summary.frequentPoints.length ? <ol>{summary.frequentPoints.map((point, index) => <li key={point.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{point.name}</strong><span>{point.count} {point.count === 1 ? 'coleta' : 'coletas'}</span></li>)}</ol> : <p className={styles.noPoints}>Os pontos mais frequentes aparecerão após sua primeira coleta concluída.</p>}</section></div>}
      <section className={styles.history} aria-labelledby="completed-title"><div><p className={styles.eyebrow}>HISTÓRICO</p><h2 id="completed-title">Atendimentos concluídos</h2></div>
        {status === 'error' && <ErrorState message={error?.message ?? 'Não foi possível carregar as coletas.'} onRetry={refetch} />}
        {status === 'loading' && !collections.length ? <Loading label="Carregando coletas realizadas" /> : !collections.length && status === 'success' ? <EmptyState title="Nenhuma coleta realizada" description="Quando você concluir um atendimento, ele aparecerá aqui." /> : collections.length > 0 && <><ul className={styles.list}>{collections.map((collection) => <li key={collection.id} className={styles.item}><span className={styles.itemIcon}><Icon name="check" size={22} /></span><div className={styles.itemBody}><h3>{collection.collectionPoint.name}</h3><p>{collection.resident.name}</p><time dateTime={collection.updatedAt}>{collectionDateFormatters.medium.format(new Date(collection.updatedAt))}</time></div><Link className={styles.detail} to={`/coletor/coletas/${collection.id}`}>Ver detalhes<Icon name="arrow" size={17} /></Link></li>)}</ul>{hasMore && <Button variant="secondary" onClick={loadMore} disabled={status === 'loading'}>Carregar mais</Button>}</>}
      </section>
    </section>
  )
}
