import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { ProcessRunner } from '../../domain/media-provider'

export class ExternalToolError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export const processRunner: ProcessRunner = {
  run(command, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        windowsHide: true,
        signal: options?.signal,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      const limit = 32 * 1024 * 1024
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        reject(error)
      }
      if (options?.timeoutMs) {
        timer = setTimeout(() => {
          fail(
            new ExternalToolError(
              'A análise excedeu o tempo limite. Tente novamente.',
            ),
          )
          if (process.platform === 'win32' && child.pid) {
            const killer = spawn(
              'taskkill',
              ['/PID', String(child.pid), '/T', '/F'],
              {
                windowsHide: true,
                stdio: 'ignore',
              },
            )
            killer.once('error', () => child.kill())
            killer.once('close', (code) => {
              if (code !== 0) child.kill()
            })
          } else {
            child.kill('SIGKILL')
          }
        }, options.timeoutMs)
      }
      child.once('error', (error) => fail(new ExternalToolError(error.message)))
      const lines = createInterface({ input: child.stdout! })
      lines.on('line', (line) => {
        stdout += `${line}\n`
        options?.onLine?.(line)
        if (stdout.length > limit) {
          child.kill()
          fail(
            new ExternalToolError(
              'A resposta da ferramenta excedeu o limite permitido.',
            ),
          )
        }
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
        if (stderr.length > limit) {
          child.kill()
          fail(
            new ExternalToolError(
              'O log da ferramenta excedeu o limite permitido.',
            ),
          )
        }
      })
      const errorLines = createInterface({ input: child.stderr! })
      errorLines.on('line', (line) => options?.onLine?.(line))
      child.once('close', (code) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        if (code === 0) resolve({ stdout, stderr })
        else
          reject(
            new ExternalToolError(
              stderr.trim().slice(-1000) ||
                `A ferramenta terminou com código ${code}.`,
            ),
          )
      })
    })
  },
}
