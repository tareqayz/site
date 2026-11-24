import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import type { FullPageLayout } from "./quartz/cfg"
import * as Zen from "./quartz/components/zen"
import { HandCallouts } from "./quartz/components/zen/plugins/handCallouts"

const config = await loadQuartzConfig()

// `> [!hand]` callouts lose their generated title before descriptions are computed.
const transformers = config.plugins.transformers
const description = transformers.findIndex((plugin) => plugin.name === "Description")
transformers.splice(description < 0 ? transformers.length : description, 0, HandCallouts())

export default config

// ── tareqayz zen layout ──────────────────────────────────────────────────────
// Quartz 5.2 applies TypeScript layout overrides only when they are passed to
// loadQuartzLayout(overrides): that call updates the renderer's layout in place. Overrides
// replace whole slots, so start from the YAML layout and add the zen components to it.
const base = await loadQuartzLayout()

const zen = {
  sand: Zen.SandGarden(),
  garden: Zen.YearGarden(),
  breath: Zen.BreathCircle(),
  dayStamp: Zen.DayStamp(),
  dayNav: Zen.DayNav(),
  nav: Zen.ZenNav(),
  recent: Zen.RecentDays({ limit: 5 }),
  footer: Zen.ZenFooter({
    // add instagram / tiktok / youtube here once they're ready
    links: {
      github: "https://github.com/tareqayz",
      rss: "index.xml",
    },
  }),
}

// A page type's slot falls back to the defaults when its YAML entry doesn't set it.
type Slot = "left" | "right" | "beforeBody" | "afterBody"
const slot = (pageType: string, name: Slot) =>
  base.byPageType[pageType]?.[name] ?? base.defaults[name] ?? []

const byPageType: Record<string, Partial<FullPageLayout>> = {}
for (const pageType of Object.keys(base.byPageType)) {
  byPageType[pageType] =
    pageType === "404"
      ? { footer: [zen.footer] }
      : { left: [...slot(pageType, "left"), zen.nav, zen.recent], footer: [zen.footer] }
}

byPageType.content = {
  ...byPageType.content,
  // SandGarden, YearGarden and BreathCircle render on the homepage only; DayStamp and DayNav on
  // log/* only
  beforeBody: [zen.sand, ...slot("content", "beforeBody"), zen.dayStamp],
  afterBody: [zen.garden, ...slot("content", "afterBody"), zen.dayNav],
  right: [zen.breath, ...slot("content", "right")],
}

export const layout = await loadQuartzLayout({ byPageType })
