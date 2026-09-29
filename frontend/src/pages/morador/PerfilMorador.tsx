import { useAuth } from '../../contexts/useAuth'
import Icon from '../../components/ui/Icon'
import styles from './PerfilMorador.module.css'

export default function PerfilMorador() {
  const { user } = useAuth()
  return (
    <section className={styles.page}>
      <header className={styles.heading}><p className={styles.eyebrow}>SUA CONTA</p><h1>Meu perfil</h1><p>Seus dados de identificação na EcoRota.</p></header>
      <div className={styles.card}>
        <div className={styles.identity}><span className={styles.avatar}><Icon name="user" size={28} /></span><div><h2>{user?.name}</h2><p>Morador</p></div></div>
        <dl className={styles.details}><div><dt>Nome</dt><dd>{user?.name}</dd></div><div><dt>E-mail</dt><dd>{user?.email}</dd></div><div><dt>Perfil de uso</dt><dd>Morador</dd></div></dl>
      </div>
    </section>
  )
}
