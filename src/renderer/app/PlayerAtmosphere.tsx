import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Color = [number, number, number]
type Palette = [Color, Color, Color, Color]

function fallbackPalette(seed: string): Palette {
  const hash = [...seed].reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    7,
  )
  const color = (shift: number): Color => {
    const hue = (hash + shift) % 360
    const channel = (offset: number) => {
      const angle = (offset + hue / 30) % 12
      return Math.round(
        255 * (0.42 - 0.27 * Math.max(-1, Math.min(angle - 3, 9 - angle, 1))),
      )
    }
    return [channel(0), channel(8), channel(4)]
  }
  return [color(0), color(35), color(330), color(65)]
}

function samplePalette(image: HTMLImageElement): Palette | null {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 48
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0, 48, 48)
  const pixels = context.getImageData(0, 0, 48, 48).data
  const bins = new Map<string, { count: number; sum: Color }>()
  for (let index = 0; index < pixels.length; index += 4) {
    const color: Color = [
      pixels[index]!,
      pixels[index + 1]!,
      pixels[index + 2]!,
    ]
    const light = (color[0] + color[1] + color[2]) / 3
    if (pixels[index + 3]! < 200 || light < 20 || light > 235) continue
    const key = color.map((value) => Math.floor(value / 32)).join('-')
    const bin = bins.get(key) ?? { count: 0, sum: [0, 0, 0] }
    bin.count++
    color.forEach((value, channel) => {
      bin.sum[channel]! += value
    })
    bins.set(key, bin)
  }
  const candidates = [...bins.values()]
    .map((bin) => ({
      color: bin.sum.map((value) => Math.round(value / bin.count)) as Color,
      weight: bin.count,
    }))
    .sort((a, b) => b.weight - a.weight)
  if (!candidates[0]) return null
  const chosen: Color[] = [candidates[0].color]
  while (chosen.length < 4) {
    const next = candidates
      .map((candidate) => ({
        ...candidate,
        distance: Math.min(
          ...chosen.map((color) =>
            Math.hypot(
              ...color.map((value, index) => value - candidate.color[index]!),
            ),
          ),
        ),
      }))
      .filter((candidate) => candidate.distance > 65)
      .sort((a, b) => b.weight * b.distance - a.weight * a.distance)[0]
    if (!next) break
    chosen.push(next.color)
  }
  const distinct = chosen.length
  while (chosen.length < 4) chosen.push(chosen[chosen.length % distinct]!)
  return chosen as Palette
}

export function PlayerAtmosphere({
  artwork,
  seed,
  playing,
}: {
  artwork: string | null
  seed: string
  playing: boolean
}) {
  const reducedMotion = useReducedMotion()
  const fallback = useMemo(() => fallbackPalette(seed), [seed])
  const [sample, setSample] = useState<{
    source: string
    palette: Palette
  } | null>(null)
  useEffect(() => {
    if (!artwork) return
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (cancelled) return
      try {
        const palette = samplePalette(image)
        if (palette) setSample({ source: artwork, palette })
      } catch {
        /* The seeded palette keeps the atmosphere available for unreadable artwork. */
      }
    }
    image.src = artwork
    return () => {
      cancelled = true
      image.onload = null
      image.src = ''
    }
  }, [artwork])
  const palette =
    artwork && sample?.source === artwork ? sample.palette : fallback
  return (
    <div
      className="player-atmosphere"
      aria-hidden="true"
      data-playing={playing}
      data-palette={
        artwork && sample?.source === artwork ? 'artwork' : 'fallback'
      }
    >
      <motion.div
        className="player-atmosphere-base"
        animate={{
          backgroundColor: `rgb(${palette[0].map((value) => Math.round(value * 0.45)).join(',')})`,
        }}
        transition={{ duration: reducedMotion ? 0 : 2.4 }}
      />
      <div className="player-atmosphere-colors">
        {palette.map((color, index) => (
          <div
            key={index}
            className={`player-atmosphere-orbit player-atmosphere-orbit-${index}`}
          >
            <motion.div
              className="player-atmosphere-color"
              animate={{ backgroundColor: `rgb(${color.join(',')})` }}
              transition={{
                duration: reducedMotion ? 0 : 2.4,
                ease: 'easeInOut',
              }}
            />
          </div>
        ))}
      </div>
      <div className="player-atmosphere-shade" />
      <div className="player-atmosphere-grain" />
    </div>
  )
}
