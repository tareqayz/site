// Hand-drawn plants for the garden: one per logged day, drawn as a few ink strokes (SVG paths).
// The date seeds the drawing, so a day's plant is the same on every build and no two days match.
// The day's first domain tag picks the species. Pure functions, no Quartz imports.

export type Species =
  | "oak"
  | "sunflower"
  | "pine"
  | "reeds"
  | "willow"
  | "fiddlehead"
  | "cairn"
  | "dandelion"
  | "wildflower"

/** Domain id → species. */
export const SPECIES_BY_DOMAIN: Record<string, Species> = {
  strength: "oak",
  power: "sunflower",
  endurance: "pine",
  cardio: "reeds",
  flexibility: "willow",
  mobility: "fiddlehead",
  balance: "cairn",
  agility: "dandelion",
}

export const SPECIES: Species[] = [...Object.values(SPECIES_BY_DOMAIN), "wildflower"]

export const speciesFor = (domainId: string | undefined): Species =>
  (domainId && SPECIES_BY_DOMAIN[domainId]) || "wildflower"

/** "i" = ink (stems and leaves), "a" = accent (flowers, seeds, stones), "d" = accent dots. */
export interface PlantLayer {
  cls: "i" | "a" | "d"
  d: string
}

export const PLANT_WIDTH = 24
export const PLANT_HEIGHT = 28
const GROUND = 26
const UP = -Math.PI / 2
const TAU = Math.PI * 2

type P = readonly [number, number]
type Layer = PlantLayer["cls"]

// ── geometry ────────────────────────────────────────────────────────────────

const add = (p: P, v: P, s = 1): P => [p[0] + v[0] * s, p[1] + v[1] * s]
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const polar = (angle: number): P => [Math.cos(angle), Math.sin(angle)]
const bez2 = (a: P, c: P, b: P, t: number): P => lerp(lerp(a, c, t), lerp(c, b, t), t)
const bez3 = (a: P, c1: P, c2: P, b: P, t: number): P =>
  lerp(bez2(a, c1, c2, t), bez2(c1, c2, b, t), t)

// ── seeded randomness ───────────────────────────────────────────────────────

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── compact path data ───────────────────────────────────────────────────────

const quantize = (v: number) => Math.round(v * 10) / 10

function fmt(v: number): string {
  const s = quantize(v).toFixed(1).replace(/\.0$/, "")
  if (s === "-0") return "0"
  return s.replace(/^(-?)0\./, "$1.")
}

/** Numbers joined with the fewest separators SVG allows ("1.5.5" is 1.5 then .5, "1-2" is 1 then -2). */
function nums(values: number[]): string {
  let out = ""
  let prev = ""
  for (const v of values) {
    const s = fmt(v)
    const glued = s.startsWith("-") || (s.startsWith(".") && prev.includes("."))
    if (out && !glued) out += " "
    out += s
    prev = s
  }
  return out
}

/** One stroke: an absolute start, then relative segments, all on a 0.1 grid. */
class Stroke {
  d: string
  private at: P
  constructor(
    private readonly place: (p: P) => P,
    start: P,
  ) {
    this.at = place(start)
    this.d = `M${nums([...this.at])}`
  }
  private rel(p: P): P {
    const q = this.place(p)
    return [q[0] - this.at[0], q[1] - this.at[1]]
  }
  private moveTo(p: P) {
    this.at = this.place(p)
  }
  q(c: P, e: P): this {
    this.d += `q${nums([...this.rel(c), ...this.rel(e)])}`
    this.moveTo(e)
    return this
  }
  c(c1: P, c2: P, e: P): this {
    this.d += `c${nums([...this.rel(c1), ...this.rel(c2), ...this.rel(e)])}`
    this.moveTo(e)
    return this
  }
  l(e: P): this {
    this.d += `l${nums([...this.rel(e)])}`
    this.moveTo(e)
    return this
  }
  dot(): this {
    this.d += "h0"
    return this
  }
}

// ── the pen ─────────────────────────────────────────────────────────────────

class Sketch {
  private readonly strokes: Record<Layer, Stroke[]> = { i: [], a: [], d: [] }
  private readonly place: (p: P) => P

  constructor(
    private readonly rand: () => number,
    flip: boolean,
  ) {
    this.place = ([x, y]) => [
      quantize(Math.min(PLANT_WIDTH - 0.2, Math.max(0.2, flip ? PLANT_WIDTH - x : x))),
      quantize(Math.min(PLANT_HEIGHT - 0.2, Math.max(0.2, y))),
    ]
  }

  r(min: number, max: number): number {
    return min + (max - min) * this.rand()
  }
  int(min: number, max: number): number {
    return Math.min(max, Math.floor(this.r(min, max + 1)))
  }
  chance(p: number): boolean {
    return this.rand() < p
  }
  side(): 1 | -1 {
    return this.rand() < 0.5 ? -1 : 1
  }
  pick<T extends string>(options: Record<T, number>): T {
    const entries = Object.entries(options) as [T, number][]
    let x = this.rand() * entries.reduce((sum, [, w]) => sum + w, 0)
    for (const [value, weight] of entries) {
      x -= weight
      if (x < 0) return value
    }
    return entries[entries.length - 1][0]
  }
  /** Nudge a point, so no line is ruler-straight. */
  w(p: P, amount = 0.3): P {
    return [p[0] + this.r(-amount, amount), p[1] + this.r(-amount, amount)]
  }

  stroke(layer: Layer, start: P): Stroke {
    const stroke = new Stroke(this.place, start)
    this.strokes[layer].push(stroke)
    return stroke
  }
  line(layer: Layer, a: P, b: P) {
    this.stroke(layer, a).l(b)
  }
  dot(p: P) {
    this.stroke("d", p).dot()
  }

  /** An almond leaf (or petal) from `base`, pointing at `angle`. The pen doesn't quite close it. */
  leaf(layer: Layer, base: P, angle: number, length: number, width: number) {
    const dir = polar(angle)
    const normal: P = [-dir[1], dir[0]]
    const mid = add(base, dir, length * 0.45)
    this.stroke(layer, base)
      .q(this.w(add(mid, normal, width), 0.15), add(base, dir, length))
      .q(this.w(add(mid, normal, -width), 0.15), this.w(base, 0.25))
  }

  /** A closed, wobbly loop. With more than four bumps it turns into a scalloped outline. */
  loop(layer: Layer, c: P, rx: number, ry: number, bumps = 4, bulge = 1.41) {
    const start = this.r(0, TAU)
    const at = (angle: number, scale: number, wobble: number): P =>
      this.w([c[0] + Math.cos(angle) * rx * scale, c[1] + Math.sin(angle) * ry * scale], wobble)
    const first = at(start, 1, 0.12)
    const stroke = this.stroke(layer, first)
    for (let k = 1; k <= bumps; k++) {
      const control = at(start + ((k - 0.5) * TAU) / bumps, bulge, 0.18)
      stroke.q(control, k === bumps ? this.w(first, 0.2) : at(start + (k * TAU) / bumps, 1, 0.12))
    }
  }

  /** A smooth stroke through a list of points (it passes the midpoints between them). */
  smooth(layer: Layer, points: P[]) {
    const stroke = this.stroke(layer, points[0])
    for (let k = 1; k < points.length - 1; k++) {
      const last = k === points.length - 2
      stroke.q(points[k], last ? points[k + 1] : lerp(points[k], points[k + 1], 0.5))
    }
    if (points.length === 2) stroke.l(points[1])
  }

  layers(): PlantLayer[] {
    return (["i", "a", "d"] as Layer[])
      .filter((cls) => this.strokes[cls].length > 0)
      .map((cls) => ({ cls, d: this.strokes[cls].map((s) => s.d).join("") }))
  }
}

// ── species ─────────────────────────────────────────────────────────────────

const BASE: P = [12, GROUND]

function oak(s: Sketch) {
  const form = s.pick({ round: 5, bonsai: 3, shrub: 2 })
  if (form === "shrub") {
    const cy = GROUND - s.r(5.5, 6.8)
    s.loop("i", [12, cy], s.r(7.4, 8.6), s.r(4.4, 5.2), s.int(7, 8), 1.3)
    s.stroke("i", s.w([10.6, GROUND], 0.15)).q(s.w([10.9, GROUND - 1.4]), s.w([10.2, cy + 3.4]))
    s.stroke("i", s.w([13.3, GROUND], 0.15)).q(s.w([13.1, GROUND - 1.4]), s.w([14, cy + 3.6]))
    if (s.chance(0.5)) for (let k = s.int(2, 3); k > 0; k--) s.dot(s.w([12, cy], 3.5))
    return
  }

  const h = s.r(16, 20)
  const lean = s.r(-1.4, 1.4)
  const fork: P = [12 + lean * 0.4, GROUND - h * 0.48]
  // a sturdy trunk: two strokes that meet the canopy
  s.stroke("i", s.w([11, GROUND], 0.15)).q(s.w([11.5, GROUND - h * 0.25]), [fork[0] - 0.7, fork[1]])
  s.stroke("i", s.w([13, GROUND], 0.15)).q(s.w([12.5, GROUND - h * 0.25]), [fork[0] + 0.7, fork[1]])

  if (form === "round") {
    const c: P = [12 + lean * 0.8, GROUND - h * 0.74]
    const rx = s.r(6.2, 7.4)
    const ry = s.r(4.8, 5.6)
    s.loop("i", c, rx, ry, s.int(6, 8), 1.33)
    const side = s.side()
    s.stroke("i", fork).q(
      s.w([fork[0] + side * 1.2, fork[1] - 1.6]),
      s.w([fork[0] + side * 2.8, fork[1] - 2.8]),
    )
    if (s.chance(0.45)) for (let k = s.int(1, 3); k > 0; k--) s.dot(s.w(c, 2.8))
    return
  }

  // bonsai: a crooked top and two or three cloud pads
  const pads = s.int(2, 3)
  let side = s.side()
  for (let k = 0; k < pads; k++) {
    const pad: P = [12 + lean + side * s.r(2.4, 4.4), GROUND - h * (0.66 + 0.15 * k) - s.r(0, 1)]
    s.stroke("i", fork).q(s.w(lerp(fork, pad, 0.5), 0.8), [pad[0] - side * 0.6, pad[1] + 1.6])
    s.loop("i", pad, s.r(3.2, 4.2), s.r(2, 2.5), 5, 1.3)
    side = side === 1 ? -1 : 1
  }
}

function sunflower(s: Sketch) {
  const h = s.r(17, 21)
  const lean = s.r(-2, 2)
  const head: P = [12 + lean, GROUND - h]
  const c1 = s.w([12 + s.r(-1.6, 1.6), GROUND - h * 0.35])
  const c2 = s.w([head[0] + s.r(-1.2, 1.2), GROUND - h * 0.7])
  s.stroke("i", BASE).c(c1, c2, head)
  const side = s.side()
  s.leaf(
    "i",
    bez3(BASE, c1, c2, head, s.r(0.26, 0.38)),
    UP + side * s.r(0.75, 1.05),
    s.r(4.4, 5.6),
    s.r(1.4, 1.8),
  )
  s.leaf(
    "i",
    bez3(BASE, c1, c2, head, s.r(0.5, 0.6)),
    UP - side * s.r(0.7, 1),
    s.r(3.8, 4.8),
    s.r(1.2, 1.6),
  )

  const form = s.pick({ sunflower: 5, cosmos: 3, burst: 2 })
  if (form === "sunflower") {
    s.loop("a", head, s.r(3.2, 3.7), s.r(3, 3.5), s.int(9, 11), 1.34)
    s.loop("a", head, s.r(1.2, 1.5), s.r(1.1, 1.4))
  } else if (form === "cosmos") {
    const n = s.int(5, 7)
    const start = s.r(0, TAU)
    for (let k = 0; k < n; k++) {
      s.leaf("a", head, start + (k * TAU) / n + s.r(-0.15, 0.15), s.r(2.6, 3.3), s.r(0.9, 1.2))
    }
    s.dot(head)
  } else {
    const n = s.int(8, 10)
    for (let k = 0; k < n; k++) {
      const dir = polar((k * TAU) / n + s.r(-0.12, 0.12))
      s.line("a", add(head, dir, 1.3), add(head, dir, s.r(2.9, 3.6)))
    }
    s.dot(head)
  }
}

function pine(s: Sketch) {
  const h = s.r(17, 21.5)
  const lean = s.r(-1, 1)
  const top: P = [12 + lean, GROUND - h]
  const form = s.pick({ tiers: 5, fir: 3, cypress: 2 })

  if (form === "cypress") {
    const base: P = [12 + lean * 0.15, GROUND - 2.2]
    const w = s.r(2.6, 3.2)
    s.stroke("i", BASE).q(s.w([12, GROUND - 1.1]), base)
    s.stroke("i", base)
      .q(s.w([base[0] - w * 1.3, base[1] - h * 0.36]), top)
      .q(s.w([base[0] + w * 1.3, base[1] - h * 0.36]), s.w(base, 0.3))
    s.stroke("i", s.w([base[0] - 0.6, base[1] - h * 0.2])).q(
      s.w([base[0], base[1] - h * 0.4]),
      s.w([base[0] + 0.4, base[1] - h * 0.6]),
    )
    return
  }

  s.stroke("i", BASE).q(s.w([12 + lean * 0.2, GROUND - h * 0.5]), top)
  if (form === "tiers") {
    const n = s.int(3, 4)
    for (let k = 0; k < n; k++) {
      const t = k / n
      const y = GROUND - h * (0.2 + 0.74 * t)
      const cx = 12 + lean * (0.2 + 0.74 * t)
      const w = (1 - t) * s.r(5.4, 6.6) + 1.3
      const peak: P = [cx, y - ((h * 0.74) / n) * 1.3]
      s.stroke("i", s.w([cx - w, y + 0.5], 0.2))
        .q(s.w([cx - w * 0.35, y - 0.9]), peak)
        .q(s.w([cx + w * 0.35, y - 0.9]), s.w([cx + w, y + 0.5], 0.2))
    }
  } else {
    const n = s.int(4, 6)
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1)
      const p = lerp(BASE, top, t)
      const w = (1 - t) * s.r(4.6, 6) + 1
      s.stroke("i", p).q(s.w([p[0] - w * 0.5, p[1] + 0.2]), s.w([p[0] - w, p[1] + 1.3]))
      s.stroke("i", p).q(s.w([p[0] + w * 0.5, p[1] + 0.2]), s.w([p[0] + w, p[1] + 1.3]))
    }
  }
  if (s.chance(0.35)) s.dot(top)
}

function reeds(s: Sketch) {
  const form = s.pick({ cattails: 4, grass: 4, wheat: 2 })
  const h = s.r(17, 21)
  const lean = s.r(-1.5, 1.5)
  const n = form === "grass" ? s.int(5, 6) : s.int(3, 4)
  const tall = s.int(0, n - 1)
  for (let k = 0; k < n; k++) {
    const off = k - (n - 1) / 2
    const base = s.w([12 + off * 0.9, GROUND], 0.2)
    if (k === tall && form !== "grass") {
      const tip: P = [base[0] + lean * 0.6, GROUND - h]
      s.stroke("i", base).q(s.w([base[0] + lean * 0.2, GROUND - h * 0.5]), tip)
      if (form === "cattails") {
        s.loop("a", [tip[0], tip[1] + 2.6], 0.95, 2.1)
      } else {
        for (let j = 0; j < 3; j++) {
          const grain: P = [tip[0], tip[1] + 0.6 + j * 1.5]
          s.leaf("a", grain, UP - 0.55, 1.6, 0.5)
          s.leaf("a", grain, UP + 0.55, 1.6, 0.5)
        }
      }
      continue
    }
    const height = h * s.r(0.55, 0.9)
    const spread = off * s.r(1.4, 2.3) + lean
    const bend = form === "grass" && s.chance(0.3)
    const control = s.w([base[0] + spread * 0.15, GROUND - height * (bend ? 1.15 : 0.6)])
    const tip: P = bend
      ? [base[0] + spread * 1.6, GROUND - height * 0.7]
      : [base[0] + spread, GROUND - height]
    s.stroke("i", base).q(control, tip)
  }
}

function willow(s: Sketch) {
  const form = s.pick({ weeping: 4, arch: 3, frond: 3 })
  const h = s.r(16, 20)
  const lean = s.r(-1.2, 1.2)

  if (form === "weeping") {
    const crown: P = [12 + lean, GROUND - h * 0.84]
    s.stroke("i", BASE).q(s.w([12 + lean * 0.3, GROUND - h * 0.45]), crown)
    const n = s.int(4, 6)
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1
      const reach = s.r(2.5, 7)
      s.stroke("i", crown).q(
        s.w([crown[0] + side * reach * 0.8, crown[1] - s.r(1.2, 3)]),
        s.w([crown[0] + side * reach, crown[1] + s.r(6, 11)]),
      )
    }
    return
  }

  // a stem that rises and arches over to one side
  const side = s.side()
  const a: P = [12 - side * 2, GROUND]
  const c1 = s.w([12 - side * 2.5, GROUND - h * 1.05])
  const c2 = s.w([12 + side * 6.5, GROUND - h * 1.05])
  const end = s.w([12 + side * 7.5, GROUND - h * 0.45])
  s.stroke("i", a).c(c1, c2, end)
  const n = form === "arch" ? s.int(2, 3) : s.int(5, 6)
  for (let k = 1; k <= n; k++) {
    // bells hang from the falling half of the arch; frond leaflets run along all of it
    const t = form === "arch" ? 0.5 + (0.45 * k) / (n + 1) : 0.32 + (0.62 * k) / (n + 1)
    const p = bez3(a, c1, c2, end, t)
    if (form === "arch") {
      const bell: P = [p[0], p[1] + s.r(2.4, 3.2)]
      s.line("a", p, [bell[0], bell[1] - 0.9])
      s.loop("a", bell, 0.7, 0.9)
    } else {
      const ahead = bez3(a, c1, c2, end, Math.min(1, t + 0.02))
      const along = Math.atan2(ahead[1] - p[1], ahead[0] - p[0])
      const length = (1 - t) * 2.8 + 0.9
      s.line("i", p, add(p, polar(along - 0.9), length))
      s.line("i", p, add(p, polar(along + 0.9), length))
    }
  }
}

function curl(s: Sketch, x: number, h: number, side: 1 | -1, radius: number, leaflets: number) {
  const top: P = [x + s.r(-0.8, 0.8), GROUND - h + radius]
  const a = s.w([x, GROUND], 0.15)
  const c1 = s.w([x - side * 1.5, GROUND - h * 0.45])
  const c2 = s.w([top[0] - side * 0.3, top[1] + 3])
  s.stroke("i", a).c(c1, c2, top)

  // the curl: wind inward from the stem's tip, over the top
  const centre: P = [top[0] + side * radius, top[1]]
  const turns = s.r(1.15, 1.45)
  const steps = Math.round(turns * 6)
  const points: P[] = []
  for (let k = 0; k <= steps; k++) {
    const t = k / steps
    const angle = (side > 0 ? Math.PI : 0) + side * t * turns * TAU
    points.push(add(centre, polar(angle), radius * (1 - t * 0.8)))
  }
  s.smooth("i", points)
  s.dot(points[points.length - 1])

  for (let k = 1; k <= leaflets; k++) {
    const p = bez3(a, c1, c2, top, 0.3 + (0.42 * k) / (leaflets + 1))
    s.leaf("i", p, UP - 0.95 + s.r(-0.2, 0.2), s.r(1.5, 2.1), 0.55)
    s.leaf("i", p, UP + 0.95 + s.r(-0.2, 0.2), s.r(1.5, 2.1), 0.55)
  }
}

function fiddlehead(s: Sketch) {
  const form = s.pick({ single: 5, pair: 3, unfurling: 2 })
  const side = s.side()
  if (form === "pair") {
    curl(s, 11 - side, s.r(16, 19.5), side, s.r(2.5, 3), 1)
    curl(s, 13 + side, s.r(9.5, 12), side === 1 ? -1 : 1, s.r(1.7, 2.1), 0)
    return
  }
  curl(
    s,
    12,
    s.r(16, 20),
    side,
    form === "unfurling" ? s.r(2, 2.4) : s.r(2.6, 3.2),
    form === "unfurling" ? 3 : 2,
  )
}

function cairn(s: Sketch) {
  const n = s.int(3, 4)
  let y = GROUND
  let x = 12 + s.r(-0.5, 0.5)
  let rx = s.r(4.3, 5.1)
  for (let k = 0; k < n; k++) {
    const ry = rx * s.r(0.48, 0.6)
    const c: P = [x, y - ry]
    s.loop("a", c, rx, ry)
    y = c[1] - ry + 0.35
    x += s.r(-0.9, 0.9)
    rx *= s.r(0.68, 0.8)
  }
  const base: P = [x, y + 0.2]
  const top = s.w([x + s.r(-0.6, 0.6), y - s.r(2.2, 3.4)], 0.1)
  s.stroke("i", base).q(s.w(lerp(base, top, 0.5)), top)
  s.leaf("i", top, UP - s.r(0.6, 1), s.r(1.6, 2.2), 0.7)
  s.leaf("i", top, UP + s.r(0.6, 1), s.r(1.4, 2), 0.65)
}

function dandelion(s: Sketch) {
  const form = s.pick({ puff: 5, blowing: 3, butterfly: 2 })
  const h = s.r(16.5, 20.5)
  const lean = s.r(-2, 2)
  s.leaf("i", [12, GROUND - 0.3], UP + s.side() * 1.1, s.r(3.4, 4.4), 0.95)

  if (form === "butterfly") {
    const tip: P = [12 + lean, GROUND - h * 0.72]
    s.stroke("i", BASE).q(s.w([12 + lean * 0.3, GROUND - h * 0.4]), tip)
    // a butterfly resting above the stalk: body, two big forewings, two small hindwings
    const body: P = [tip[0] + s.r(-0.5, 0.5), tip[1] - s.r(3.4, 4)]
    const tilt = polar(UP + s.r(-0.25, 0.25))
    s.line("a", add(body, tilt, 1.5), add(body, tilt, -1.6))
    for (const side of [-1, 1]) {
      s.leaf("a", add(body, tilt, 0.4), UP + side * 1.05, s.r(3, 3.4), 1.25)
      s.leaf("a", add(body, tilt, -0.6), UP + side * 2.1, s.r(2, 2.3), 0.85)
    }
    return
  }

  const head: P = [12 + lean, GROUND - h]
  s.stroke("i", BASE).q(s.w([12 + lean * 0.2, GROUND - h * 0.55], 1), head)
  const radius = s.r(2.8, 3.3)
  const n = form === "puff" ? s.int(10, 12) : s.int(6, 8)
  const start = s.r(0, TAU)
  for (let k = 0; k < n; k++) {
    const dir = polar(start + (k * TAU) / n + s.r(-0.12, 0.12))
    s.dot(add(head, dir, radius * s.r(0.92, 1.04)))
    if (form === "puff" && k % 3 === 0)
      s.line("a", add(head, dir, 0.8), add(head, dir, radius * 0.75))
  }
  s.dot(head)
  for (let k = form === "puff" ? s.int(0, 1) : s.int(2, 3); k > 0; k--) {
    const seed: P = [head[0] + s.r(3.5, 6.5) * (lean >= 0 ? 1 : -1), head[1] - s.r(-1, 3)]
    s.dot(seed)
    s.stroke("a", seed).q(s.w([seed[0] + 0.4, seed[1] + 0.9], 0.15), [seed[0] + 0.2, seed[1] + 1.7])
  }
}

function wildflower(s: Sketch) {
  const form = s.pick({ five: 4, tulip: 3, bell: 3 })
  const h = s.r(14, 19)
  const lean = s.r(-1.8, 1.8)
  const side = s.side()

  if (form === "bell") {
    const a: P = [12 - side, GROUND]
    const c = s.w([12 + side * 1.5, GROUND - h * 1.15])
    const tip = s.w([12 + side * 5.5, GROUND - h * 0.72])
    s.stroke("i", a).q(c, tip)
    s.leaf("i", bez2(a, c, tip, 0.3), UP - side * 0.9, s.r(3, 3.8), 1)
    const bell: P = [tip[0], tip[1] + 2.4]
    const w = s.r(1.6, 2)
    s.stroke("a", [bell[0] - w, bell[1] + 1.2])
      .q(s.w([bell[0] - w * 0.9, bell[1] - 2.2], 0.15), [bell[0], bell[1] - 2])
      .q(s.w([bell[0] + w * 0.9, bell[1] - 2.2], 0.15), [bell[0] + w, bell[1] + 1.2])
      .q(s.w([bell[0], bell[1] + 0.4], 0.15), [bell[0] - w, bell[1] + 1.2])
    return
  }

  const head: P = [12 + lean, GROUND - h]
  const c = s.w([12 + lean * 0.2, GROUND - h * 0.5])
  s.stroke("i", BASE).q(c, head)
  s.leaf("i", bez2(BASE, c, head, s.r(0.3, 0.45)), UP + side * 0.9, s.r(3, 4), 1.05)

  if (form === "five") {
    const start = s.r(0, TAU)
    for (let k = 0; k < 5; k++) {
      s.leaf("a", head, start + (k * TAU) / 5, s.r(2, 2.5), s.r(0.9, 1.1))
    }
    s.dot(head)
    return
  }
  // tulip: a cup with three points
  const w = s.r(1.9, 2.3)
  const t = s.r(3.1, 3.6)
  s.stroke("a", [head[0] - w, head[1] - t])
    .q(s.w([head[0] - w * 1.05, head[1] + 0.4], 0.15), [head[0], head[1] + 0.3])
    .q(s.w([head[0] + w * 1.05, head[1] + 0.4], 0.15), [head[0] + w, head[1] - t])
    .l(s.w([head[0] + w * 0.45, head[1] - t * 0.55], 0.15))
    .l([head[0], head[1] - t * 1.08])
    .l(s.w([head[0] - w * 0.45, head[1] - t * 0.55], 0.15))
    .l([head[0] - w, head[1] - t])
}

const DRAW: Record<Species, (s: Sketch) => void> = {
  oak,
  sunflower,
  pine,
  reeds,
  willow,
  fiddlehead,
  cairn,
  dandelion,
  wildflower,
}

/** The strokes for a day's plant. The same date and species always draw the same plant. */
export function plantLayers(date: string, species: Species): PlantLayer[] {
  const rand = mulberry32(hash(`${date}:${species}`))
  const sketch = new Sketch(rand, rand() < 0.5)
  DRAW[species](sketch)
  return sketch.layers()
}

export const PLANT_VIEWBOX = `0 0 ${PLANT_WIDTH} ${PLANT_HEIGHT}`

/** The plant as SVG markup (for the byte budget and the icon). The page renders the same thing. */
export function plantSvg(date: string, species: Species): string {
  const paths = plantLayers(date, species)
    .map((layer) => `<path class="${layer.cls}" d="${layer.d}"/>`)
    .join("")
  return `<svg viewBox="${PLANT_VIEWBOX}">${paths}</svg>`
}
