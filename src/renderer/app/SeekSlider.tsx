import { useState, type CSSProperties } from 'react'

export function SeekSlider({
  time,
  duration,
  onSeek,
  label,
  className,
}: {
  time: number
  duration: number
  onSeek: (seconds: number) => void
  label: string
  className: string
}) {
  const [preview, setPreview] = useState<number | null>(null)
  const maximum = Number.isFinite(duration) && duration > 0 ? duration : 0
  const value = Math.max(0, Math.min(preview ?? time, maximum))

  const commit = (input: HTMLInputElement) => {
    if (!maximum) return
    const seconds = Math.max(0, Math.min(Number(input.value), maximum))
    onSeek(seconds)
    setPreview(null)
  }

  return (
    <input
      aria-label={label}
      type="range"
      min="0"
      max={maximum}
      step="0.1"
      value={value}
      style={
        {
          '--range-progress': `${maximum ? (value / maximum) * 100 : 0}%`,
        } as CSSProperties
      }
      disabled={!maximum}
      onChange={(event) => setPreview(Number(event.currentTarget.value))}
      onPointerUp={(event) => commit(event.currentTarget)}
      onKeyUp={(event) => {
        if (preview !== null) commit(event.currentTarget)
      }}
      onBlur={(event) => {
        if (preview !== null) commit(event.currentTarget)
      }}
      onPointerCancel={() => setPreview(null)}
      className={className}
    />
  )
}
