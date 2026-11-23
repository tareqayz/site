import test, { describe } from "node:test"
import assert from "node:assert"
import { malaGeometry } from "./mala"
import { renderEnso, ENSO_COLS, ENSO_ROWS, ENSO_MAX_RADIUS } from "./enso"

for (const [name, a, b] of [
  ["oval", 48, 18],
  ["round", 35, 35],
] as const) {
  describe(`malaGeometry (${name})`, () => {
    const g = malaGeometry(a, b)
    const key = ([x, y]: [number, number]) => `${x},${y}`

    test("places 108 beads, each in its own cell, none on the guru bead", () => {
      assert.strictEqual(g.beads.length, 108)
      const cells = new Set(g.beads.map(key))
      assert.strictEqual(cells.size, 108)
      assert.ok(!cells.has(key(g.guru)))
    })

    test("keeps every bead and ornament inside the grid", () => {
      for (const [x, y] of [
        ...g.beads,
        g.guru,
        ...g.ornaments.map(([x, y]) => [x, y] as [number, number]),
      ]) {
        assert.ok(
          x >= 0 && x < g.cols && y >= 0 && y < g.rows,
          `(${x}, ${y}) outside ${g.cols}×${g.rows}`,
        )
      }
    })

    test("starts next to the guru bead and goes up the left side", () => {
      const [x0, y0] = g.beads[0]
      assert.ok(x0 < g.guru[0], "first bead is left of the guru bead")
      assert.ok(y0 >= g.guru[1] - 1, "first bead sits at the bottom")
      const quarter = g.beads[27]
      assert.ok(quarter[0] < g.guru[0] - a / 2, "a quarter of the way round is on the left")
    })
  })
}

describe("renderEnso", () => {
  test("always draws the full grid, so the ring never shifts while it breathes", () => {
    for (const radius of [3, 7, ENSO_MAX_RADIUS]) {
      const lines = renderEnso(radius, 1).split("\n")
      assert.strictEqual(lines.length, ENSO_ROWS)
      for (const line of lines) assert.strictEqual([...line].length, ENSO_COLS)
    }
  })
})
