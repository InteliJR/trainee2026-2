import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import AssignmentCard from '../../components/collectors/AssignmentCard'
import { EmptyState, ErrorState, Loading } from '../../components/ui'
import { useLiveResource } from '../../hooks/useLiveResource'
import { getCurrentAssignment } from '../../services/coletoresService'
import { createPollingStrategy } from '../../services/sync'
import styles from './ColetorHome.module.css'

const pollingStrategy = createPollingStrategy()

export default function ColetorHome() {
  const loadAssignment = useCallback(
    async () => (await getCurrentAssignment()).data,
    [],
  )
  const {
    data: assignment,
    status,
    error,
    refetch,
  } = useLiveResource(loadAssignment, pollingStrategy)

  if (status === 'idle' || (status === 'loading' && assignment === null)) {
    return <Loading label="Buscando atendimento atual" />
  }

  if (status === 'error' && assignment === null) {
    return (
      <section className={styles.page}>
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar o atendimento.'}
          onRetry={refetch}
        />
      </section>
    )
  }

  if (!assignment) {
    return (
      <section className={styles.page}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Área do coletor</p>
          <h1>Atendimento atual</h1>
          <p className={styles.subtitle}>
            Cada rota conecta materiais a novas possibilidades.
          </p>
        </header>
        <EmptyState
          title="Nenhuma coleta atribuída"
          description="Quando uma coleta for atribuída a você, ela aparecerá aqui."
          action={
            <Link className={styles.profileLink} to="/coletor/perfil">
              Ver perfil e disponibilidade
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Área do coletor</p>
        <h1>Atendimento atual</h1>
        <p className={styles.subtitle}>
          Cada rota conecta materiais a novas possibilidades.
        </p>
      </header>
      {status === 'error' && (
        <ErrorState
          message={
            error?.message ?? 'Não foi possível atualizar o atendimento.'
          }
          onRetry={refetch}
        />
      )}
      {status === 'loading' && <Loading label="Atualizando atendimento" />}
      <AssignmentCard collection={assignment} />
    </section>
  )
}
