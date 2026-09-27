import { useEffect, useState } from 'react'
import type { CollectionPoint } from '../types'
import { listCollectionPoints } from '../services/pontosService'

export type CollectionPointsStatus = 'idle' | 'loading' | 'error' | 'success'

export type UseCollectionPointsResult = {
  points: CollectionPoint[]
  status: CollectionPointsStatus
  error: Error | null
  refetch: () => void
}

export function useCollectionPoints(): UseCollectionPointsResult {
  const [points, setPoints] = useState<CollectionPoint[]>([])
  const [status, setStatus] = useState<CollectionPointsStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    async function loadPoints() {
      setStatus('loading')
      setError(null)

      try {
        const response = await listCollectionPoints()
        if (!active) return
        setPoints(response.data)
        setStatus('success')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      }
    }

    void loadPoints()
    return () => {
      active = false
    }
  }, [requestVersion])

  return {
    points,
    status,
    error,
    refetch: () => setRequestVersion((version) => version + 1),
  }
}
