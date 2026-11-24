import test, { describe } from "node:test"
import assert from "node:assert"
import { SAND_LAYOUTS, clearingCentre, renderSand, renderStones, type Zone } from "./sand"

const wide = SAND_LAYOUTS.wide
const bigStone = wide.zones.find((z) => z.kind === "stone") as Zone
const clearing = wide.zones.find((z) => z.kind === "clearing") as Zone

describe("renderSand", () => {
  for (const [name, layout] of Object.entries(SAND_LAYOUTS)) {
    test(`${name}: always fills its grid exactly`, () => {
      const lines = renderSand(layout).split("\n")
      assert.strictEqual(lines.length, layout.rows)
      for (const line of lines) assert.strictEqual([...line].length, layout.cols)
    })
  }

  test("is the same frame every time for the same moment", () => {
    assert.strictEqual(renderSand(wide, 0), renderSand(wide, 0))
  })

  test("rakes straight lines away from the stones", () => {
    assert.strictEqual(renderSand(wide).split("\n")[0], "~".repeat(wide.cols))
  })

  test("rings a stone: ( on its left, ) on its right", () => {
    const row = renderSand(wide).split("\n")[Math.floor(bigStone.y / 2)]
    const reach = Math.round(bigStone.r * bigStone.stretch)
    const left = row.slice(0, Math.floor(bigStone.x) - reach)
    const right = row.slice(Math.ceil(bigStone.x) + reach)
    assert.ok(left.includes("(") && !left.includes(")"), left)
    assert.ok(right.includes(")"), right)
  })

  test("leaves the clearing empty for the day's text", () => {
    const lines = renderSand(wide).split("\n")
    for (let r = 0; r < wide.rows; r++) {
      for (let c = 0; c < wide.cols; c++) {
        const dx = (c + 0.5 - clearing.x) / clearing.stretch
        const dy = r * 2 + 1 - clearing.y
        if (Math.hypot(dx, dy) < clearing.r) assert.strictEqual(lines[r][c], " ", `(${c}, ${r})`)
      }
    }
  })

  test("a pointer's trail disturbs the sand, then settles", () => {
    const trail = [{ x: 40, y: 25, t: 0, kind: "trail" as const }]
    assert.notStrictEqual(renderSand(wide, 0.2, trail), renderSand(wide, 0.2))
    assert.strictEqual(renderSand(wide, 20, trail), renderSand(wide, 20))
  })
})

describe("renderStones", () => {
  test("draws stones in shading blocks, with moss on the big one", () => {
    const { lines, moss } = renderStones(wide)
    assert.strictEqual(lines.length, wide.rows)
    for (const line of lines) {
      assert.strictEqual([...line].length, wide.cols)
      assert.match(line, /^[ ░▒▓]+$/)
    }
    assert.ok(lines.join("").includes("▓"))
    assert.ok(moss.size > 0)
  })

  test("places the clearing inside the scene", () => {
    const { left, top } = clearingCentre(wide)
    assert.ok(left > 0 && left < 1 && top > 0 && top < 1)
  })
})
