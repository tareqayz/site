import type { JSX } from "preact"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { FullSlug, resolveRelative } from "../../util/path"
import { collectLogs, primaryDomain, toEpochDay } from "./lib/log"
import {
  AHEAD_DAYS,
  aheadOpacity,
  dayState,
  gardenYears,
  plantedLine,
  type GardenYear,
} from "./lib/garden"
import { PLANT_VIEWBOX, plantLayers, speciesFor } from "./lib/plants"
// @ts-ignore
import script from "./scripts/garden.inline"

/** One cell per day of the year: a plant for a logged day, bare soil, a seed, or a dot ahead. */
function Grid({ year, today, here }: { year: GardenYear; today: number; here: FullSlug }) {
  const cells: JSX.Element[] = []
  let order = 0
  for (let day = year.first; day <= year.last; day++) {
    const log = year.byDay.get(day)
    const state = dayState(day, today, !!log)
    if (log) {
      const layers = plantLayers(log.date, speciesFor(primaryDomain(log.tags)?.id))
      cells.push(
        <a
          class={classNames("zen-day", "is-logged", day === today ? "is-now" : undefined)}
          href={resolveRelative(here, log.slug)}
          tabIndex={-1}
          data-t={log.title}
          style={`--i:${order++}`}
        >
          <svg viewBox={PLANT_VIEWBOX}>
            {layers.map((layer) => (
              <path class={layer.cls} d={layer.d} />
            ))}
          </svg>
        </a>,
      )
    } else if (state === "ahead") {
      const k = day - today
      cells.push(
        k <= AHEAD_DAYS ? (
          <i class="zen-day is-ahead" style={`opacity:${aheadOpacity(k)}`} />
        ) : (
          <i class="zen-day is-ahead is-far" />
        ),
      )
    } else {
      cells.push(<i class={`zen-day is-${state}`} />)
    }
  }
  return (
    <div class="zen-garden-grid" aria-hidden="true" data-first={year.first} data-last={year.last}>
      {cells}
    </div>
  )
}

/**
 * The garden, after One Year's: every day I post a log grows a hand-drawn plant, picked by the
 * day's first domain tag. Missed days stay bare soil, the days ahead are dots. One garden per
 * year, the current one open, past years folded below.
 */
export default (() => {
  const YearGarden: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const logs = collectLogs(allFiles)
    const here = fileData.slug as FullSlug
    const buildDay = toEpochDay(new Date().toISOString().slice(0, 10))
    const today = Math.max(buildDay, logs.at(-1)?.epochDay ?? buildDay)
    const [current, ...past] = gardenYears(logs, today)

    const head = (
      <header class="zen-garden-head">
        <h2 class="zen-garden-title zen-hand">the garden</h2>
        {current && <span class="zen-garden-year zen-mono">{current.year}</span>}
      </header>
    )

    if (!current) {
      return (
        <section class={classNames(displayClass, "zen-garden")} id="garden">
          {head}
          <p class="zen-garden-line zen-mono">
            the first plant grows the day the first log goes up.
          </p>
          <div class="zen-garden-grid" aria-hidden="true">
            <i class="zen-day is-today" />
          </div>
        </section>
      )
    }

    return (
      <section
        class={classNames(displayClass, "zen-garden")}
        id="garden"
        data-start={logs[0].epochDay}
        data-today={today}
        data-planted={current.planted}
      >
        {head}
        <p class="zen-garden-line zen-mono">
          <span class="zen-garden-count">{plantedLine(current)}</span>
          <span class="zen-garden-hint" aria-hidden="true"></span>
        </p>
        <Grid year={current} today={today} here={here} />
        {past.map((year) => (
          <details class="zen-garden-past">
            <summary class="zen-mono">
              <span class="zen-garden-year">{year.year}</span> {plantedLine(year)}
            </summary>
            <Grid year={year} today={today} here={here} />
          </details>
        ))}
      </section>
    )
  }

  YearGarden.afterDOMLoaded = script
  return YearGarden
}) satisfies QuartzComponentConstructor
