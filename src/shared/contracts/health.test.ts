import { describe, expect, it } from 'vitest'
import { HealthRequestSchema, HealthResponseSchema } from './health'

describe('app health IPC contract', () => {
  it('accepts only an empty request', () => {
    expect(HealthRequestSchema.safeParse({}).success).toBe(true)
    expect(HealthRequestSchema.safeParse({ arbitrary: true }).success).toBe(
      false,
    )
  })

  it('validates the response payload', () => {
    expect(
      HealthResponseSchema.safeParse({ appName: 'Orbe', version: '0.1.0' })
        .success,
    ).toBe(true)
    expect(
      HealthResponseSchema.safeParse({
        appName: 'Another app',
        version: '0.1.0',
      }).success,
    ).toBe(false)
  })
})
