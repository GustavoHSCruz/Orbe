import { useLayoutEffect, useRef } from 'react'

type Layer = {
  element: HTMLElement
  returnTo: HTMLElement | null
  close: () => void
}

const layers: Layer[] = []
const hidden = new Map<HTMLElement, { inert: boolean; aria: string | null }>()
let pendingReturn: HTMLElement | null = null
let observer: MutationObserver | null = null

function focusable(element: HTMLElement): HTMLElement[] {
  return [
    ...element.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]',
    ),
  ].filter(
    (item) =>
      item.tabIndex >= 0 &&
      !item.matches(':disabled') &&
      !item.closest('[inert], [hidden]') &&
      item.getClientRects().length > 0,
  )
}

function focusLayer(layer: Layer) {
  const preferred = layer.element.querySelector<HTMLElement>(
    '[data-modal-autofocus]',
  )
  ;(preferred ?? focusable(layer.element)[0] ?? layer.element).focus({
    preventScroll: true,
  })
}

function restoreBackground() {
  for (const [element, original] of hidden) {
    element.inert = original.inert
    if (original.aria === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', original.aria)
  }
  hidden.clear()
}

function isolateBackground() {
  const top = layers.at(-1)
  if (!top) return
  for (const child of document.body.children) {
    if (!(child instanceof HTMLElement) || child.contains(top.element)) continue
    if (!hidden.has(child))
      hidden.set(child, {
        inert: child.inert,
        aria: child.getAttribute('aria-hidden'),
      })
    child.inert = true
    child.setAttribute('aria-hidden', 'true')
  }
}

function onKeyDown(event: KeyboardEvent) {
  const top = layers.at(-1)
  if (!top) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    top.close()
  } else if (event.key === 'Tab') {
    const items = focusable(top.element)
    const first = items[0]
    const last = items.at(-1)
    if (
      !first ||
      !top.element.contains(document.activeElement) ||
      (event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === top.element)) ||
      (!event.shiftKey && document.activeElement === last)
    ) {
      event.preventDefault()
      ;(event.shiftKey ? (last ?? top.element) : (first ?? top.element)).focus()
    }
  }
}

function onFocus(event: FocusEvent) {
  const top = layers.at(-1)
  if (
    top &&
    event.target instanceof Node &&
    !top.element.contains(event.target)
  )
    focusLayer(top)
}

/** Shared focus and background ownership for stacked, body-portalled dialogs. */
export function useModal<T extends HTMLElement>(
  onClose: () => void,
  active = true,
) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  useLayoutEffect(() => {
    close.current = onClose
  })
  useLayoutEffect(() => {
    const element = ref.current
    if (!active || !element) return
    const focused =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null
    const layer: Layer = {
      element,
      returnTo: focused ?? pendingReturn,
      close: () => close.current(),
    }
    layers.push(layer)
    restoreBackground()
    focusLayer(layer)
    isolateBackground()
    if (layers.length === 1) {
      document.addEventListener('keydown', onKeyDown, true)
      document.addEventListener('focusin', onFocus, true)
      observer = new MutationObserver(isolateBackground)
      observer.observe(document.body, { childList: true })
    }
    return () => {
      const wasTop = layers.at(-1) === layer
      layers.splice(layers.indexOf(layer), 1)
      restoreBackground()
      // Transfer the original opener across a replacement dialog in the same commit.
      if (wasTop) pendingReturn = layer.returnTo
      if (!layers.length) {
        document.removeEventListener('keydown', onKeyDown, true)
        document.removeEventListener('focusin', onFocus, true)
        observer?.disconnect()
        observer = null
      }
      queueMicrotask(() => {
        const top = layers.at(-1)
        if (wasTop) {
          if (
            layer.returnTo?.isConnected &&
            (!top || top.element.contains(layer.returnTo))
          ) {
            layer.returnTo.focus({ preventScroll: true })
          } else if (top) focusLayer(top)
          else
            document
              .querySelector<HTMLElement>('[data-dialog-fallback]')
              ?.focus({ preventScroll: true })
        }
        isolateBackground()
        pendingReturn = null
      })
    }
  }, [active])
  return ref
}
