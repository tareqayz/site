/**
 * Geometry for the 108-bead mala: beads sit at equal arc-length steps on an ellipse drawn in a
 * monospace character grid. A cell is twice as tall as it is wide (0.6em wide, 1.2em line height),
 * so one row counts as two horizontal units when measuring distances.
 */
import { MALA_BEADS } from "./log"

export interface MalaGeometry {
  cols: number
  rows: number
  /** bead k (0 = the bead after the guru bead, going up the left side) → [col, row] */
  beads: [number, number][]
  guru: [number, number]
  /** extra glyphs (the tassel) → [col, row, char] */
  ornaments: [number, number, string][]
}

export function malaGeometry(a = 48, b = 18): MalaGeometry {
  // a: horizontal semi-axis in columns; b: vertical semi-axis in half-rows (units)
  const rowsOfRing = b + 1
  const cx = a + 1
  const cy = b / 2

  // Sample the ellipse: φ = 0 at the bottom, increasing clockwise on screen (bottom → left → top → right)
  const samples = 4096
  const pts: { x: number; y: number; s: number }[] = []
  let s = 0
  for (let i = 0; i <= samples; i++) {
    const phi = (i / samples) * Math.PI * 2
    const x = -a * Math.sin(phi)
    const y = b * Math.cos(phi)
    if (i > 0) {
      const prev = pts[i - 1]
      s += Math.hypot(x - prev.x, y - prev.y)
    }
    pts.push({ x, y, s })
  }
  const perimeter = s
  const slots = MALA_BEADS + 1 // 108 beads + the guru bead, evenly spaced
  const step = perimeter / slots

  const toCell = (x: number, y: number): [number, number] => [
    Math.round(cx + x),
    Math.round(cy + y / 2),
  ]

  const at = (target: number) => {
    let lo = 0
    let hi = pts.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pts[mid].s < target) lo = mid + 1
      else hi = mid
    }
    return pts[lo]
  }

  const taken = new Set<string>()
  const key = (c: [number, number]) => `${c[0]},${c[1]}`
  const guru = toCell(0, b)
  taken.add(key(guru))

  const beads: [number, number][] = []
  for (let k = 0; k < MALA_BEADS; k++) {
    const p = at((k + 1) * step)
    let cell = toCell(p.x, p.y)
    // Rounding can land two beads in one cell on the curves; nudge outward along the row.
    if (taken.has(key(cell))) {
      const dir = p.x < 0 ? -1 : 1
      const nudged: [number, number] = [cell[0] + dir, cell[1]]
      if (!taken.has(key(nudged))) cell = nudged
    }
    taken.add(key(cell))
    beads.push(cell)
  }

  // A small tassel hanging under the guru bead
  const [gx, gy] = guru
  const ornaments: [number, number, string][] = [
    [gx, gy + 1, "┃"],
    [gx - 1, gy + 2, "╱"],
    [gx, gy + 2, "┃"],
    [gx + 1, gy + 2, "╲"],
    [gx - 2, gy + 3, "┊"],
    [gx, gy + 3, "┊"],
    [gx + 2, gy + 3, "┊"],
  ]

  return { cols: cx * 2 + 1, rows: rowsOfRing + 3, beads, guru, ornaments }
}
