import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthNavigationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleUnauthorized = () => navigate('/login', { replace: true })
    window.addEventListener('ecorota:unauthorized', handleUnauthorized)
    return () =>
      window.removeEventListener('ecorota:unauthorized', handleUnauthorized)
  }, [navigate])

  return null
}
