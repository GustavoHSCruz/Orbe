import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

if (process.platform !== 'linux')
  throw new Error('Run dist:linux on Linux or use the Linux build workflow.')
const metadata = JSON.parse(readFileSync('package.json', 'utf8'))
const homepage =
  process.env.ORBE_PROJECT_URL ||
  metadata.homepage ||
  (process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
    : '')
const args = [
  resolve('node_modules/electron-builder/cli.js'),
  '--linux',
  'AppImage',
]
if (homepage) {
  const url = new URL(homepage)
  if (url.protocol !== 'https:')
    throw new Error('ORBE_PROJECT_URL must be a public HTTPS project URL.')
  args.push(
    'deb',
    '--config.extraMetadata.homepage',
    url.href,
    '--config.deb.maintainer',
    process.env.ORBE_MAINTAINER || 'Orbe',
  )
} else
  console.log(
    'Building AppImage. To also build .deb, set ORBE_PROJECT_URL to the project URL and ORBE_MAINTAINER to your maintainer identity.',
  )
args.push('--x64')
execFileSync(process.execPath, args, { stdio: 'inherit' })
