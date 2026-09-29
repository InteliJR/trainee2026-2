import { useEffect, useState } from 'react'
import type { Collection, CollectionStatus } from '../types'
import { listCollections } from '../services/coletasService'

export type CollectionHistoryStatus = 'idle' | 'loading' | 'error' | 'success'

type QueryState = {
  cursor?: string
  status?: CollectionStatus
  stage?: 'active' | 'finished'
  version: number
}

export type UseCollectionHistoryResult = {
  collections: Collection[]
  status: CollectionHistoryStatus
  error: Error | null
  hasMore: boolean
  statusFilter: CollectionStatus | undefined
  stageFilter: 'active' | 'finished' | undefined
  loadMore: () => void
  setStatusFilter: (status: CollectionStatus | undefined) => void
  setStageFilter: (stage: 'active' | 'finished' | undefined) => void
  refetch: () => void
}

const PAGE_SIZE = 20

export function useCollectionHistory(): UseCollectionHistoryResult {
  const [collections, setCollections] = useState<Collection[]>([])
  const [status, setStatus] = useState<CollectionHistoryStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [query, setQuery] = useState<QueryState>({ version: 0 })

  useEffect(() => {
    let active = true
    const requestedCursor = query.cursor

    async function loadPage() {
      setStatus('loading')
      setError(null)

      try {
        const response = await listCollections({
          cursor: requestedCursor,
          limit: PAGE_SIZE,
          status: query.status,
          stage: query.stage,
        })
        if (!active) return

        setCollections((current) =>
          requestedCursor !== undefined
            ? [...current, ...response.data]
            : response.data,
        )
        setNextCursor(response.nextCursor)
        setStatus('success')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      }
    }

    void loadPage()
    return () => {
      active = false
    }
  }, [query])

  return {
    collections,
    status,
    error,
    hasMore: nextCursor !== null,
    statusFilter: query.status,
    stageFilter: query.stage,
    loadMore: () => {
      if (nextCursor === null || status === 'loading') return
      setQuery((current) => ({ ...current, cursor: nextCursor }))
    },
    setStatusFilter: (nextStatus) => {
      setCollections([])
      setNextCursor(null)
      setError(null)
      setStatus('loading')
      setQuery((current) => ({
        status: nextStatus,
        stage: undefined,
        version: current.version + 1,
      }))
    },
    setStageFilter: (nextStage) => {
      setCollections([])
      setNextCursor(null)
      setError(null)
      setStatus('loading')
      setQuery((current) => ({ stage: nextStage, version: current.version + 1 }))
    },
    refetch: () => {
      setCollections([])
      setNextCursor(null)
      setError(null)
      setStatus('loading')
      setQuery((current) => ({
        status: current.status,
        stage: current.stage,
        version: current.version + 1,
      }))
    },
  }
}
