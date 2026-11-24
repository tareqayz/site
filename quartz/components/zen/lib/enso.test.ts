import test, { describe } from "node:test"
import assert from "node:assert"
import { renderEnso, ENSO_COLS, ENSO_ROWS, ENSO_MAX_RADIUS } from "./enso"

describe("renderEnso", () => {
  test("always draws the full grid, so the ring never shifts while it breathes", () => {
    for (const radius of [3, 7, ENSO_MAX_RADIUS]) {
      const lines = renderEnso(radius, 1).split("\n")
      assert.strictEqual(lines.length, ENSO_ROWS)
      for (const line of lines) assert.strictEqual([...line].length, ENSO_COLS)
    }
  })
})
