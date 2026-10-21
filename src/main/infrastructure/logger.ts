type Level = 'debug' | 'info' | 'warn' | 'error'

export function logEvent(
  level: Level,
  event: string,
  fields: Record<string, string | number | boolean> = {},
): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.info(entry)
}
