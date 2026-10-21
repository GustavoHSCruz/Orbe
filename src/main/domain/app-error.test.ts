import { describe, expect, it } from 'vitest'
import { userFacingMediaError } from './app-error'

describe('media errors', () => {
  it('maps network and disk errors to safe messages', () => {
    expect(
      userFacingMediaError(
        new Error(
          'Connection timed out https://example.com/private?token=secret',
        ),
      ),
    ).toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Falha de rede. Verifique a conexão e tente novamente.',
    })
    expect(
      userFacingMediaError(new Error('ENOSPC: no space left on device')).code,
    ).toBe('DISK_FULL')
  })

  it('reports an analysis timeout separately from a network error', () => {
    expect(
      userFacingMediaError(new Error('A análise excedeu o tempo limite.')),
    ).toMatchObject({ code: 'ANALYSIS_TIMEOUT' })
  })

  it('explains when a social post requires an authenticated session', () => {
    expect(
      userFacingMediaError(new Error('Instagram requires login to continue')),
    ).toMatchObject({
      code: 'LOGIN_REQUIRED',
      message: expect.stringContaining('cookies.txt'),
    })
  })

  it('guides YouTube bot verification to its session settings', () => {
    expect(
      userFacingMediaError(
        new Error(
          'ERROR: [youtube] AxFhwtwiw6o: Sign in to confirm you’re not a bot.',
        ),
      ),
    ).toMatchObject({
      code: 'LOGIN_REQUIRED',
      message: expect.stringContaining('Integrações > YouTube'),
    })
  })

  it('explains when X does not expose video from a post', () => {
    expect(
      userFacingMediaError(
        new Error(
          'ERROR: [twitter] 2107654888242979065: No video could be found in this tweet',
        ),
      ),
    ).toMatchObject({
      code: 'MEDIA_NOT_FOUND',
      message: expect.stringContaining('Integrações > Redes sociais'),
    })
  })
})
