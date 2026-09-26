import { createBrowserRouter, Navigate } from 'react-router-dom'
import ColetorHome from '../pages/coletor/ColetorHome'
import MoradorHome from '../pages/morador/MoradorHome'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/morador" replace />,
  },
  {
    path: '/morador',
    element: <MoradorHome />,
  },
  {
    path: '/coletor',
    element: <ColetorHome />,
  },
])