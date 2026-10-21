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
  await expect(page.locator('#download [role="status"]')).toHaveText('Download em breve')
  await expect(page.locator('a[href=""]')).toHaveCount(0)
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Recursos', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('.impeccable/review/orbe', { recursive: true })
  await page.screenshot({ path: `.impeccable/review/orbe/${info.project.name}.png`, fullPage: true, scale: 'css' })
  await page.screenshot({ path: `.impeccable/review/orbe/${info.project.name}-hero.png`, scale: 'css' })
  expect(errors).toEqual([])
})
