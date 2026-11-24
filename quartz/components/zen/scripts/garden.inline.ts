import { fromEpochDay, handDate, padDay } from "../lib/days"
import { AHEAD_DAYS, aheadOpacity } from "../lib/garden"
import { localEpochDay, prefersReducedMotion } from "./zen"

/** The garden is drawn at build time: bring its "today" up to the visitor's own date. */
function remark(garden: HTMLElement, grid: HTMLElement) {
  const today = Number(garden.dataset.today)
  const viewer = localEpochDay()
  if (viewer <= today) return
  const first = Number(grid.dataset.first)
  const cells = grid.children
  for (let i = Math.max(0, today - first); i < cells.length; i++) {
    const cell = cells[i] as HTMLElement
    if (cell.classList.contains("is-logged")) {
      cell.classList.remove("is-now")
      continue
    }
    const ahead = first + i - viewer
    cell.className = `zen-day ${ahead < 0 ? "is-missed" : ahead === 0 ? "is-today" : "is-ahead"}`
    if (ahead > AHEAD_DAYS) cell.classList.add("is-far")
    cell.style.opacity = ahead > 0 && ahead <= AHEAD_DAYS ? String(aheadOpacity(ahead)) : ""
  }
  const count = garden.querySelector(".zen-garden-count")
  if (count && viewer <= Number(grid.dataset.last)) {
    count.textContent = `${garden.dataset.planted} of ${viewer - first + 1} days planted`
  }
}

/** Plants ink themselves in when the garden scrolls into view, then sway while it's on screen. */
function grow(grid: HTMLElement): () => void {
  const plants = grid.querySelectorAll(".is-logged").length
  if (plants === 0 || prefersReducedMotion()) return () => {}
  grid.style.setProperty("--step", `${Math.min(70, Math.round(1800 / plants))}ms`)
  grid.classList.add("is-waiting")
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        grid.classList.toggle("is-offscreen", !entry.isIntersecting)
        if (entry.isIntersecting && grid.classList.contains("is-waiting")) {
          grid.classList.replace("is-waiting", "is-inking")
        }
      }
    },
    { threshold: 0.1 },
  )
  observer.observe(grid)
  return () => observer.disconnect()
}

/** Hovering a day shows its number, date and title in place of the count. */
function hints(garden: HTMLElement, grid: HTMLElement): () => void {
  const line = garden.querySelector<HTMLElement>(".zen-garden-line")
  const hint = garden.querySelector<HTMLElement>(".zen-garden-hint")
  if (!line || !hint) return () => {}
  const start = Number(garden.dataset.start)
  const first = Number(grid.dataset.first)

  const hide = () => line.classList.remove("is-hinting")
  const show = (event: Event) => {
    const cell = (event.target as Element).closest<HTMLElement>(".zen-day")
    if (!cell || cell.parentElement !== grid || cell.classList.contains("is-ahead")) return hide()
    const day = first + Array.prototype.indexOf.call(grid.children, cell)
    const what = cell.classList.contains("is-logged")
      ? cell.dataset.t
      : cell.classList.contains("is-today")
        ? "today"
        : "rest"
    hint.textContent = `day ${padDay(day - start + 1)} · ${handDate(fromEpochDay(day), { weekday: false })} — ${what}`
    line.classList.add("is-hinting")
  }

  grid.addEventListener("pointerover", show)
  grid.addEventListener("pointerleave", hide)
  return () => {
    grid.removeEventListener("pointerover", show)
    grid.removeEventListener("pointerleave", hide)
  }
}

document.addEventListener("nav", () => {
  for (const garden of document.querySelectorAll<HTMLElement>(".zen-garden")) {
    const grid = garden.querySelector<HTMLElement>(":scope > .zen-garden-grid")
    if (!grid || !garden.dataset.today) continue
    remark(garden, grid)
    const stopGrowing = grow(grid)
    const stopHints = hints(garden, grid)
    window.addCleanup(() => {
      stopGrowing()
      stopHints()
    })
  }
})
