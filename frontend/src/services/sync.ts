export type SyncStrategy = (onTick: () => void) => () => void

export const DEFAULT_SYNC_INTERVAL_MS = 5_000

export function createPollingStrategy(
  intervalMs = DEFAULT_SYNC_INTERVAL_MS,
): SyncStrategy {
  return (onTick) => {
    const intervalId = window.setInterval(onTick, intervalMs)
    return () => window.clearInterval(intervalId)
  }
}
