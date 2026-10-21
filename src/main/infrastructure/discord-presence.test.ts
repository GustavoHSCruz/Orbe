import { describe, expect, it, vi } from 'vitest'

const { login, destroy } = vi.hoisted(() => ({
  login: vi
    .fn()
    .mockRejectedValueOnce(new Error('Discord closed'))
    .mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@xhayper/discord-rpc', () => ({
  Client: class {
    isConnected = false
    login = login
    destroy = destroy
  },
}))

import { DiscordPresenceProvider } from './discord-presence'

describe('DiscordPresenceProvider', () => {
  it('recreates the client after a failed connection', async () => {
    const provider = new DiscordPresenceProvider('client-id')
    await expect(provider.connect()).rejects.toThrow('Discord closed')
    await expect(provider.connect()).resolves.toBeUndefined()
    expect(login).toHaveBeenCalledTimes(2)
    expect(destroy).toHaveBeenCalledTimes(1)
    await provider.disconnect()
  })
})
