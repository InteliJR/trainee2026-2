import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <NavLink className="site-brand" to="/morador" aria-label="EcoRota, início">
        <span className="site-brand__mark" aria-hidden="true">
          E
        </span>
        <span>EcoRota</span>
      </NavLink>
      <nav className="site-nav" aria-label="Navegação principal">
        <NavLink to="/morador">Morador</NavLink>
        <NavLink to="/coletor">Coletor</NavLink>
      </nav>
    </header>
  )
}