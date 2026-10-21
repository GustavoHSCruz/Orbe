import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    // Sandboxed preloads cannot require npm dependencies at runtime.
    build: { externalizeDeps: false, rollupOptions: { external: ['electron'] } },
  },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer') } },
    plugins: [react(), tailwindcss()],
  },
})
