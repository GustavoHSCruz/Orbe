import { accessSync, constants, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Tool = 'yt-dlp' | 'ffmpeg' | 'ffprobe'
export function mediaToolPath(
  tool: Tool,
  options: {
    platform: NodeJS.Platform
    packaged: boolean
    appPath: string
    resourcesPath: string
    env?: NodeJS.ProcessEnv
  },
): string {
  const key = `ORBE_${tool.replaceAll('-', '_').toUpperCase()}_PATH`
  const env = options.env ?? process.env
  const override = env[key]
  if (override) return override
  const root = options.packaged
    ? join(options.resourcesPath, 'bin')
    : join(options.appPath, 'resources/bin')
  if (options.platform === 'win32') return join(root, `${tool}.exe`)
  // Native tools may be bundled later. Otherwise use the system's PATH, never Windows binaries.
  const bundled = join(root, tool)
  if (existsSync(bundled)) return bundled
  for (const directory of (env.PATH ?? '').split(':').filter(Boolean)) {
    const candidate = resolve(directory, tool)
    try {
      accessSync(candidate, constants.X_OK)
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* Try the next PATH entry. */
    }
  }
  return tool
}
