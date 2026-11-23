import { localEpochDay } from "./zen"

const BEAD = { missed: "◌", today: "◌", ahead: "·" }
const pad = (n: number) => String(Math.max(0, n)).padStart(3, "0")

/**
 * The mala is drawn at build time. Here we (1) re-mark beads against the viewer's own date, so the
 * ring stays honest between rebuilds, and (2) show a bead's day and title on hover.
 */
function setupMala(mala: HTMLElement) {
  const startDay = Number(mala.dataset.startDay)
  const roundStart = Number(mala.dataset.roundStartDay)
  const buildDay = Number(mala.dataset.buildDay)
  // two rings (oval for wide screens, round for phones) share one centre
  const frame = mala.querySelector<HTMLElement>(".zen-mala-frame")
  const hint = mala.querySelector<HTMLElement>(".zen-mala-hint")
  const center = mala.querySelector<HTMLElement>(".zen-mala-center")
  if (!frame || !hint || !center) return

  const viewerDay = localEpochDay()
  if (mala.dataset.startDay && viewerDay > buildDay && viewerDay < roundStart + 108) {
    for (const bead of frame.querySelectorAll<HTMLElement>(".zen-bead")) {
      const day = roundStart + Number(bead.dataset.k)
      if (bead.classList.contains("is-logged")) {
        bead.classList.toggle("is-now", day === viewerDay)
        continue
      }
      const state = day < viewerDay ? "missed" : day === viewerDay ? "today" : "ahead"
      bead.classList.remove("is-missed", "is-today", "is-ahead", "is-now")
      bead.classList.add(`is-${state}`)
      if (state === "today") bead.classList.add("is-now")
      bead.textContent = BEAD[state]
    }
    const num = center.querySelector(".zen-mala-num")
    if (num) num.textContent = pad(viewerDay - startDay + 1)
  }

  const show = (event: Event) => {
    const bead = (event.target as HTMLElement).closest<HTMLElement>(".zen-bead")
    if (!bead?.dataset.label) return
    hint.textContent = bead.dataset.label
    center.classList.add("is-hinting")
  }
  const hide = () => center.classList.remove("is-hinting")

  frame.addEventListener("pointerover", show)
  frame.addEventListener("pointerleave", hide)
  window.addCleanup(() => {
    frame.removeEventListener("pointerover", show)
    frame.removeEventListener("pointerleave", hide)
  })
}

document.addEventListener("nav", () => {
  for (const mala of document.querySelectorAll<HTMLElement>(".zen-mala")) setupMala(mala)
})
