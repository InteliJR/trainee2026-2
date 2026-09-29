import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Collection, CollectorCollectionView } from '../types'
import { listCollectorCollections } from '../services/dashboardService'

function localDayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() }
}

export function useCollectorCollections(view: CollectorCollectionView) {
  const day = useMemo(() => localDayRange(), [])
  const [collections, setCollections] = useState<Collection[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string>()
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    listCollectorCollections({ view, cursor, limit: 20, ...(view === 'today' ? day : {}) })
      .then((response) => {
        if (!active) return
        setCollections((current) => cursor ? [...current, ...response.data] : response.data)
        setNextCursor(response.nextCursor)
        setError(null)
        setStatus('success')
      })
      .catch((cause) => {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      })
    return () => { active = false }
  }, [view, cursor, version, day])

  const refetch = useCallback(() => {
    setStatus('loading')
    setCollections([])
    setCursor(undefined)
    setNextCursor(null)
    setVersion((current) => current + 1)
  }, [])

  return {
    collections,
    status,
    error,
    hasMore: nextCursor !== null,
    loadMore: () => {
      if (nextCursor !== null && status !== 'loading') {
        setStatus('loading')
        setCursor(nextCursor)
      }
    },
    refetch,
  }
}
