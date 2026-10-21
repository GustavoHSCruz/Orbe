import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { AudioLines, ArrowDownToLine } from 'lucide-react'
import type { LyricLine } from './lyrics-timing'

export function LyricsStage({
  rows,
  time,
  playing,
  onSeek,
}: {
  rows: LyricLine[]
  time: number
  playing: boolean
  onSeek: (seconds: number) => void
}) {
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAnimation = useRef<{ stop: () => void } | null>(null)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [height, setHeight] = useState(400)
  const synced = rows.some((row) => row.time != null)
  const active = rows.reduce(
    (last, row, index) => (row.time != null && row.time <= time ? index : last),
    -1,
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => setHeight(container.clientHeight))
    observer.observe(container)
    return () => {
      observer.disconnect()
      scrollAnimation.current?.stop()
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !synced || browsing) return
    const line = container.querySelector<HTMLElement>(
      `[data-line-index="${Math.max(0, active)}"]`,
    )
    if (!line) return
    const target = Math.max(
      0,
      container.scrollTop +
        line.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        height * 0.38,
    )
    scrollAnimation.current?.stop()
    scrollAnimation.current = animate(container.scrollTop, target, {
      duration: reducedMotion ? 0 : 0.95,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        container.scrollTop = value
      },
    })
    return () => scrollAnimation.current?.stop()
  }, [active, browsing, height, reducedMotion, rows, synced])

  const browse = () => {
    if (!synced) return
    scrollAnimation.current?.stop()
    setBrowsing(true)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setBrowsing(false), 5000)
  }
  const resume = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    setBrowsing(false)
  }
  return (
    <div
      className="lyrics-stage"
      data-synced={synced}
      data-browsing={browsing}
      data-playing={playing}
    >
      <div
        ref={containerRef}
        className="lyrics-stage-scroll"
        tabIndex={0}
        aria-label={synced ? 'Letra sincronizada' : 'Letra da música'}
        onWheel={browse}
        onTouchStart={browse}
        onPointerDown={browse}
        onKeyDown={(event) => {
          if (
            [
              'ArrowUp',
              'ArrowDown',
              'PageUp',
              'PageDown',
              'Home',
              'End',
            ].includes(event.key)
          )
            browse()
        }}
      >
        <div
          className="lyrics-stage-lines"
          style={{
            paddingTop: synced ? height * 0.38 : 28,
            paddingBottom: height * 0.52,
          }}
        >
          {rows.map((row, index) => {
            const distance = Math.abs(index - Math.max(0, active))
            const current = synced && index === active
            const focus = current
              ? 'current'
              : !synced
                ? 'plain'
                : distance <= 1
                  ? 'near'
                  : 'distant'
            return (
              <div
                key={`${index}-${row.text}`}
                data-line-index={index}
                className="lyric-line-slot"
              >
                <motion.div
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: Math.min(index, 5) * 0.045,
                  }}
                >
                  {row.time != null ? (
                    <button
                      type="button"
                      data-current-lyric={current}
                      data-focus={focus}
                      aria-current={current ? 'true' : undefined}
                      className="lyric-line"
                      onClick={() => {
                        onSeek(row.time!)
                        resume()
                      }}
                    >
                      {row.text}
                    </button>
                  ) : (
                    <p className="lyric-line" data-focus="plain">
                      {row.text}
                    </p>
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
      {synced && active < 0 && (
        <div className="lyrics-intro" aria-label="Aguardando o primeiro verso">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="lyrics-stage-footer">
        {browsing ? (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={resume}
            className="lyrics-resume"
          >
            <ArrowDownToLine size={14} /> Voltar ao verso atual
          </Button>
        ) : (
          <span className="lyrics-mode">
            <AudioLines size={14} />
            {synced ? 'Letra sincronizada' : 'Letra sem sincronização'}
          </span>
        )}
      </div>
    </div>
  )
}
