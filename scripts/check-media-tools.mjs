import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

let failed = false
for (const [name, key] of [
  ['yt-dlp', 'ORBE_YT_DLP_PATH'],
  ['ffmpeg', 'ORBE_FFMPEG_PATH'],
  ['ffprobe', 'ORBE_FFPROBE_PATH'],
]) {
  const executable =
    process.env[key] ||
    (process.platform === 'win32'
      ? resolve('resources/bin', `${name}.exe`)
      : name)
  try {
    execFileSync(executable, [name === 'yt-dlp' ? '--version' : '-version'], {
      stdio: 'ignore',
      timeout: 15000,
    })
    console.log(`${name}: OK`)
  } catch {
    failed = true
    console.error(
      `${name}: not available. Install the native tool or set ${key}.`,
    )
  }
}
if (failed) process.exitCode = 1
