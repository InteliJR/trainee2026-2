import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CollectionPoint, ResidentDashboard } from '../../types'
import CollectionPointList from '../../components/collection-points/CollectionPointList'
import { ErrorState, Loading, StatusBadge } from '../../components/ui'
import Icon from '../../components/ui/Icon'
import RouteArtwork from '../../components/ui/RouteArtwork'
import { useCollectionPoints } from '../../hooks/useCollectionPoints'
import { getResidentDashboard } from '../../services/dashboardService'
import { collectionDateFormatters } from '../../utils/collection-format'
import styles from './MoradorHome.module.css'

export default function MoradorHome() {
  const navigate = useNavigate()
  const { points, status, error, refetch } = useCollectionPoints()
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null)
  const [dashboard, setDashboard] = useState<ResidentDashboard | null>(null)
  const [dashboardError, setDashboardError] = useState(false)

  useEffect(() => {
    let active = true
    getResidentDashboard().then(({ data }) => { if (active) setDashboard(data) }).catch(() => { if (active) setDashboardError(true) })
    return () => { active = false }
  }, [])

  function continueToRequest() {
    if (selectedPoint) navigate(`/morador/solicitar/${selectedPoint.id}`)
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>COLETAS / UM NOVO CICLO</p><h1>Seu impacto começa aqui.</h1><p>Crie uma coleta e acompanhe os próximos passos dos seus recicláveis.</p></div>
        <Link className={styles.historyLink} to="/morador/evolucao"><Icon name="history" size={17} />Ver evolução<Icon name="arrow" size={16} /></Link>
      </header>
      <section className={styles.hero} aria-labelledby="cycle-title">
        <div className={styles.heroCopy}><span className={styles.heroLabel}><Icon name="recycle" size={16} /> DO DESCARTE À TRANSFORMAÇÃO</span>
          <h2 id="cycle-title">Pequenos gestos.<br /><span>Novos caminhos.</span></h2>
          <p>Separe seus recicláveis. A gente conecta você ao próximo destino deles.</p>
          <a href="#pontos" className={styles.heroLink}>Criar nova coleta<Icon name="arrow" size={17} /></a>
        </div>
        <RouteArtwork className={styles.heroArt} /><span className={styles.heroCaption}>CONECTAR. COLETAR. RECOMEÇAR.</span>
      </section>
      <div className={styles.dashboard}>
        <section id="pontos" className={styles.points} aria-labelledby="points-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / CRIAR NOVA COLETA</p><h2 id="points-title">Escolha um ponto de coleta</h2></div>{status === 'success' && <span className={styles.pointCount}>{String(points.length).padStart(2, '0')} PONTOS</span>}</div>
          <p className={styles.sectionDescription}>Selecione o ponto mais conveniente para entregar seus recicláveis.</p>
          <CollectionPointList points={points} status={status} error={error} onRetry={refetch} selectedId={selectedPoint?.id ?? null} onSelect={setSelectedPoint} onContinue={continueToRequest} />
          <div className={styles.tip}><Icon name="info" size={18} /><p><strong>Um cuidado que faz a diferença</strong>Entregue os materiais limpos, secos e separados por tipo.</p></div>
        </section>
        <aside className={styles.current} aria-labelledby="current-title">
          <div className={styles.currentHeading}><span className={styles.rewardIcon}><Icon name="route" size={20} /></span><div><p className={styles.eyebrow}>02 / ACOMPANHAR</p><h2 id="current-title">Coletas atuais</h2></div></div>
          {dashboardError ? <ErrorState message="Não foi possível carregar suas coletas atuais." /> : !dashboard ? <Loading label="Carregando coletas atuais" /> : dashboard.activeCollections.length ? <>
            <p className={styles.currentCount}>{dashboard.active} {dashboard.active === 1 ? 'coleta ativa' : 'coletas ativas'}</p>
            <ul className={styles.currentList}>{dashboard.activeCollections.map((collection) => <li key={collection.id}><div><strong>{collection.collectionPoint.name}</strong><StatusBadge status={collection.status} /></div><time dateTime={collection.scheduledAt ?? collection.createdAt}>{collectionDateFormatters.medium.format(new Date(collection.scheduledAt ?? collection.createdAt))}</time><Link to={`/morador/coletas/${collection.id}`}>Acompanhar coleta<Icon name="arrow" size={15} /></Link></li>)}</ul>
            {dashboard.active > dashboard.activeCollections.length && <Link className={styles.allCurrent} to="/morador/evolucao">Ver todas as coletas ativas<Icon name="arrow" size={15} /></Link>}
          </> : <div className={styles.currentEmpty}><Icon name="leaf" size={30} /><p>Nenhuma coleta em andamento.</p><span>Quando você criar uma coleta, ela aparecerá aqui.</span></div>}
        </aside>
      </div>
    </section>
  )
}
