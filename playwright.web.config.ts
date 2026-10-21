import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/web',
  outputDir: './test-results/web',
  use: { baseURL: 'http://127.0.0.1:5173', reducedMotion: 'reduce', channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_DOWNLOAD_WINDOWS_URL: 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Windows-x64.exe',
      VITE_DOWNLOAD_LINUX_APPIMAGE_URL: 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.AppImage',
      VITE_DOWNLOAD_LINUX_DEB_URL: 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.deb',
    },
  },
})
