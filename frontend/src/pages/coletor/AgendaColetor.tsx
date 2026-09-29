import { Link } from 'react-router-dom'
import { Button, EmptyState, ErrorState, Loading, StatusBadge } from '../../components/ui'
import Icon from '../../components/ui/Icon'
import { useCollectorCollections } from '../../hooks/useCollectorCollections'
import { collectionDateFormatters } from '../../utils/collection-format'
import styles from './CollectorCollections.module.css'

export default function AgendaColetor() {
  const { collections, status, error, hasMore, loadMore, refetch } = useCollectorCollections('today')
  const sorted = [...collections].sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt))
  return (
    <section className={styles.page}>
      <header className={styles.heading}><p className={styles.eyebrow}>SUAS ROTAS</p><h1>Agenda de hoje</h1><p>Atendimentos atribuídos a você para esta data.</p></header>
      <div className={styles.toolbar}><span><Icon name="calendar" size={18} />{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</span><Button variant="secondary" onClick={refetch}>Atualizar agenda</Button></div>
      {status === 'error' && <ErrorState message={error?.message ?? 'Não foi possível carregar a agenda.'} onRetry={refetch} />}
      {status === 'loading' && !collections.length ? <Loading label="Carregando agenda de hoje" /> : !collections.length && status === 'success' ? <EmptyState title="Nenhum atendimento planejado" description="Atendimentos atribuídos a você para hoje aparecerão aqui. Solicitações futuras entram na agenda quando forem atribuídas." /> : sorted.length > 0 && <>
        <ul className={styles.list}>{sorted.map((collection) => <li key={collection.id} className={styles.item}><span className={styles.itemIcon}><Icon name="pin" size={22} /></span><div className={styles.itemBody}><div className={styles.itemTitle}><h2>{collection.collectionPoint.name}</h2><StatusBadge status={collection.status} /></div><p>{collection.resident.name} · {collection.materials.length} {collection.materials.length === 1 ? 'material' : 'materiais'}</p><time dateTime={collection.scheduledAt ?? collection.createdAt}>{collectionDateFormatters.medium.format(new Date(collection.scheduledAt ?? collection.createdAt))}</time></div><Link to={`/coletor/coletas/${collection.id}`} className={styles.detail}>Ver atendimento<Icon name="arrow" size={17} /></Link></li>)}</ul>
        {hasMore && <Button variant="secondary" onClick={loadMore} disabled={status === 'loading'}>Carregar mais</Button>}
      </>}
    </section>
  )
}
