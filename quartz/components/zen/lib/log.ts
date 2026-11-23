import { QuartzPluginData } from "../../../plugins/vfile"
import { FullSlug } from "../../../util/path"

/** Daily logs live in content/log/YYYY-MM-DD.md */
export const LOG_FOLDER = "log"

/** One round of the mala. */
export const MALA_BEADS = 108

export interface Domain {
  id: string
  short: string
  label: string
}

/** The 8 axes of the Unorthodox radar (unorthodox/src/domains/domains.ts), used as tags. */
export const DOMAINS: Domain[] = [
  { id: "strength", short: "STR", label: "Strength" },
  { id: "power", short: "PWR", label: "Power" },
  { id: "endurance", short: "END", label: "Muscular Endurance" },
  { id: "cardio", short: "CAR", label: "Cardio Endurance" },
  { id: "flexibility", short: "FLX", label: "Flexibility" },
  { id: "mobility", short: "MOB", label: "Mobility" },
  { id: "balance", short: "BAL", label: "Balance" },
  { id: "agility", short: "AGI", label: "Agility & Reaction" },
]
const DOMAIN_BY_ID = new Map(DOMAINS.map((d) => [d.id, d]))

export interface LogEntry {
  slug: FullSlug
  /** Calendar date, YYYY-MM-DD */
  date: string
  /** Days since 1970-01-01 for `date` */
  epochDay: number
  title: string
  tags: string[]
  duration?: number
}

const DAY_MS = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

export const toEpochDay = (iso: string): number =>
  Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS)
export const fromEpochDay = (day: number): string =>
  new Date(day * DAY_MS).toISOString().slice(0, 10)

export function isLogSlug(slug: string | undefined): slug is FullSlug {
  return !!slug && slug.startsWith(`${LOG_FOLDER}/`) && !slug.endsWith("index")
}

function isoDateOf(file: QuartzPluginData): string | undefined {
  const fm = (file.frontmatter ?? {}) as Record<string, unknown>
  for (const key of ["created", "date", "published"]) {
    const value = fm[key]
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10)
    if (typeof value === "string" && ISO_DATE.test(value)) return value.slice(0, 10)
  }
  // No filesystem fallback: a note in log/ only counts as a day when it says which day it is.
  return file.slug?.split("/").pop()?.match(ISO_DATE)?.[0]
}

function isDraft(file: QuartzPluginData): boolean {
  const draft = file.frontmatter?.draft
  return draft === true || draft === "true"
}

const cache = new WeakMap<QuartzPluginData[], LogEntry[]>()

/** Published daily logs, oldest first. */
export function collectLogs(allFiles: QuartzPluginData[]): LogEntry[] {
  const cached = cache.get(allFiles)
  if (cached) return cached

  const logs: LogEntry[] = []
  for (const file of allFiles) {
    if (!isLogSlug(file.slug) || isDraft(file)) continue
    const date = isoDateOf(file)
    if (!date) continue
    const duration = Number(file.frontmatter?.duration)
    logs.push({
      slug: file.slug,
      date,
      epochDay: toEpochDay(date),
      title: file.frontmatter?.title ?? date,
      tags: file.frontmatter?.tags ?? [],
      duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    })
  }
  logs.sort((a, b) => a.epochDay - b.epochDay || a.slug.localeCompare(b.slug))
  cache.set(allFiles, logs)
  return logs
}

/** Day 1 is the date of the first log. */
export function dayNumber(entry: { epochDay: number }, logs: LogEntry[]): number {
  return logs.length === 0 ? 0 : entry.epochDay - logs[0].epochDay + 1
}

export const padDay = (n: number): string => String(Math.max(0, n)).padStart(3, "0")

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

/** "mon 24 nov" */
export function handDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = new Date(`${iso}T00:00:00Z`)
  const parts = [`${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`]
  if (opts.weekday !== false) parts.unshift(WEEKDAYS[d.getUTCDay()])
  if (opts.year) parts.push(String(d.getUTCFullYear()))
  return parts.join(" ")
}

export function splitTags(tags: string[]): { domains: Domain[]; other: string[] } {
  const domains: Domain[] = []
  const other: string[] = []
  for (const tag of tags) {
    const domain = DOMAIN_BY_ID.get(tag.toLowerCase())
    if (domain) domains.push(domain)
    else if (tag !== LOG_FOLDER) other.push(tag)
  }
  domains.sort((a, b) => DOMAINS.indexOf(a) - DOMAINS.indexOf(b))
  return { domains, other }
}

/** Consecutive days logged, ending at the most recent log. */
export function currentStreak(logs: LogEntry[]): number {
  if (logs.length === 0) return 0
  const days = new Set(logs.map((l) => l.epochDay))
  let day = logs[logs.length - 1].epochDay
  let streak = 0
  while (days.has(day)) {
    streak++
    day--
  }
  return streak
}
