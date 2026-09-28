import { createBrowserRouter, Outlet } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import ColetorHome from '../pages/coletor/ColetorHome'
import Login from '../pages/auth/Login'
import AcompanharColeta from '../pages/morador/AcompanharColeta'
import HistoricoColetas from '../pages/morador/HistoricoColetas'
import MoradorHome from '../pages/morador/MoradorHome'
import SolicitarColeta from '../pages/morador/SolicitarColeta'
import ProtectedRoute from './ProtectedRoute'
import ProfileHomeRedirect from './ProfileHomeRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: (
      <ProtectedRoute allowedRoles={['resident', 'collector']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <ProfileHomeRedirect />,
      },
      {
        element: <ProtectedRoute allowedRoles={['resident']} />,
        children: [
          {
            path: 'morador',
            element: <Outlet />,
            children: [
              { index: true, element: <MoradorHome /> },
              { path: 'historico', element: <HistoricoColetas /> },
              { path: 'solicitar/:pontoId', element: <SolicitarColeta /> },
              { path: 'coletas/:id', element: <AcompanharColeta /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['collector']} />,
        children: [{ path: 'coletor', element: <ColetorHome /> }],
      },
    ],
  },
])
