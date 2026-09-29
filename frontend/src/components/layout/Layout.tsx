import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AuthNavigationBridge from '../../routes/AuthNavigationBridge'
import Footer from './Footer'
import Header from './Header'
import Icon from '../ui/Icon'

function pageLabel(pathname: string): string {
  if (pathname.includes('/coletas/')) return 'Detalhes da coleta'
  if (pathname.includes('/solicitar/')) return 'Nova coleta'
  if (pathname.includes('/agenda')) return 'Agenda de hoje'
  if (pathname.includes('/realizadas')) return 'Coletas realizadas'
  if (pathname.includes('/evolucao') || pathname.includes('/historico')) return 'Evolução'
  if (pathname.includes('/conquistas')) return 'Conquistas'
  if (pathname.includes('/dashboard')) return 'Painel EcoRota'
  if (pathname.includes('/perfil')) return 'Meu perfil'
  return pathname.startsWith('/coletor') ? 'Atendimento atual' : 'Coletas'
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [pathname])
  const collector = pathname.startsWith('/coletor')
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <AuthNavigationBridge />
      <Header />
      <div className="app-workspace">
        <div className="workspace-bar">
          <span><Icon name={collector ? 'truck' : 'leaf'} size={17} /> {collector ? 'Área do coletor' : 'Área do morador'}<span className="workspace-bar__separator">/</span><strong>{pageLabel(pathname)}</strong></span>
          <span className="workspace-purpose"><span />Conectando pessoas e novos ciclos</span>
        </div>
        <main className="app-content" id="main-content" tabIndex={-1}><div key={pathname} className="page-transition"><Outlet /></div></main>
        <Footer />
      </div>
    </div>
  )
}
