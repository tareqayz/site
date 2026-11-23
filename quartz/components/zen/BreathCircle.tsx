import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { ENSO_MAX_RADIUS, ENSO_MIN_RADIUS, renderEnso } from "./lib/enso"
// @ts-ignore
import script from "./scripts/breath.inline"

/**
 * An ASCII ensō that breathes: box breathing by default, press to switch to 4-7-8 or coherent
 * breathing. Shown on the homepage; any note can embed one with <div data-zen="breath"></div>.
 */
export default (() => {
  const firstFrame = renderEnso((ENSO_MIN_RADIUS + ENSO_MAX_RADIUS) / 2, 0)

  const BreathCircle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null
    return (
      <div class={classNames(displayClass, "zen-breath")} data-pattern="0">
        <h3>breathe with me</h3>
        <button
          class="zen-breath-button"
          type="button"
          aria-label="Breathing guide. Press to change the rhythm."
        >
          <pre class="zen-breath-art" aria-hidden="true">
            {firstFrame}
          </pre>
          <span class="zen-breath-phase zen-hand">breathe</span>
          <span class="zen-breath-count zen-mono">box · 4 4 4 4</span>
        </button>
        <p class="zen-breath-help">press to change the rhythm</p>
      </div>
    )
  }

  BreathCircle.afterDOMLoaded = script
  return BreathCircle
}) satisfies QuartzComponentConstructor
