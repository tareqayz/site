import test, { describe } from "node:test"
import assert from "node:assert"
import {
  PLANT_HEIGHT,
  PLANT_WIDTH,
  SPECIES,
  plantLayers,
  plantSvg,
  speciesFor,
  type Species,
} from "./plants"

const YEAR = Array.from({ length: 365 }, (_, k) =>
  new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10),
)
const speciesOf = (k: number): Species => SPECIES[k % SPECIES.length]

/** Every point (ends and control points) a path visits, in absolute coordinates. */
function points(d: string): [number, number][] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []
  const out: [number, number][] = []
  let x = 0
  let y = 0
  let i = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === "M") {
      x = num()
      y = num()
      out.push([x, y])
    } else if (cmd === "h") {
      x += num()
      out.push([x, y])
    } else {
      const pairs = { q: 2, c: 3, l: 1 }[cmd]
      assert.ok(pairs, `unexpected command ${cmd} in ${d}`)
      const seg: [number, number][] = []
      for (let k = 0; k < pairs; k++) seg.push([x + num(), y + num()])
      out.push(...seg)
      ;[x, y] = seg[seg.length - 1]
    }
  }
  return out
}

describe("plants", () => {
  test("the same day always grows the same plant", () => {
    assert.deepStrictEqual(plantLayers("2026-11-24", "oak"), plantLayers("2026-11-24", "oak"))
  })

  test("no two days of a year grow the same plant", () => {
    const drawings = new Set(YEAR.map((date, k) => plantSvg(date, speciesOf(k))))
    assert.strictEqual(drawings.size, YEAR.length)
  })

  test("every species draws something on every day", () => {
    for (const species of SPECIES) {
      for (const date of YEAR.slice(0, 60)) {
        const layers = plantLayers(date, species)
        assert.ok(layers.length > 0 && layers.every((l) => l.d.length > 0), `${species} ${date}`)
      }
    }
  })

  test("every stroke stays inside the plant's box", () => {
    for (const [k, date] of YEAR.entries()) {
      for (const layer of plantLayers(date, speciesOf(k))) {
        for (const [x, y] of points(layer.d)) {
          assert.ok(
            x >= 0 && x <= PLANT_WIDTH && y >= 0 && y <= PLANT_HEIGHT,
            `${speciesOf(k)} ${date}: (${x}, ${y})`,
          )
        }
      }
    }
  })

  test("a full year stays light: under 450 bytes of SVG per plant on average", () => {
    const bytes = YEAR.reduce((sum, date, k) => sum + plantSvg(date, speciesOf(k)).length, 0)
    assert.ok(bytes / YEAR.length < 450, `${Math.round(bytes / YEAR.length)} bytes per plant`)
  })

  test("domains pick their species, anything else is a wildflower", () => {
    assert.strictEqual(speciesFor("strength"), "oak")
    assert.strictEqual(speciesFor("balance"), "cairn")
    assert.strictEqual(speciesFor(undefined), "wildflower")
  })
})
