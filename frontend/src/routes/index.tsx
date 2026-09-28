import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import ColetorHome from '../pages/coletor/ColetorHome'
import HistoricoColetas from '../pages/morador/HistoricoColetas'
import MoradorHome from '../pages/morador/MoradorHome'
import SolicitarColeta from '../pages/morador/SolicitarColeta'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/morador" replace />,
      },
      {
        path: '/morador',
        element: <Outlet />,
        children: [
          { index: true, element: <MoradorHome /> },
          { path: 'historico', element: <HistoricoColetas /> },
          { path: 'solicitar/:pontoId', element: <SolicitarColeta /> },
        ],
      },
      {
        path: '/coletor',
        element: <ColetorHome />,
      },
    ],
  },
])
