export const collectionBadges = [
  { goal: 1, name: 'Primeira coleta' },
  { goal: 5, name: 'Reciclador dedicado' },
  { goal: 10, name: 'Guardião da EcoRota' },
] as const

export function unlockedBadges(completedCollections: number) {
  return collectionBadges.filter((badge) => completedCollections >= badge.goal)
}

export function nextBadge(completedCollections: number) {
  return (
    collectionBadges.find((badge) => completedCollections < badge.goal) ?? null
  )
}
