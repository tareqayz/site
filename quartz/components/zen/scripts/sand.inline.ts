import { padDay } from "../lib/days"
import { SAND_LAYOUTS, WAKE_SECONDS, breezeActive, renderSand, type Wake } from "../lib/sand"
import { animateWhileVisible, localEpochDay, prefersReducedMotion } from "./zen"

/** A new trail point once the pointer has moved this far (in sand units). */
const TRAIL_SPACING = 1.1
const MAX_WAKES = 40

/** The hero is drawn at build time; move its day number on to the visitor's own date. */
function remark(root: HTMLElement) {
  if (!root.dataset.start) return
  const viewer = localEpochDay()
  const today = Number(root.dataset.today)
  if (viewer <= today) return
  for (const num of root.querySelectorAll(".zen-sand-num span")) {
    num.textContent = padDay(viewer - Number(root.dataset.start) + 1)
  }
  const first = Number(root.dataset.first)
  if (viewer <= Number(root.dataset.last)) {
    const elapsed = viewer - first + 1
    for (const count of root.querySelectorAll(".zen-sand-count")) {
      count.textContent = `${root.dataset.planted} of ${elapsed} days planted`
    }
  }
}

function setupScene(scene: HTMLElement) {
  const layout = SAND_LAYOUTS[scene.dataset.layout as keyof typeof SAND_LAYOUTS]
  const pre = scene.querySelector<HTMLElement>(".zen-sand-lines")
  if (!layout || !pre) return

  const wakes: Wake[] = []
  let clock = performance.now() / 1000
  let settled = false // the last frame drawn had nothing moving in it
  let last: [number, number] | undefined

  const toSand = (event: PointerEvent): [number, number] => {
    const box = pre.getBoundingClientRect()
    return [
      ((event.clientX - box.left) / box.width) * layout.cols,
      ((event.clientY - box.top) / box.height) * layout.rows * 2,
    ]
  }
  const disturb = (wake: Wake) => {
    wakes.push(wake)
    if (wakes.length > MAX_WAKES) wakes.shift()
    settled = false
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return
    const [x, y] = toSand(event)
    if (last && Math.hypot(x - last[0], y - last[1]) < TRAIL_SPACING) return
    last = [x, y]
    disturb({ x, y, t: clock, kind: "trail" })
  }
  const onLeave = () => (last = undefined)
  const onDown = (event: PointerEvent) => {
    if ((event.target as Element).closest("a")) return
    const [x, y] = toSand(event)
    disturb({ x, y, t: clock, kind: "ripple" })
  }

  scene.addEventListener("pointermove", onMove)
  scene.addEventListener("pointerleave", onLeave)
  scene.addEventListener("pointerdown", onDown)

  // 15 fps while on screen; when nothing moves, nothing is redrawn
  const stop = animateWhileVisible(scene, 15, (now) => {
    clock = now / 1000
    while (wakes.length && clock - wakes[0].t > WAKE_SECONDS) wakes.shift()
    const still = wakes.length === 0 && !breezeActive(clock)
    if (still && settled) return
    pre.textContent = renderSand(layout, clock, wakes)
    settled = still
  })

  window.addCleanup(() => {
    stop()
    scene.removeEventListener("pointermove", onMove)
    scene.removeEventListener("pointerleave", onLeave)
    scene.removeEventListener("pointerdown", onDown)
  })
}

document.addEventListener("nav", () => {
  for (const root of document.querySelectorAll<HTMLElement>(".zen-sand")) {
    remark(root)
    if (prefersReducedMotion()) continue
    for (const scene of root.querySelectorAll<HTMLElement>(".zen-sand-scene")) setupScene(scene)
  }
})
