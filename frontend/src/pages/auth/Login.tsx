import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LoginInput } from '../../types'
import { Button, Field } from '../../components/ui'
import { useAuth } from '../../contexts/useAuth'
import { ApiError } from '../../services/api-error'
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
      await login(input)
      const returnTo = (location.state as { from?: string } | null)?.from
      navigate(returnTo ?? '/', { replace: true })
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
      <section className={styles.panel}>
        <div className={styles.brand} aria-label="EcoRota">
          <span className={styles.brandMark} aria-hidden="true">
            E
          </span>
          <span>EcoRota</span>
        </div>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Acesso seguro</p>
          <h1>Entre na sua conta</h1>
          <p>Use seu e-mail e senha para continuar.</p>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field id="login-email" label="E-mail">
            <input
              type="email"
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
          </Button>
        </form>
      </section>
    </main>
  )
}
