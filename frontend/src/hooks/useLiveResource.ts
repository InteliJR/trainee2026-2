import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { SyncStrategy } from '../services/sync'

export type LiveResourceStatus = 'idle' | 'loading' | 'error' | 'success'

export type UseLiveResourceResult<T> = {
  data: T | null
  status: LiveResourceStatus
  error: Error | null
  refetch: () => void
  setData: Dispatch<SetStateAction<T | null>>
}

export function useLiveResource<T>(
  load: () => Promise<T>,
  strategy: SyncStrategy,
  shouldSync: (data: T) => boolean = () => true,
): UseLiveResourceResult<T> {
  const [data, setDataState] = useState<T | null>(null)
  const [status, setStatus] = useState<LiveResourceStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const dataRef = useRef<T | null>(null)
  const shouldSyncRef = useRef(shouldSync)
  const stopSyncRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    shouldSyncRef.current = shouldSync
  }, [shouldSync])

  const setData: Dispatch<SetStateAction<T | null>> = useCallback((update) => {
    setDataState((current) => {
      const next =
        typeof update === 'function'
          ? (update as (previous: T | null) => T | null)(current)
          : update
      dataRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    let active = true
    let inFlight = false
    let stopSync: (() => void) | null = null

    const stop = () => {
      stopSync?.()
      stopSync = null
      stopSyncRef.current = null
    }

    async function refresh(silent: boolean) {
      if (!active || inFlight) return
      inFlight = true
      if (!silent && dataRef.current === null) setStatus('loading')
      if (!silent) setError(null)

      try {
        const nextData = await load()
        if (!active) return
        setData(nextData)
        setStatus('success')
        setError(null)
        if (!shouldSyncRef.current(nextData)) stop()
      } catch (cause) {
        if (!active) return
        const nextError =
          cause instanceof Error ? cause : new Error(String(cause))
        setError(nextError)
        if (dataRef.current === null) setStatus('error')
      } finally {
        inFlight = false
      }
    }

    stopSync = strategy(() => {
      const currentData = dataRef.current
      if (currentData !== null && !shouldSyncRef.current(currentData)) {
        stop()
        return
      }
      void refresh(true)
    })
    stopSyncRef.current = stopSync
    void refresh(false)

    return () => {
      active = false
      stop()
    }
  }, [load, requestVersion, setData, strategy])

  useEffect(() => {
    if (data !== null && !shouldSync(data)) {
      stopSyncRef.current?.()
      stopSyncRef.current = null
    }
  }, [data, shouldSync])

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  return { data, status, error, refetch, setData }
}
