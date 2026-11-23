// Shared browser helpers for the zen components (bundled into each *.inline.ts).

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Today in the viewer's time zone, as days since 1970-01-01. */
export function localEpochDay(now = new Date()): number {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
}

/**
 * Run `frame` at most `fps` times a second while `el` is on screen. The loop stops completely when
 * the element scrolls out of view (and rAF already pauses in hidden tabs). Returns a stop function.
 */
export function animateWhileVisible(
  el: Element,
  fps: number,
  frame: (now: number) => void,
): () => void {
  const interval = 1000 / fps
  let raf = 0
  let last = 0
  let running = false

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    if (now - last < interval) return
    last = now
    frame(now)
  }
  const start = () => {
    if (running) return
    running = true
    raf = requestAnimationFrame(tick)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.isIntersecting ? start() : stop()
  })
  observer.observe(el)

  return () => {
    stop()
    observer.disconnect()
  }
}
