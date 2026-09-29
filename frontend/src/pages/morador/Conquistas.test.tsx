import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Conquistas from './Conquistas'
import { getRewardBalance } from '../../services/rewardsService'

vi.mock('../../services/rewardsService', () => ({ getRewardBalance: vi.fn() }))
afterEach(cleanup)

describe('Conquistas', () => {
  it('unlocks badges using completed collections', async () => {
    vi.mocked(getRewardBalance).mockResolvedValue({ data: { balance: 5, completedCollections: 5 } })
    render(<Conquistas />)
    expect(await screen.findByText('Reciclador dedicado · 5 coletas')).toBeInTheDocument()
    expect(screen.getByText('Guardião da EcoRota · 10 coletas').parentElement).toHaveTextContent('A conquistar')
  })
})
