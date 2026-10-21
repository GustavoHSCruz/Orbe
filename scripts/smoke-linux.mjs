import { _electron as electron } from 'playwright'
import { resolve } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const profile = await mkdtemp(resolve(tmpdir(), 'orbe-linux-'))
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
let app
try {
  app = await electron.launch({
    executablePath: resolve('dist/linux-unpacked/orbe'),
    args: [`--user-data-dir=${profile}`],
    env,
  })
  const page = await app.firstWindow()
  await page
    .getByRole('heading', { name: 'Bem-vindo ao Orbe', exact: true })
    .waitFor()
  const health = await page.evaluate(() => window.orbe.health())
  if (health.appName !== 'Orbe')
    throw new Error('Unexpected packaged application')
  await page.getByRole('button', { name: /^Pular introdu/ }).click()
  await page
    .getByRole('heading', { name: 'Ouvir agora', exact: true })
    .waitFor()
  console.log('Packaged Linux startup, preload and onboarding: OK')
} finally {
  await app?.close()
  await rm(profile, { recursive: true, force: true })
}
