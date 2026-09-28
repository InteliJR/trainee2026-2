import { Link } from 'react-router-dom'
import CollectionHistoryList from '../../components/collections/CollectionHistoryList'
import { useCollectionHistory } from '../../hooks/useCollectionHistory'
import styles from './HistoricoColetas.module.css'

export default function HistoricoColetas() {
  const history = useCollectionHistory()

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/morador">
        Voltar aos pontos de coleta
      </Link>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Morador</p>
        <h1>Histórico de coletas</h1>
        <p>Acompanhe suas solicitações e coletas anteriores.</p>
      </div>
      <CollectionHistoryList
        collections={history.collections}
        status={history.status}
        error={history.error}
        hasMore={history.hasMore}
        statusFilter={history.statusFilter}
        loadMore={history.loadMore}
        setStatusFilter={history.setStatusFilter}
        onRetry={history.refetch}
      />
    </section>
  )
}
