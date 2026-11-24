// A raked sand garden (karesansui) drawn in ASCII: the homepage hero. Pure functions shared by
// the build (the first frame) and the browser (the animation), so no Quartz imports.
//
// Units: one per column across and two per row down, because a monospace cell is about twice as
// tall as it is wide. In these units a circle looks round.
//
// The sand is a contour drawing. Outside the stones' ring zones the field is just `y`, so its
// contours are straight raked lines, one per row. Inside a zone the field is the distance to the
// zone's centre, so its contours are rings. Each cell shows the glyph that best matches the
// nearest contour's direction and where it crosses the cell: `~ - _ ¯ . ' / \ ( )`.

/** Raked lines and rings are this far apart: one row. */
export const RING = 2

export interface Zone {
  kind: "stone" | "clearing"
  /** Centre, in units. */
  x: number
  y: number
  /** Core radius (the stone, or the clear space for the day's text), measured vertically. */
  r: number
  /** Horizontal radius = r × stretch: stones and their rings are wider than they are tall. */
  stretch: number
  /** Rings raked around the core. */
  rings: number
  /** Outline wobble, so a stone looks like a stone. */
  seed: number
}

export interface SandLayout {
  cols: number
  rows: number
  zones: Zone[]
}

/** Wide for desktop and tablet, narrow for phones. The first stone gets moss. */
export const SAND_LAYOUTS: Record<"wide" | "narrow", SandLayout> = {
  wide: {
    cols: 72,
    rows: 14,
    zones: [
      { kind: "stone", x: 19, y: 14.5, r: 3.2, stretch: 1.8, rings: 3, seed: 3 },
      { kind: "clearing", x: 52, y: 8.5, r: 3.6, stretch: 2.8, rings: 1, seed: 0 },
      { kind: "stone", x: 62, y: 21.5, r: 1.9, stretch: 1.7, rings: 2, seed: 7 },
    ],
  },
  narrow: {
    cols: 40,
    rows: 16,
    zones: [
      { kind: "stone", x: 13, y: 22.5, r: 2.9, stretch: 1.75, rings: 3, seed: 3 },
      { kind: "clearing", x: 20, y: 7.5, r: 3.8, stretch: 2.6, rings: 1, seed: 0 },
      { kind: "stone", x: 33.5, y: 26, r: 1.7, stretch: 1.7, rings: 2, seed: 7 },
    ],
  },
}

/** Something disturbing the sand: a pointer's trail, or a ripple from a tap. */
export interface Wake {
  x: number
  y: number
  /** When it happened, in seconds (same clock as `t` in renderSand). */
  t: number
  kind: "trail" | "ripple"
}

const TAU = Math.PI * 2

/**
 * The pointer smooths a channel through the raked lines, which bulge around it and then close
 * back over it: the channel narrows to nothing over `life` seconds.
 */
const TRAIL = { amp: 0.8, sigma: 2.8, width: 1.7, life: 2.4 }
/** A tap sends one ring out across the sand. */
const RIPPLE = { amp: 0.35, speed: 7, wavelength: 3.4, width: 2.2, gap: 0.7, life: 1.8 }
/** Every so often a slow swell drifts across, so the sand is never quite still. */
const BREEZE = { every: 26, crossing: 15, amp: 0.6, wavelength: 15, period: 3.8, width: 9 }

/** Wakes older than this no longer show and can be dropped. */
export const WAKE_SECONDS = Math.max(TRAIL.life, RIPPLE.life)

const zoneDistance = (z: Zone, x: number, y: number) => Math.hypot((x - z.x) / z.stretch, y - z.y)
const zoneOuter = (z: Zone) => z.r + z.rings * RING + RING / 2

/** The core's edge at the angle of (x, y): stones wobble, clearings are smooth ellipses. */
function coreRadius(z: Zone, x: number, y: number): number {
  if (z.kind === "clearing") return z.r
  const a = Math.atan2(y - z.y, (x - z.x) / z.stretch)
  const s = z.seed
  return (
    z.r *
    (1 +
      0.1 * Math.sin(a + s) +
      0.07 * Math.sin(2 * a + s * 1.7) +
      0.05 * Math.sin(3 * a + s * 2.3))
  )
}

const insideCore = (z: Zone, x: number, y: number) => zoneDistance(z, x, y) < coreRadius(z, x, y)

/** A fixed pseudo-random number in [0, 1) for a cell. */
function noise(c: number, r: number): number {
  const n = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/** The zone a point belongs to: the one it is deepest inside. */
function zoneAt(layout: SandLayout, x: number, y: number): Zone | undefined {
  let best: Zone | undefined
  let depth = 1
  for (const z of layout.zones) {
    const d = zoneDistance(z, x, y) / zoneOuter(z)
    if (d < depth) {
      depth = d
      best = z
    }
  }
  return best
}

/** Whether a swell is drifting across at time `t` (otherwise the sand is still). */
export const breezeActive = (t: number): boolean => t % BREEZE.every <= BREEZE.crossing

export function breeze(x: number, y: number, t: number, cols: number): number {
  const phase = t % BREEZE.every
  if (phase > BREEZE.crossing) return 0
  const centre = -BREEZE.width * 2 + (cols + BREEZE.width * 4) * (phase / BREEZE.crossing)
  const envelope = Math.exp(-(((x - centre) / BREEZE.width) ** 2))
  if (envelope < 0.02) return 0
  return (
    BREEZE.amp * envelope * Math.sin(TAU * (x / BREEZE.wavelength - t / BREEZE.period) + y * 0.4)
  )
}

/** How far the lines are pushed: they bulge away from a trail, and wobble as a ripple passes. */
function wakeField(x: number, y: number, t: number, wakes: Wake[]): number {
  let f = 0
  for (const w of wakes) {
    const age = t - w.t
    if (age < 0) continue
    const dx = x - w.x
    const dy = y - w.y
    if (w.kind === "trail") {
      if (age > TRAIL.life) continue
      const g = Math.exp(-(dx * dx + dy * dy) / (TRAIL.sigma * TRAIL.sigma))
      if (g < 0.01) continue
      f -= TRAIL.amp * (1 - age / TRAIL.life) * Math.tanh(dy / 1.2) * g
    } else {
      if (age > RIPPLE.life) continue
      const r = Math.hypot(dx, dy)
      const front = RIPPLE.speed * age
      const envelope = Math.exp(-(((r - front) / RIPPLE.width) ** 2))
      if (envelope < 0.01) continue
      f +=
        RIPPLE.amp *
        (1 - age / RIPPLE.life) *
        envelope *
        Math.sin((TAU * (r - front)) / RIPPLE.wavelength)
    }
  }
  return f
}

/** Inside a trail's channel, or on a ripple's front: smoothed sand, nothing drawn. */
function smoothed(x: number, y: number, t: number, wakes: Wake[]): boolean {
  for (const w of wakes) {
    const age = t - w.t
    if (age < 0) continue
    const r = Math.hypot(x - w.x, y - w.y)
    if (w.kind === "trail") {
      if (age < TRAIL.life && r < TRAIL.width * (1 - age / TRAIL.life)) return true
    } else if (age < RIPPLE.life * 0.6 && Math.abs(r - RIPPLE.speed * age) < RIPPLE.gap) {
      return true
    }
  }
  return false
}

interface Cell {
  x: number
  y: number
  zone?: Zone
  /** Under a stone or inside the clearing: no sand drawn. */
  blank: boolean
}

const quadrants = (c: number, r: number): [number, number][] => [
  [c + 0.25, r * 2 + 0.5],
  [c + 0.75, r * 2 + 0.5],
  [c + 0.25, r * 2 + 1.5],
  [c + 0.75, r * 2 + 1.5],
]

const cellCache = new WeakMap<SandLayout, Cell[]>()

function cells(layout: SandLayout): Cell[] {
  const cached = cellCache.get(layout)
  if (cached) return cached
  const out: Cell[] = []
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const x = c + 0.5
      const y = r * 2 + 1
      const zone = zoneAt(layout, x, y)
      const blank =
        !!zone &&
        (zone.kind === "clearing"
          ? insideCore(zone, x, y)
          : quadrants(c, r).some(([qx, qy]) => insideCore(zone, qx, qy)))
      out.push({ x, y, zone, blank })
    }
  }
  cellCache.set(layout, out)
  return out
}

function glyph(layout: SandLayout, cell: Cell, t: number, wakes: Wake[]): string {
  const { x, y, zone } = cell
  const field = (px: number, py: number) =>
    (zone ? zoneDistance(zone, px, py) : py) +
    breeze(px, py, t, layout.cols) +
    (wakes.length ? wakeField(px, py, t, wakes) : 0)

  const psi = field(x, y)
  const h = 0.25
  const gx = (field(x + h, y) - field(x - h, y)) / (2 * h)
  const gy = (field(x, y + h) - field(x, y - h)) / (2 * h)
  const length = Math.hypot(gx, gy)
  if (length < 1e-6) return " "

  let level: number
  if (zone) {
    const k = Math.round((psi - zone.r) / RING)
    if (k < 1 || k > zone.rings) return " "
    level = zone.r + k * RING
  } else {
    level = RING * Math.round((psi - 1) / RING) + 1
  }

  // the nearest contour, as a line: its offset from the cell's middle, along the normal
  const delta = (psi - level) / length
  const nx = gx / length
  const ny = gy / length
  if (Math.abs(delta) > 0.5 * Math.abs(nx) + Math.abs(ny)) return " "
  const crossing = -delta * ny // where it crosses, from -1 (top of the cell) to 1 (bottom)
  const flat = Math.abs(ny)

  // near-flat lines are drawn mid-cell, like hand-drawn ASCII (".-~~-." arcs, not "_-~¯")
  if (flat > 0.94) return flat > 0.985 ? "~" : "-"
  if (flat > 0.72) return crossing > 0.2 ? "." : crossing < -0.2 ? "'" : "-"
  if (flat > 0.5) return nx * ny > 0 ? "/" : "\\"
  if (zone) return x < zone.x ? "(" : ")"
  return "|"
}

/** One frame of sand, as rows of text. `t` is in seconds. */
export function renderSand(layout: SandLayout, t = 0, wakes: Wake[] = []): string {
  const grid = cells(layout)
  const lines: string[] = []
  for (let r = 0; r < layout.rows; r++) {
    let line = ""
    for (let c = 0; c < layout.cols; c++) {
      const cell = grid[r * layout.cols + c]
      const hidden = cell.blank || (wakes.length > 0 && smoothed(cell.x, cell.y, t, wakes))
      line += hidden ? " " : glyph(layout, cell, t, wakes)
    }
    lines.push(line)
  }
  return lines.join("\n")
}

/**
 * The stones, drawn once in shading blocks, like charcoal: dense inside, soft at the edges, a
 * little lighter where the light catches the top left. Returns the rows, plus which cells are moss.
 */
export function renderStones(layout: SandLayout): { lines: string[]; moss: Set<string> } {
  const stones = layout.zones.filter((z) => z.kind === "stone")
  const coverage: number[][] = []
  for (let r = 0; r < layout.rows; r++) {
    coverage.push(
      Array.from(
        { length: layout.cols },
        (_, c) =>
          quadrants(c, r).filter(([qx, qy]) => stones.some((z) => insideCore(z, qx, qy))).length,
      ),
    )
  }

  const lines = coverage.map((row, r) =>
    row
      .map((n, c) => {
        if (n === 0) return " "
        if (n === 1) return "░"
        if (n < 4) return "▒"
        const z = zoneAt(layout, c + 0.5, r * 2 + 1)
        const lit = z && (c + 0.5 - z.x) / (z.r * z.stretch) + (r * 2 + 1 - z.y) / z.r < -0.55
        return lit ? "▒" : "▓"
      })
      .join(""),
  )

  // moss along the top of the first stone, most cells but not all
  const moss = new Set<string>()
  const mossy = stones[0]
  if (mossy) {
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const top = coverage[r][c] > 0 && (r === 0 || coverage[r - 1][c] === 0)
        const near = Math.abs(c + 0.5 - mossy.x) < mossy.r * mossy.stretch * 0.85
        if (top && near && noise(c, r) > 0.3) moss.add(`${c},${r}`)
      }
    }
  }
  return { lines, moss }
}

/** Where the clearing sits, as fractions of the scene (for placing the day's text). */
export function clearingCentre(layout: SandLayout): { left: number; top: number } {
  const clearing = layout.zones.find((z) => z.kind === "clearing")
  if (!clearing) return { left: 0.5, top: 0.5 }
  return { left: clearing.x / layout.cols, top: clearing.y / (layout.rows * 2) }
}
