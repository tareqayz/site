import test, { describe } from "node:test"
import assert from "node:assert"
import { AHEAD_DAYS, aheadOpacity, dayState, gardenYears, plantedLine } from "./garden"
import { toEpochDay } from "./days"
import type { LogEntry } from "./log"

const log = (date: string) =>
  ({
    slug: `log/${date}`,
    date,
    epochDay: toEpochDay(date),
    title: date,
    tags: [],
  }) as unknown as LogEntry

describe("gardenYears", () => {
  test("is empty before the first log", () => {
    assert.deepStrictEqual(gardenYears([], toEpochDay("2026-11-24")), [])
  })

  const logs = [log("2025-12-30"), log("2026-01-02")]
  const [current, past] = gardenYears(logs, toEpochDay("2026-01-03"))

  test("starts the first year at the first log, later years on 1 January", () => {
    assert.strictEqual(past.year, 2025)
    assert.strictEqual(past.first, toEpochDay("2025-12-30"))
    assert.strictEqual(current.year, 2026)
    assert.strictEqual(current.first, toEpochDay("2026-01-01"))
    assert.strictEqual(current.last, toEpochDay("2026-12-31"))
  })

  test("counts planted and elapsed days per year", () => {
    assert.strictEqual(plantedLine(current), "1 of 3 days planted")
    assert.strictEqual(plantedLine(past), "1 of 2 days planted")
  })
})

describe("days", () => {
  test("a day is logged, missed, today or ahead", () => {
    assert.strictEqual(dayState(5, 7, true), "logged")
    assert.strictEqual(dayState(5, 7, false), "missed")
    assert.strictEqual(dayState(7, 7, false), "today")
    assert.strictEqual(dayState(8, 7, false), "ahead")
  })

  test("dots ahead fade out but stay visible until AHEAD_DAYS", () => {
    assert.ok(aheadOpacity(1) > aheadOpacity(10))
    assert.ok(aheadOpacity(1) < 1)
    assert.ok(aheadOpacity(AHEAD_DAYS) > 0)
  })
})
