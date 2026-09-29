import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import ColetorHome from '../pages/coletor/ColetorHome'
import AgendaColetor from '../pages/coletor/AgendaColetor'
import ColetasRealizadas from '../pages/coletor/ColetasRealizadas'
import DetalheAtendimento from '../pages/coletor/DetalheAtendimento'
import PerfilColetor from '../pages/coletor/PerfilColetor'
import Login from '../pages/auth/Login'
import AcompanharColeta from '../pages/morador/AcompanharColeta'
import HistoricoColetas from '../pages/morador/HistoricoColetas'
import MoradorHome from '../pages/morador/MoradorHome'
import Conquistas from '../pages/morador/Conquistas'
import PerfilMorador from '../pages/morador/PerfilMorador'
import SolicitarColeta from '../pages/morador/SolicitarColeta'
import EcoRotaDashboard from '../pages/ecorota/EcoRotaDashboard'
import ProtectedRoute from './ProtectedRoute'
import ProfileHomeRedirect from './ProfileHomeRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/ecorota/dashboard', element: <EcoRotaDashboard /> },
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
              { path: 'historico', element: <Navigate to='/morador/evolucao' replace /> },
              { path: 'evolucao', element: <HistoricoColetas /> },
              { path: 'conquistas', element: <Conquistas /> },
              { path: 'perfil', element: <PerfilMorador /> },
              { path: 'solicitar/:pontoId', element: <SolicitarColeta /> },
              { path: 'coletas/:id', element: <AcompanharColeta /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['collector']} />,
        children: [
          {
            path: 'coletor',
            element: <Outlet />,
            children: [
              { index: true, element: <ColetorHome /> },
              { path: 'perfil', element: <PerfilColetor /> },
              { path: 'agenda', element: <AgendaColetor /> },
              { path: 'realizadas', element: <ColetasRealizadas /> },
              { path: 'coletas/:id', element: <DetalheAtendimento /> },
            ],
          },
        ],
      },
    ],
  },
])
