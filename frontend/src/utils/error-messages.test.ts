import { describe, expect, it } from 'vitest'
import { ApiError } from '../services/api-error'
import { errorMessages, getErrorMessage } from './error-messages'

describe('getErrorMessage', () => {
  it.each(Object.entries(errorMessages))(
    'returns the shared message for %s',
    (code, message) => {
      const cause = new ApiError({
        code: code as keyof typeof errorMessages,
        message: 'Server message',
        requestId: 'test',
      })
      expect(getErrorMessage(cause, 'fallback')).toBe(message)
    },
  )

  it('returns fallback for non-ApiError causes', () => {
    expect(getErrorMessage(new Error('network'), 'Try again')).toBe('Try again')
    expect(getErrorMessage(null, 'Try again')).toBe('Try again')
  })
})
