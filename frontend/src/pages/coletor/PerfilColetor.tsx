import { Button, Card, ErrorState, Loading } from '../../components/ui'
import CollectorStatusBadge from '../../components/collectors/CollectorStatusBadge'
import { useAuth } from '../../contexts/useAuth'
import { useCollectorProfile } from '../../hooks/useCollectorProfile'
import styles from './PerfilColetor.module.css'

export default function PerfilColetor() {
  const { user } = useAuth()
  const {
    collector,
    status,
    error,
    updating,
    updateError,
    refetch,
    setAvailability,
  } = useCollectorProfile()

  if (status === 'idle' || status === 'loading') {
    return <Loading label="Carregando perfil do coletor" />
  }

  if (status === 'error' || !collector) {
    return (
      <section className={styles.page}>
        <ErrorState
          message={error?.message ?? 'Não foi possível carregar o perfil.'}
          onRetry={refetch}
        />
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Conta do coletor</p>
        <h1>Meu perfil</h1>
      </header>
      <Card className={styles.profile}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {user?.name.slice(0, 1).toLocaleUpperCase() ?? 'C'}
          </span>
          <div>
            <h2>{user?.name ?? collector.name}</h2>
            <p>{user?.email}</p>
          </div>
        </div>
        <div className={styles.availability}>
          <span>Estado atual</span>
          <CollectorStatusBadge status={collector.status} />
        </div>
        <div className={styles.availability}>
          <span>Disponibilidade</span>
          <strong>{collector.available ? 'Disponível' : 'Indisponível'}</strong>
        </div>
        {updateError && (
          <p className={styles.updateError} role="alert">
            {updateError.message}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            variant={collector.available ? 'secondary' : 'primary'}
            disabled={updating}
            onClick={() => void setAvailability(!collector.available)}
          >
            {updating
              ? 'Atualizando...'
              : collector.available
                ? 'Ficar indisponível'
                : 'Ficar disponível'}
          </Button>
        </div>
      </Card>
    </section>
  )
}
