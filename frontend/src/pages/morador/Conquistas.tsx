import { useEffect, useState } from 'react'
import type { RewardBalance } from '../../types'
import { getRewardBalance } from '../../services/rewardsService'
import { collectionBadges, nextBadge } from '../../utils/badges'
import { ErrorState, Loading } from '../../components/ui'
import Icon from '../../components/ui/Icon'
import styles from './Conquistas.module.css'

export default function Conquistas() {
  const [balance, setBalance] = useState<RewardBalance | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    getRewardBalance().then(({ data }) => { if (active) setBalance(data) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  const next = balance ? nextBadge(balance.completedCollections) : null

  return (
    <section className={styles.page}>
      <header className={styles.heading}><p className={styles.eyebrow}>SEU CAMINHO ATÉ AQUI</p><h1>Conquistas</h1><p>Cada coleta concluída é um passo a mais para novos ciclos.</p></header>
      {error ? <ErrorState message="Não foi possível carregar suas conquistas." /> : !balance ? <Loading label="Carregando conquistas" /> : <>
        <div className={styles.overview}>
          <div className={styles.balance}><span className={styles.symbol}><Icon name="leaf" size={28} /></span><p>PONTOS NO SALDO</p><strong>{balance.balance.toLocaleString('pt-BR')}</strong><span>Disponíveis pelas suas coletas concluídas.</span></div>
          <div className={styles.progressCard}><span className={styles.symbol}><Icon name="route" size={28} /></span><p>COLETAS CONCLUÍDAS</p><strong>{String(balance.completedCollections).padStart(2, '0')}</strong><span>{next ? `Faltam ${next.goal - balance.completedCollections} para ${next.name}.` : 'Você completou todas as conquistas disponíveis.'}</span>
            {next && <progress value={balance.completedCollections} max={next.goal} aria-label="Progresso para a próxima conquista" />}
          </div>
        </div>
        <section className={styles.badgeSection} aria-labelledby="badge-title"><div className={styles.sectionHeading}><p className={styles.eyebrow}>MARCOS DA SUA JORNADA</p><h2 id="badge-title">Seus marcos</h2></div>
          <ul className={styles.badges}>{collectionBadges.map((badge) => {
            const unlocked = balance.completedCollections >= badge.goal
            return <li key={badge.goal} className={unlocked ? styles.unlocked : styles.locked}>
              <span className={styles.badgeIcon}><Icon name={unlocked ? 'award' : 'lock'} size={24} /></span>
              <div><strong>{badge.name} · {badge.goal} {badge.goal === 1 ? 'coleta' : 'coletas'}</strong><p>{unlocked ? 'Conquistado' : 'A conquistar'}</p></div>
              {unlocked && <Icon name="check" size={18} />}
            </li>
          })}</ul>
        </section>
      </>}
    </section>
  )
}
