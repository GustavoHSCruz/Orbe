import type { OrbeApi } from '../shared/contracts/health'

declare global {
  interface Window {
    orbe: OrbeApi
  }
}

export {}
