// The garden's calendar: one garden per year, one cell per day. Shared by the build and the
// browser script, so no Quartz imports beyond types.
import { endOfYear, startOfYear, yearOf } from "./days"
import type { LogEntry } from "./log"

/** Days ahead that show as fading dots, like One Year's garden. Later days stay hidden. */
export const AHEAD_DAYS = 42

export type DayState = "logged" | "missed" | "today" | "ahead"

export interface GardenYear {
  year: number
  /** First cell: 1 January, or the first log in the year the practice began. */
  first: number
  /** Last cell: 31 December. */
  last: number
  byDay: Map<number, LogEntry>
  /** Days planted so far. */
  planted: number
  /** Days from `first` to today (or to the year's end), inclusive. */
  elapsed: number
}

/** One garden per calendar year since the first log, newest first. */
export function gardenYears(logs: LogEntry[], today: number): GardenYear[] {
  if (logs.length === 0) return []
  const start = logs[0].epochDay
  const years: GardenYear[] = []
  for (let year = yearOf(today); year >= yearOf(start); year--) {
    const first = Math.max(startOfYear(year), start)
    const last = endOfYear(year)
    const byDay = new Map<number, LogEntry>()
    for (const log of logs) {
      if (log.epochDay >= first && log.epochDay <= last) byDay.set(log.epochDay, log)
    }
    const end = Math.min(today, last)
    years.push({
      year,
      first,
      last,
      byDay,
      planted: [...byDay.keys()].filter((day) => day <= end).length,
      elapsed: end >= first ? end - first + 1 : 0,
    })
  }
  return years
}

export function dayState(day: number, today: number, logged: boolean): DayState {
  if (logged) return "logged"
  return day < today ? "missed" : day === today ? "today" : "ahead"
}

/** A dot `k` days ahead fades out over AHEAD_DAYS. */
export const aheadOpacity = (k: number): number =>
  Math.max(0, Math.round((1 - k / (AHEAD_DAYS + 1)) * 100) / 100)

export const plantedLine = (year: GardenYear): string =>
  `${year.planted} of ${year.elapsed} ${year.elapsed === 1 ? "day" : "days"} planted`
