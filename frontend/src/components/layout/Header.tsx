import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { getHomePath } from '../../routes/paths'
import Icon from '../ui/Icon'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const collector = user?.role === 'collector'
  const homePath = getHomePath(user?.role ?? 'resident')
  const onCollectionDetail = pathname.startsWith(collector ? '/coletor/coletas/' : '/morador/coletas/') || pathname.startsWith('/morador/solicitar/')

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="site-header">
      <NavLink className="site-brand" to={homePath} aria-label="EcoRota, início">
        <span className="site-brand__mark"><Icon name="route" size={25} /></span>
        <span>eco<span className="site-brand__accent">rota</span><span className="site-brand__dot">.</span></span>
      </NavLink>
      <div className="site-nav-group">
        <p className="site-nav-label">SEU ESPAÇO</p>
        <nav className="site-nav" aria-label="Navegação principal">
          {collector ? <>
            <NavLink to="/coletor" end className={({ isActive }) => isActive || onCollectionDetail ? 'active-tab' : ''}><Icon name="truck" />Atendimento<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/coletor/agenda"><Icon name="calendar" />Agenda<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/coletor/realizadas"><Icon name="check" />Realizadas<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/coletor/dashboard"><Icon name="grid" />Painel<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/coletor/perfil"><Icon name="user" />Perfil<Icon name="arrow" size={16} /></NavLink>
          </> : <>
            <NavLink to={homePath} end className={({ isActive }) => isActive || onCollectionDetail ? 'active-tab' : ''}><Icon name="box" />Coletas<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/morador/evolucao"><Icon name="history" />Evolução<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/morador/conquistas"><Icon name="award" />Conquistas<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/morador/dashboard"><Icon name="grid" />Painel<Icon name="arrow" size={16} /></NavLink>
            <NavLink to="/morador/perfil"><Icon name="user" />Perfil<Icon name="arrow" size={16} /></NavLink>
          </>}
        </nav>
      </div>
      <div className="site-mission">
        <span className="site-mission__icon"><Icon name="leaf" size={24} /></span>
        <p>Um novo destino.<br />Um novo começo.</p>
        <span>Cada coleta faz parte de uma mudança maior.</span>
        <div className="site-mission__line" aria-hidden="true"><span /><span /><span /></div>
      </div>
      <div className="site-account">
        <span className="site-avatar" aria-hidden="true">{user?.name.split(' ').slice(0, 2).map((name) => name[0]).join('')}</span>
        <div><strong>{user?.name}</strong><span>{collector ? 'Coletor' : 'Morador'}</span></div>
        <button className="site-logout" onClick={handleLogout} aria-label="Sair" title="Sair da conta"><Icon name="logout" size={19} /></button>
      </div>
    </header>
  )
}
