import type { JSX } from "preact"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { FullSlug, resolveRelative } from "../../util/path"
import {
  collectLogs,
  currentStreak,
  fromEpochDay,
  handDate,
  MALA_BEADS,
  padDay,
  toEpochDay,
} from "./lib/log"
import { MalaGeometry, malaGeometry } from "./lib/mala"
// @ts-ignore
import script from "./scripts/mala.inline"

export const BEAD = { logged: "●", missed: "◌", today: "◌", ahead: "·", guru: "◎" } as const
type BeadState = "logged" | "missed" | "today" | "ahead"

interface BeadSpec {
  state: BeadState
  now: boolean
  label: string
  href?: string
  order?: number
}

// A wide oval for desktop and tablet; a round ring for phones, where the oval would be tiny.
const VARIANTS: { name: string; geometry: MalaGeometry }[] = [
  { name: "oval", geometry: malaGeometry(48, 18) },
  { name: "round", geometry: malaGeometry(35, 35) },
]

function renderRing(name: string, geometry: MalaGeometry, beads: BeadSpec[]) {
  const grid: (string | JSX.Element)[][] = Array.from({ length: geometry.rows }, () =>
    Array.from({ length: geometry.cols }, () => " "),
  )
  for (const [x, y, ch] of geometry.ornaments) grid[y][x] = <span class="zen-tassel">{ch}</span>
  grid[geometry.guru[1]][geometry.guru[0]] = <span class="zen-guru">{BEAD.guru}</span>

  geometry.beads.forEach(([x, y], k) => {
    const bead = beads[k]
    const cls = classNames("zen-bead", `is-${bead.state}`, bead.now ? "is-now" : undefined)
    grid[y][x] = bead.href ? (
      <a
        class={cls}
        href={bead.href}
        tabIndex={-1}
        data-k={k}
        data-label={bead.label}
        style={`--i:${bead.order}`}
      >
        {BEAD.logged}
      </a>
    ) : (
      <span class={cls} data-k={k} data-label={bead.label}>
        {BEAD[bead.state]}
      </span>
    )
  })

  // Collapse each row into runs of plain text and bead elements.
  const children: (string | JSX.Element)[] = []
  grid.forEach((row, y) => {
    let run = ""
    for (const cell of row) {
      if (typeof cell === "string") run += cell
      else {
        if (run) children.push(run)
        run = ""
        children.push(cell)
      }
    }
    children.push(y < grid.length - 1 ? run.trimEnd() + "\n" : run.trimEnd())
  })

  return (
    <pre class={`zen-mala-ring is-${name}`} aria-hidden="true" style={`--cols:${geometry.cols}`}>
      {children}
    </pre>
  )
}

/**
 * The homepage hero: the practice as a mala of 108 beads. Bead k is calendar day k of the current
 * round. A logged day fills its bead, a missed day stays hollow, days ahead are dots.
 */
export default (() => {
  const MalaHero: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const logs = collectLogs(allFiles)
    const here = fileData.slug as FullSlug
    const buildDay = toEpochDay(new Date().toISOString().slice(0, 10))
    const startDay = logs[0]?.epochDay
    const todayDay = Math.max(buildDay, logs.at(-1)?.epochDay ?? buildDay)
    const round = startDay === undefined ? 0 : Math.floor((todayDay - startDay) / MALA_BEADS)
    const roundStart = startDay === undefined ? todayDay : startDay + round * MALA_BEADS
    const dayNow = startDay === undefined ? 0 : todayDay - startDay + 1

    const byDay = new Map(logs.map((log) => [log.epochDay, log]))
    let order = 0
    const beads: BeadSpec[] = Array.from({ length: MALA_BEADS }, (_, k) => {
      const day = roundStart + k
      const log = byDay.get(day)
      const n = startDay === undefined ? k + 1 : day - startDay + 1
      const label = `day ${padDay(n)} · ${handDate(fromEpochDay(day), { weekday: false })}`
      if (log) {
        return {
          state: "logged",
          now: day === todayDay,
          label: `${label} — ${log.title}`,
          href: resolveRelative(here, log.slug),
          order: order++,
        }
      }
      const state: BeadState =
        startDay === undefined || day > todayDay ? "ahead" : day === todayDay ? "today" : "missed"
      return {
        state,
        now: day === todayDay && startDay !== undefined,
        label: `${label} — ${state === "ahead" ? "ahead" : "rest"}`,
      }
    })

    const loggedInRound = order
    const streak = currentStreak(logs)
    const sweepStep = Math.min(60, Math.round(2600 / Math.max(1, loggedInRound)))
    const summary =
      startDay === undefined
        ? "The practice has not started yet."
        : `Day ${dayNow} of the practice. ${loggedInRound} of ${Math.min(MALA_BEADS, todayDay - roundStart + 1)} days logged in round ${round + 1}. Current streak: ${streak} ${streak === 1 ? "day" : "days"}.`

    return (
      <div
        class={classNames(displayClass, "zen-mala")}
        data-start-day={startDay ?? ""}
        data-round-start-day={roundStart}
        data-build-day={todayDay}
        style={`--step:${sweepStep}ms`}
      >
        <div class="zen-mala-frame">
          {VARIANTS.map(({ name, geometry }) => renderRing(name, geometry, beads))}
          <div class="zen-mala-center">
            {startDay === undefined ? (
              <>
                <p class="zen-mala-day zen-hand">the practice begins</p>
                <p class="zen-mala-sub zen-mono">108 beads · one per day</p>
              </>
            ) : (
              <>
                <p class="zen-mala-day zen-hand">
                  day <span class="zen-mala-num">{padDay(dayNow)}</span>
                </p>
                <p class="zen-mala-sub zen-mono">
                  of {MALA_BEADS} · round {round + 1}
                  {streak > 1 ? ` · ${streak} day streak` : ""}
                </p>
              </>
            )}
            <p class="zen-mala-hint zen-mono" aria-hidden="true"></p>
          </div>
        </div>
        <p class="zen-sr">{summary}</p>
      </div>
    )
  }

  MalaHero.afterDOMLoaded = script
  return MalaHero
}) satisfies QuartzComponentConstructor
