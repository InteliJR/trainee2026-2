import { Outlet } from 'react-router-dom'
import AuthNavigationBridge from '../../routes/AuthNavigationBridge'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  return (
    <div className="app-shell">
      <AuthNavigationBridge />
      <Header />
      <main className="app-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
