import { useState } from 'react'
import type { Collection } from '../types'
import type { ErrorCode } from '../types/common'
import { completeCollection } from '../services/coletasService'
import { ApiError } from '../services/api-error'
import { getErrorMessage } from '../utils/error-messages'

export type UseCompleteCollectionResult = {
  completing: boolean
  error: string | null
  errorCode: ErrorCode | null
  complete: (id: string) => Promise<Collection | null>
  clearError: () => void
}

export function useCompleteCollection(): UseCompleteCollectionResult {
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null)

  async function complete(id: string): Promise<Collection | null> {
    setCompleting(true)
    setError(null)
    setErrorCode(null)

    try {
      const response = await completeCollection(id)
      return response.data
    } catch (cause) {
      setError(getErrorMessage(cause, 'Não foi possível concluir a coleta.'))
      setErrorCode(cause instanceof ApiError ? cause.code : null)
      return null
    } finally {
      setCompleting(false)
    }
  }

  function clearError() {
    setError(null)
    setErrorCode(null)
  }

  return { completing, error, errorCode, complete, clearError }
}
