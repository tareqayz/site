import test, { describe } from "node:test"
import assert from "node:assert"
import type { QuartzPluginData } from "../../../plugins/vfile"
import {
  collectLogs,
  currentStreak,
  dayNumber,
  fromEpochDay,
  handDate,
  isLogSlug,
  padDay,
  splitTags,
  toEpochDay,
} from "./log"

const file = (slug: string, frontmatter: Record<string, unknown> = {}) =>
  ({ slug, frontmatter: { title: slug, ...frontmatter } }) as unknown as QuartzPluginData

describe("isLogSlug", () => {
  test("accepts notes inside log/", () => {
    assert.ok(isLogSlug("log/2026-11-24"))
  })
  test("rejects the folder page and other sections", () => {
    assert.ok(!isLogSlug("log/index"))
    assert.ok(!isLogSlug("sources/zone-2"))
    assert.ok(!isLogSlug(undefined))
  })
})

describe("epoch days", () => {
  test("round-trip a date", () => {
    assert.strictEqual(fromEpochDay(toEpochDay("2026-11-24")), "2026-11-24")
  })
  test("are one apart for consecutive dates, across a month end", () => {
    assert.strictEqual(toEpochDay("2026-12-01") - toEpochDay("2026-11-30"), 1)
  })
})

describe("collectLogs", () => {
  const logs = collectLogs([
    file("log/2026-11-22", { created: "2026-11-22", tags: ["cardio"] }),
    file("log/2026-11-20", { created: "2026-11-20", duration: "45" }),
    file("log/example", { created: "2026-11-21", draft: true }),
    file("log/undated-note"),
    file("log/index"),
    file("sources/zone-2", { created: "2026-11-21" }),
    file("log/2026-11-23"), // date from the filename
  ])

  test("keeps dated, published logs only, oldest first", () => {
    assert.deepStrictEqual(
      logs.map((l) => l.date),
      ["2026-11-20", "2026-11-22", "2026-11-23"],
    )
  })
  test("reads duration as a number", () => {
    assert.strictEqual(logs[0].duration, 45)
    assert.strictEqual(logs[1].duration, undefined)
  })
  test("numbers days by calendar from the first log", () => {
    assert.deepStrictEqual(
      logs.map((l) => dayNumber(l, logs)),
      [1, 3, 4],
    )
  })
  test("streak counts back from the latest log", () => {
    assert.strictEqual(currentStreak(logs), 2)
    assert.strictEqual(currentStreak([]), 0)
  })
})

describe("formatting", () => {
  test("padDay pads to three digits", () => {
    assert.strictEqual(padDay(7), "007")
    assert.strictEqual(padDay(108), "108")
  })
  test("handDate is lowercase and UTC-stable", () => {
    assert.strictEqual(handDate("2026-11-24"), "tue 24 nov")
    assert.strictEqual(handDate("2026-11-24", { weekday: false, year: true }), "24 nov 2026")
  })
  test("splitTags maps the 8 domains to codes in radar order", () => {
    const { domains, other } = splitTags(["mobility", "experiment", "strength"])
    assert.deepStrictEqual(
      domains.map((d) => d.short),
      ["STR", "MOB"],
    )
    assert.deepStrictEqual(other, ["experiment"])
  })
})
