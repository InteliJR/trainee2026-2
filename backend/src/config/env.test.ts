import { describe, expect, it } from 'vitest'

import { loadEnvironment } from './env.js'

describe('loadEnvironment', () => {
  it('aceita o arquivo de exemplo sem token da EcoRota', () => {
    const config = loadEnvironment({
      DATABASE_URL: 'postgresql://ecorota:ecorota@localhost:5432/ecorota',
      ECOROTA_API_URL: 'http://localhost:3334',
      ECOROTA_API_TOKEN: '',
    })

    expect(config.ECOROTA_API_TOKEN).toBeUndefined()
    expect(config.PORT).toBe(3333)
    expect(config.AUTH_MODE).toBe('mock')
  })

  it('rejeita uma porta invalida', () => {
    expect(() =>
      loadEnvironment({
        DATABASE_URL: 'postgresql://ecorota:ecorota@localhost:5432/ecorota',
        ECOROTA_API_URL: 'http://localhost:3334',
        PORT: '70000',
      }),
    ).toThrow('Variaveis de ambiente invalidas')
  })
})
