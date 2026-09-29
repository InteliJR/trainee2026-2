import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LoginInput } from '../../types'
import { Button, Field } from '../../components/ui'
import { useAuth } from '../../contexts/useAuth'
import { ApiError } from '../../services/api-error'
import Icon from '../../components/ui/Icon'
import RouteArtwork from '../../components/ui/RouteArtwork'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [input, setInput] = useState<LoginInput>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const user = await login(input)
      const profileHome = user.role === 'resident' ? '/morador' : '/coletor'
      const requestedPath = (location.state as { from?: string } | null)?.from
      const allowedPrefix = user.role === 'resident' ? '/morador' : '/coletor'
      const safeReturnPath =
        requestedPath === allowedPrefix ||
        requestedPath?.startsWith(`${allowedPrefix}/`)
          ? requestedPath
          : profileHome
      navigate(safeReturnPath, { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'UNAUTHORIZED') {
        setError('E-mail ou senha inválidos.')
      } else {
        setError('Não foi possível entrar. Tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-label="Reciclagem que aproxima">
        <div className="site-brand" aria-label="EcoRota">
          <span className="site-brand__mark">
            <Icon name="route" size={25} />
          </span>
          <span>
            eco<span className="site-brand__accent">rota</span>
            <span className="site-brand__dot">.</span>
          </span>
        </div>
        <div className={styles.storyContent}>
          <p className={styles.storyLabel}>
            <Icon name="leaf" size={16} /> CADA FIM É UM NOVO COMEÇO
          </p>
          <h2>
            O fim de um uso.
            <br />
            <span>
              O início de
              <br />
              um ciclo.
            </span>
          </h2>
          <p>
            Conectamos pessoas, coletas e novos destinos. A transformação começa
            com você.
          </p>
        </div>
        <RouteArtwork className={styles.art} />
        <div className={styles.storyFooter}>
          <span>RECICLAGEM QUE APROXIMA.</span>
          <Icon name="arrow" size={20} />
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="login-title">
        <span className={styles.welcomeIcon}>
          <Icon name="leaf" size={25} />
        </span>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>BEM-VINDO À ECOROTA</p>
          <h1 id="login-title">Entre na sua conta</h1>
          <p>Use seu e-mail e senha para continuar.</p>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field id="login-email" label="E-mail">
            <input
              type="email"
              placeholder="voce@exemplo.com"
              autoComplete="username"
              value={input.email}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
            />
          </Field>
          <Field id="login-password" label="Senha">
            <input
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              value={input.password}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
          </Field>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
            <Icon name="arrow" size={18} />
          </Button>
        </form>
        <p className={styles.security}>
          <Icon name="shield" size={14} />
          Acesso seguro à sua conta
        </p>
        <p className={styles.note}>
          <strong>Morador ou coletor, você faz parte dessa mudança.</strong>
          Entre para acompanhar suas coletas e seguir transformando.
        </p>
      </section>
    </main>
  )
}
