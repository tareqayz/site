import type { JSX } from "preact"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { collectLogs, padDay, toEpochDay } from "./lib/log"
import { gardenYears, plantedLine } from "./lib/garden"
import { SAND_LAYOUTS, clearingCentre, renderSand, renderStones, type SandLayout } from "./lib/sand"
// @ts-ignore
import script from "./scripts/sand.inline"

const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`

/** The stones never move: block glyphs, with moss in its own color. */
function Stones({ layout }: { layout: SandLayout }) {
  const { lines, moss } = renderStones(layout)
  // HTML drops a newline right after <pre>; the stones' first rows are empty, so give it one
  const children: (string | JSX.Element)[] = ["\n"]
  lines.forEach((line, r) => {
    let run = ""
    ;[...line].forEach((ch, c) => {
      if (!moss.has(`${c},${r}`)) {
        run += ch
        return
      }
      if (run) children.push(run)
      run = ""
      children.push(<span class="zen-moss">{ch}</span>)
    })
    children.push(run.trimEnd() + (r < lines.length - 1 ? "\n" : ""))
  })
  return (
    <pre class="zen-sand-stones" aria-hidden="true">
      {children}
    </pre>
  )
}

/**
 * The homepage hero: a raked sand garden in ASCII. The day's number sits in a clearing; the
 * cursor (or a tap) disturbs the sand and it settles back. Drawn at build time, animated by
 * scripts/sand.inline.ts.
 */
export default (() => {
  const scenes = (Object.keys(SAND_LAYOUTS) as (keyof typeof SAND_LAYOUTS)[]).map((name) => ({
    name,
    layout: SAND_LAYOUTS[name],
    sand: renderSand(SAND_LAYOUTS[name]),
  }))

  const SandGarden: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const logs = collectLogs(allFiles)
    const buildDay = toEpochDay(new Date().toISOString().slice(0, 10))
    const today = Math.max(buildDay, logs.at(-1)?.epochDay ?? buildDay)
    const start = logs[0]?.epochDay
    const year = gardenYears(logs, today)[0]

    // before the first log: day 000, the day before day one
    const day =
      start === undefined ? (
        <>
          <p class="zen-sand-num zen-hand">
            day <span>000</span>
          </p>
          <a class="zen-sand-sub zen-mono" href="#garden">
            the first plant is coming ↓
          </a>
        </>
      ) : (
        <>
          <p class="zen-sand-num zen-hand" aria-hidden="true">
            day <span>{padDay(today - start + 1)}</span>
          </p>
          <a class="zen-sand-sub zen-mono" href="#garden">
            <span class="zen-sand-count">{plantedLine(year)}</span> ↓
          </a>
        </>
      )

    return (
      <div
        class={classNames(displayClass, "zen-sand")}
        data-start={start ?? ""}
        data-today={today}
        data-first={year?.first ?? ""}
        data-last={year?.last ?? ""}
        data-planted={year?.planted ?? ""}
      >
        <div class="zen-sand-frame">
          {scenes.map(({ name, layout, sand }) => {
            const { left, top } = clearingCentre(layout)
            return (
              <div
                class={`zen-sand-scene is-${name}`}
                data-layout={name}
                style={`--cols:${layout.cols};--cx:${percent(left)};--cy:${percent(top)}`}
              >
                <pre class="zen-sand-lines" aria-hidden="true">
                  {sand}
                </pre>
                <Stones layout={layout} />
                <div class="zen-sand-day">{day}</div>
              </div>
            )
          })}
        </div>
        {start !== undefined && (
          <p class="zen-sr">
            Day {today - start + 1} of the practice. {plantedLine(year)} this year.
          </p>
        )}
      </div>
    )
  }

  SandGarden.afterDOMLoaded = script
  return SandGarden
}) satisfies QuartzComponentConstructor
