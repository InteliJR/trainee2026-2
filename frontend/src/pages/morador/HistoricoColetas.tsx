import { useEffect, useState } from 'react'
import type { ResidentDashboard } from '../../types'
import CollectionHistoryList from '../../components/collections/CollectionHistoryList'
import { ErrorState, Loading } from '../../components/ui'
import { useCollectionHistory } from '../../hooks/useCollectionHistory'
import { getResidentDashboard } from '../../services/dashboardService'
import { materialLabels } from '../../utils/collection-format'
import styles from './HistoricoColetas.module.css'

export default function HistoricoColetas() {
  const history = useCollectionHistory()
  const [dashboard, setDashboard] = useState<ResidentDashboard | null>(null)
  const [dashboardError, setDashboardError] = useState(false)
  useEffect(() => {
    let active = true
    getResidentDashboard().then(({ data }) => { if (active) setDashboard(data) }).catch(() => { if (active) setDashboardError(true) })
    return () => { active = false }
  }, [])
  const materials = dashboard ? [...dashboard.materialCounts].sort((a, b) => b.count - a.count).slice(0, 3) : []

  return (
    <section className={styles.page}>
      <header className={styles.heading}><p className={styles.eyebrow}>SEU CAMINHO</p><h1>Evolução</h1><p>Acompanhe coletas ativas, finalizadas e os materiais que você destinou.</p></header>
      {dashboardError ? <ErrorState message="Não foi possível carregar seus dados de evolução." /> : !dashboard ? <Loading label="Carregando dados de evolução" /> : <>
        <div className={styles.stats}><div><span>TOTAL DE COLETAS</span><strong>{dashboard.total}</strong></div><div><span>ATIVAS</span><strong>{dashboard.active}</strong></div><div><span>CONCLUÍDAS</span><strong>{dashboard.completed}</strong></div><div><span>CANCELADAS</span><strong>{dashboard.cancelled}</strong></div></div>
        <section className={styles.materials} aria-labelledby="material-title"><div><p className={styles.eyebrow}>DADOS RELEVANTES</p><h2 id="material-title">Materiais registrados</h2><p>Tipos informados em todas as suas solicitações de coleta.</p></div>{materials.length ? <ul>{materials.map((material) => <li key={material.type}><strong>{materialLabels[material.type]}</strong><span>{material.count} {material.count === 1 ? 'registro' : 'registros'}</span></li>)}</ul> : <p>Seus materiais aparecerão depois da primeira coleta.</p>}</section>
      </>}
      <section className={styles.history} aria-labelledby="history-title"><div><p className={styles.eyebrow}>ATIVAS E FINALIZADAS</p><h2 id="history-title">Histórico de coletas</h2></div>
        <CollectionHistoryList collections={history.collections} status={history.status} error={history.error} hasMore={history.hasMore} statusFilter={history.statusFilter} stageFilter={history.stageFilter} loadMore={history.loadMore} setStatusFilter={history.setStatusFilter} setStageFilter={history.setStageFilter} onRetry={history.refetch} />
      </section>
    </section>
  )
}
