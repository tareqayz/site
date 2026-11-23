import { ENSO_MAX_RADIUS, ENSO_MIN_RADIUS, renderEnso } from "../lib/enso"
import { animateWhileVisible, prefersReducedMotion } from "./zen"

type Phase = { name: "inhale" | "hold" | "exhale"; seconds: number }
type Pattern = { label: string; phases: Phase[] }

const PATTERNS: Pattern[] = [
  {
    label: "box · 4 4 4 4",
    phases: [
      { name: "inhale", seconds: 4 },
      { name: "hold", seconds: 4 },
      { name: "exhale", seconds: 4 },
      { name: "hold", seconds: 4 },
    ],
  },
  {
    label: "4 · 7 · 8",
    phases: [
      { name: "inhale", seconds: 4 },
      { name: "hold", seconds: 7 },
      { name: "exhale", seconds: 8 },
    ],
  },
  {
    label: "coherent · 5.5 5.5",
    phases: [
      { name: "inhale", seconds: 5.5 },
      { name: "exhale", seconds: 5.5 },
    ],
  },
]

const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2
const ROTATION_PERIOD_MS = 90_000

/** Markup for a `<div data-zen="breath"></div>` embedded in a note. */
function hydrateEmbed(el: HTMLElement) {
  if (el.querySelector(".zen-breath-button")) return
  el.classList.add("zen-breath")
  el.innerHTML = `<button class="zen-breath-button" type="button" aria-label="Breathing guide. Press to change the rhythm.">
    <pre class="zen-breath-art" aria-hidden="true"></pre>
    <span class="zen-breath-phase zen-hand">breathe</span>
    <span class="zen-breath-count zen-mono"></span>
  </button>`
}

function setupBreath(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>(".zen-breath-button")
  const art = root.querySelector<HTMLElement>(".zen-breath-art")
  const phaseEl = root.querySelector<HTMLElement>(".zen-breath-phase")
  const countEl = root.querySelector<HTMLElement>(".zen-breath-count")
  if (!button || !art || !phaseEl || !countEl) return

  let patternIndex = Number(root.dataset.pattern ?? 0) % PATTERNS.length
  let cycleStart = performance.now()
  let lastFrame = ""

  const still = () => {
    const pattern = PATTERNS[patternIndex]
    art.textContent = renderEnso((ENSO_MIN_RADIUS + ENSO_MAX_RADIUS) / 2, 0)
    phaseEl.textContent = "breathe"
    countEl.textContent = pattern.phases.map((p) => `${p.name} ${p.seconds}`).join(" · ")
  }

  const frame = (now: number) => {
    const pattern = PATTERNS[patternIndex]
    const total = pattern.phases.reduce((sum, p) => sum + p.seconds, 0) * 1000
    let t = (now - cycleStart) % total
    let radius = ENSO_MIN_RADIUS
    let current = pattern.phases[0]
    let remaining = 0
    for (let i = 0; i < pattern.phases.length; i++) {
      const phase = pattern.phases[i]
      const ms = phase.seconds * 1000
      if (t < ms) {
        const p = t / ms
        current = phase
        remaining = Math.ceil((ms - t) / 1000)
        const prevName =
          pattern.phases[(i - 1 + pattern.phases.length) % pattern.phases.length].name
        if (phase.name === "inhale")
          radius = ENSO_MIN_RADIUS + (ENSO_MAX_RADIUS - ENSO_MIN_RADIUS) * ease(p)
        else if (phase.name === "exhale")
          radius = ENSO_MAX_RADIUS - (ENSO_MAX_RADIUS - ENSO_MIN_RADIUS) * ease(p)
        else radius = prevName === "inhale" ? ENSO_MAX_RADIUS : ENSO_MIN_RADIUS
        break
      }
      t -= ms
    }
    const next = renderEnso(radius, ((now % ROTATION_PERIOD_MS) / ROTATION_PERIOD_MS) * Math.PI * 2)
    if (next !== lastFrame) {
      art.textContent = next
      lastFrame = next
    }
    if (phaseEl.textContent !== current.name) phaseEl.textContent = current.name
    const count = `${remaining} · ${pattern.label}`
    if (countEl.textContent !== count) countEl.textContent = count
  }

  const onPress = () => {
    patternIndex = (patternIndex + 1) % PATTERNS.length
    root.dataset.pattern = String(patternIndex)
    cycleStart = performance.now()
    if (prefersReducedMotion()) still()
  }
  button.addEventListener("click", onPress)
  window.addCleanup(() => button.removeEventListener("click", onPress))

  if (prefersReducedMotion()) {
    still()
    return
  }
  frame(performance.now())
  window.addCleanup(animateWhileVisible(root, 15, frame))
}

document.addEventListener("nav", () => {
  for (const embed of document.querySelectorAll<HTMLElement>("article [data-zen='breath']")) {
    hydrateEmbed(embed)
  }
  for (const root of document.querySelectorAll<HTMLElement>(".zen-breath")) setupBreath(root)
})
