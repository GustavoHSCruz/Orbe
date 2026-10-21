export class AudioDeck {
  private readonly elements: [HTMLAudioElement, HTMLAudioElement]
  private readonly fades: [number, number] = [0, 0]
  private readonly gains: [number, number] = [1, 1]
  private volume: number
  private animation: number | null = null

  constructor(elements: [HTMLAudioElement, HTMLAudioElement], volume: number) {
    this.elements = elements
    this.volume = volume
    this.apply()
  }

  setVolume(volume: number): void {
    this.volume = volume
    this.apply()
  }

  setTrackGain(slot: number, gain: number): void {
    this.gains[slot] = Number.isFinite(gain) ? Math.max(0.1, gain) : 1
    this.apply()
  }

  transition(incoming: number, outgoing: number | null, seconds: number): void {
    this.cancel()
    if (outgoing === incoming) outgoing = null
    if (seconds <= 0 || outgoing == null) {
      this.fades[0] = incoming === 0 ? 1 : 0
      this.fades[1] = incoming === 1 ? 1 : 0
      this.apply()
      return
    }
    const previous = outgoing
    const start = performance.now()
    const duration = seconds * 1000
    this.fades[incoming] = 0
    this.fades[previous] = 1
    this.apply()
    const frame = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration))
      this.fades[incoming] = progress
      this.fades[previous] = 1 - progress
      this.apply()
      if (progress < 1) this.animation = requestAnimationFrame(frame)
      else this.animation = null
    }
    this.animation = requestAnimationFrame(frame)
  }

  stop(active: number | null): void {
    this.cancel()
    this.fades[0] = active === 0 ? 1 : 0
    this.fades[1] = active === 1 ? 1 : 0
    this.apply()
  }

  private cancel(): void {
    if (this.animation != null) cancelAnimationFrame(this.animation)
    this.animation = null
  }

  private apply(): void {
    this.elements.forEach((element, index) => {
      element.volume = Math.min(
        1,
        Math.max(0, this.volume * this.gains[index]! * this.fades[index]!),
      )
    })
  }
}
