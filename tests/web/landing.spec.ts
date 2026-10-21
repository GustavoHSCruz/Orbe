import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test('explains the product, serves real images and supports keyboard exploration', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle(/Orbe/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tudo o que você ama.Na sua órbita.')
  await page.evaluate(() => document.fonts.ready)
  for (const tab of ['Sua biblioteca', 'Seu player', 'Suas playlists']) {
    await page.getByRole('tab', { name: tab, exact: true }).click()
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true')
    const image = page.locator('.chapter-image img')
    await expect(image).toBeVisible()
    await expect(image).toHaveJSProperty('complete', true)
    await expect(image).not.toHaveJSProperty('naturalWidth', 0)
  }
  await page.getByRole('tab', { name: 'Suas playlists', exact: true }).press('Home')
  await expect(page.getByRole('tab', { name: 'Sua biblioteca', exact: true })).toBeFocused()
  await page.getByText('Preciso conectar alguma conta?', { exact: true }).click()
  await expect(page.locator('details[open]')).toContainText('Não. Importe seus arquivos')
  await page.getByText('Preciso conectar alguma conta?', { exact: true }).click()
  await page.locator('.hero-actions').getByRole('link', { name: 'Baixar Orbe', exact: true }).click()
  const downloads = page.getByRole('region', { name: 'Escolha seu sistema.' })
  await expect(downloads).toBeInViewport()
  const windows = downloads.getByRole('article', { name: 'Windows', exact: true })
  await expect(windows.getByRole('link', { name: 'Baixar instalador .exe' })).toHaveAttribute('href', 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Windows-x64.exe')
  const linux = downloads.getByRole('article', { name: 'Linux', exact: true })
  const appImage = linux.getByRole('link', { name: 'Baixar AppImage', exact: true })
  await expect(appImage).toHaveAttribute('href', 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.AppImage')
  await appImage.focus()
  await page.keyboard.press('Tab')
  await expect(linux.getByRole('link', { name: 'Baixar .deb', exact: true })).toBeFocused()
  await expect(linux.getByRole('link', { name: 'Baixar .deb', exact: true })).toHaveAttribute('href', 'https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.deb')
  await expect(downloads.getByText('Não disponível', { exact: true })).toHaveCount(2)
  await expect(downloads.getByRole('link')).toHaveCount(3)
  await expect(downloads.getByRole('heading', { name: 'macOS', exact: true })).toBeVisible()
  await expect(downloads.getByRole('heading', { name: 'Android / iOS', exact: true })).toBeVisible()
  await expect(page.locator('a[href=""]')).toHaveCount(0)
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Recursos', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  }
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('.impeccable/review/downloads', { recursive: true })
  await page.screenshot({ path: `.impeccable/review/downloads/${info.project.name}.png`, fullPage: true, scale: 'css' })
  await page.screenshot({ path: `.impeccable/review/downloads/${info.project.name}-hero.png`, scale: 'css' })
  if (info.project.name === 'desktop') {
    await downloads.screenshot({ path: '.impeccable/review/downloads/desktop-section.png', scale: 'css' })
  }
  expect(errors).toEqual([])
})
