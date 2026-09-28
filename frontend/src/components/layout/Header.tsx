import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { getHomePath } from '../../routes/paths'
import { Button } from '../ui'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const homePath = getHomePath(user?.role ?? 'resident')
  const profileLabel = user?.role === 'collector' ? 'Coletor' : 'Morador'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="site-header">
      <NavLink
        className="site-brand"
        to={homePath}
        aria-label="EcoRota, início"
      >
        <span className="site-brand__mark" aria-hidden="true">
          E
        </span>
        <span>EcoRota</span>
      </NavLink>
      <nav className="site-nav" aria-label="Navegação principal">
        {user?.role === 'collector' ? (
          <>
            <NavLink to="/coletor" end>
              Atendimento
            </NavLink>
            <NavLink to="/coletor/perfil">Perfil</NavLink>
          </>
        ) : (
          <NavLink to={homePath}>{profileLabel}</NavLink>
        )}
      </nav>
      <div className="site-account">
        <span>{user?.name}</span>
        <Button variant="ghost" onClick={handleLogout}>
          Sair
        </Button>
      </div>
    </header>
  )
}
