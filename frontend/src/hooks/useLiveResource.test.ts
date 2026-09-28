import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLiveResource } from './useLiveResource'
import { createPollingStrategy } from '../services/sync'

describe('useLiveResource', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('loads the initial resource', async () => {
    const load = vi.fn().mockResolvedValue({ value: 'first' })
    const strategy = createPollingStrategy(1_000)
    const { result } = renderHook(() => useLiveResource(load, strategy))

    await act(async () => {})

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ value: 'first' })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('refreshes silently without replacing data with a loading state', async () => {
    let resolveRefresh!: (value: { value: string }) => void
    const load = vi
      .fn<() => Promise<{ value: string }>>()
      .mockResolvedValueOnce({ value: 'first' })
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveRefresh = resolve)),
      )
    const strategy = createPollingStrategy(1_000)
    const { result } = renderHook(() => useLiveResource(load, strategy))
    await act(async () => {})

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ value: 'first' })

    await act(async () => {
      resolveRefresh({ value: 'second' })
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ value: 'second' })
  })

  it('stops polling when shouldSync becomes false', async () => {
    const load = vi
      .fn<() => Promise<{ active: boolean }>>()
      .mockResolvedValueOnce({ active: true })
      .mockResolvedValueOnce({ active: false })
      .mockResolvedValue({ active: false })
    const strategy = createPollingStrategy(1_000)
    const { result } = renderHook(() =>
      useLiveResource(load, strategy, (data) => data.active),
    )
    await act(async () => {})

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current.data).toEqual({ active: false })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('retries a failed initial load manually', async () => {
    const load = vi
      .fn<() => Promise<{ value: string }>>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ value: 'recovered' })
    const strategy = createPollingStrategy(10_000)
    const { result } = renderHook(() => useLiveResource(load, strategy))
    await act(async () => {})

    expect(result.current.status).toBe('error')
    expect(result.current.error?.message).toBe('temporary failure')

    act(() => result.current.refetch())
    await act(async () => {})

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ value: 'recovered' })
  })

  it('cleans the polling interval when unmounted', async () => {
    const load = vi.fn().mockResolvedValue({ value: 'first' })
    const strategy = createPollingStrategy(1_000)
    const { unmount } = renderHook(() => useLiveResource(load, strategy))
    await act(async () => {})
    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(load).toHaveBeenCalledTimes(1)
  })
})
