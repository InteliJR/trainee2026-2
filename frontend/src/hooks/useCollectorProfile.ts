import { useEffect, useState } from 'react'
import type { Collector } from '../types'
import {
  getCurrentCollector,
  updateAvailability,
} from '../services/coletoresService'

export type CollectorProfileStatus = 'idle' | 'loading' | 'error' | 'success'

export type UseCollectorProfileResult = {
  collector: Collector | null
  status: CollectorProfileStatus
  error: Error | null
  updating: boolean
  updateError: Error | null
  refetch: () => void
  setAvailability: (available: boolean) => Promise<void>
}

export function useCollectorProfile(): UseCollectorProfileResult {
  const [collector, setCollector] = useState<Collector | null>(null)
  const [status, setStatus] = useState<CollectorProfileStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    async function loadCollector() {
      setStatus('loading')
      setError(null)
      try {
        const response = await getCurrentCollector()
        if (!active) return
        setCollector(response.data)
        setStatus('success')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      }
    }

    void loadCollector()
    return () => {
      active = false
    }
  }, [requestVersion])

  async function setAvailability(available: boolean) {
    setUpdating(true)
    setUpdateError(null)
    try {
      const response = await updateAvailability({ available })
      setCollector(response.data)
    } catch (cause) {
      setUpdateError(cause instanceof Error ? cause : new Error(String(cause)))
    } finally {
      setUpdating(false)
    }
  }

  return {
    collector,
    status,
    error,
    updating,
    updateError,
    refetch: () => setRequestVersion((version) => version + 1),
    setAvailability,
  }
}
