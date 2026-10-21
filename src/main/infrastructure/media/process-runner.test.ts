import { describe, expect, it } from 'vitest'
import { processRunner } from './process-runner'

describe('process runner', () => {
  it('streams progress from stdout and stderr, including a final partial line', async () => {
    const lines: string[] = []
    await processRunner.run(
      process.execPath,
      [
        '-e',
        'process.stdout.write("OUT\\n"); process.stderr.write("ORBE_PROGRESS:50\\nFINAL")',
      ],
      { onLine: (line) => lines.push(line) },
    )
    expect(lines).toEqual(
      expect.arrayContaining(['OUT', 'ORBE_PROGRESS:50', 'FINAL']),
    )
  })
  it('ends an analysis process that exceeds its time limit', async () => {
    await expect(
      processRunner.run(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 150 },
      ),
    ).rejects.toThrow('tempo limite')
  })
})
