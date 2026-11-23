# tareqayz: daily training log

A Quartz 5 site (upstream `jackyzha0/quartz` v5.2.2, remote `upstream`) for the tareqayz account: one note per day of training, with the sources behind it. Style: stone & fog colors, handwriting (Reenie Beanie), and calm, moving ASCII art.

## Writing a day

- **File:** `content/log/YYYY-MM-DD.md`, one per calendar day. In Obsidian (open `content/` as the vault), "Open today's daily note" creates it from `content/templates/log.md`.
- **Frontmatter:**
  ```yaml
  title: "hips, hangs and a long walk" # or leave the date
  date: "2026-11-24" # required: a note in log/ only counts as a day with a date (frontmatter or filename)
  tags: [mobility, strength] # the 8 domains below, plus free tags like experiment
  duration: 60 # minutes, optional
  draft: false # true = not published (but still visible in the public repo)
  ```
- **The 8 domains** (tags → chips): strength `STR`, power `PWR`, endurance `END`, cardio `CAR`, flexibility `FLX`, mobility `MOB`, balance `BAL`, agility `AGI`. They mirror `unorthodox/src/domains/domains.ts`.
- **Sources:** one note per source in `content/sources/` (template: `content/templates/source.md`; frontmatter `type`, `author`, `year`, `url`). Cite them from a day with `[[source-note|label]]`. Each source's backlinks list the days that cited it.
- **Movements (optional):** `content/movements/<exercise>.md`, linked the same way.
- **Handwriting:**
  - `> [!hand]` for a handwritten line
  - `> [!coach]` for a dashed "note to self"
  - `==text==` for a marker highlight
  - `<div data-zen="breath"></div>` embeds the breathing ensō
- **Never invent** workouts, numbers or citations. Only write what Tareq actually did and read.
- **Private notes** go in `content/private/`. That folder is gitignored and never published. The repo is public, so anything else committed is visible on GitHub, drafts included.

## Publish and preview

- Preview: `npx quartz build --serve` → http://localhost:8080. Restart it after editing `quartz.ts` or anything in `quartz/components/zen/`. Also restart after adding or deleting a log: the dev server only re-renders changed files, so the mala and "recent days" can lag. Production builds always start clean.
- **Publish:** `npx quartz sync` commits and pushes to `v5` on `github.com/tareqayz/site`. The Vercel project is `noktah/tareqayz` → https://tareqayz.vercel.app, with build settings in `vercel.json`.
  - Vercel doesn't watch the repo yet: the GitHub link needs a GitHub login connection on the Vercel account (Account Settings → Authentication). Until then, also run `vercel deploy --prod --scope noktah`; `.vercelignore` keeps `content/private/` and local files out of the upload.
  - Once GitHub is connected, run `vercel git connect` once, and every push deploys.
- Checks: `npm run check` (tsc + prettier) and `npx quartz plugin doctor`.

## Where things live

- `quartz.config.yaml`: site settings, palette, fonts, plugins.
- `quartz.ts`: wires the zen components into the layout and adds the `HandCallouts` transformer. Quartz 5.2 only applies layout overrides passed to `loadQuartzLayout(overrides)`, and an override replaces a whole slot. So it starts from the YAML layout (`base`) and falls back to `base.defaults` for slots a page type doesn't set.
- `quartz/components/zen/`: the zen components.
  - `MalaHero`: 108 beads, one per calendar day since the first log. Oval on wide screens, round on phones.
  - `BreathCircle`: the breathing ensō.
  - `DayStamp`, `DayNav`, `RecentDays`, `ZenNav`, `ZenFooter`: the smaller pieces.
  - Shared logic is in `lib/`, browser scripts in `scripts/*.inline.ts`.
- `quartz/styles/custom.scss`: the theme. It `@use`s the zen styles on purpose: Quartz puts component `.css` in the `quartz-base` cascade layer, where it loses to this file and to the built-in font rules.
- Fonts are `selfHosted` as full TTFs. They're bigger than Google's woff2 subsets, but those subsets drop the box-drawing and geometric glyphs (`● ◌ ◎ ┃ ╱`) the ASCII art needs.

## Upgrading Quartz

`npx quartz upgrade` merges `upstream/v5`. Upstream files changed here: `quartz.ts`, `quartz/styles/custom.scss`, `quartz/static/icon.png` (the mala icon), and `.github/dependabot.yml` (deleted).
