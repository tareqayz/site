/**
 * An ASCII ensō: a brush-stroke circle, heavy where the brush lands and thinning toward an open
 * gap. Pure function, shared by the build-time first frame and the browser animation.
 * Cells are twice as tall as wide, so a row counts as two units.
 */
export const ENSO_COLS = 25
export const ENSO_ROWS = 13
export const ENSO_MIN_RADIUS = 3.2
export const ENSO_MAX_RADIUS = 11

const GAP = 0.1 // fraction of the circle left open

export function renderEnso(radius: number, rotation: number): string {
  const cx = (ENSO_COLS - 1) / 2
  const cy = (ENSO_ROWS - 1) / 2
  const lines: string[] = []
  for (let row = 0; row < ENSO_ROWS; row++) {
    let line = ""
    for (let col = 0; col < ENSO_COLS; col++) {
      const dx = col - cx
      const dy = (row - cy) * 2
      const d = Math.hypot(dx, dy)
      if (d < 0.6) {
        line += "·"
        continue
      }
      // position along the stroke, 0 = where the brush lands
      const t = ((((Math.atan2(dy, dx) - rotation) / (Math.PI * 2)) % 1) + 1) % 1
      if (t > 1 - GAP) {
        line += " "
        continue
      }
      const weight = 1 - 0.65 * (t / (1 - GAP)) // 1 → 0.35 as the brush runs dry
      const width = 0.6 + 0.9 * weight
      const v = (1 - Math.abs(d - radius) / width) * weight
      line += v > 0.6 ? "●" : v > 0.34 ? "•" : v > 0.1 ? "·" : " "
    }
    lines.push(line)
  }
  return lines.join("\n")
}
