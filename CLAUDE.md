# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo: Adnan Baig's portfolio, https://adnanbaig.com.

The site is **Station AB-01**: a pixel-art robotics workcell console. Under the 8-bit layer it is a plain, fast, fully server-rendered resume site. A recruiter gets the name, role, key work, and the resume link in the first viewport with zero interaction. Everything playful (the Teleop Cell game, the AB-01 track, the OPS console, badges, sound, the 404 level) is an optional layer on top and is never a gate.

**Vercel deploys `main` on push.** Work on a branch, commit locally, and do the manual QA pass below before anything reaches `main`.

## Stack

- Next.js 12 (pages router) + React 18 + TypeScript (strict) + Tailwind CSS 3. Do not upgrade the Next or React majors.
- No animation, UI, or audio libraries. Motion is CSS (transform/opacity) and canvas; sound is hand-rolled WebAudio; pixel art is SSR SVG built from JSON.
- Blog: `_posts/*.md` parsed with `gray-matter` and rendered to HTML at build time (`utils/api.ts`, `utils/markdownToHtml.ts`). `scripts/generate-rss.mjs` writes `public/rss.xml` at prebuild; `_drafts/` is never read.
- Fonts are self-hosted latin woff2 in `public/fonts` with their OFL texts: IBM Plex Sans and Mono (body, meta), Pixelify Sans (h1, h2, big numbers; the only preloaded font), Silkscreen (labels, buttons, nav; 16px or 24px only). Each pixel face has a metric-matched fallback `@font-face` so the swap does not shift layout.
- Adding an npm dependency needs a real reason. Use `npm install --package-lock-only`; npm is the only package manager.

## Commands

Node is not on the default PATH on Adnan's Mac. Prefix every command:

```bash
export PATH=$HOME/.local/node/bin:$PATH

NEXT_DIST_DIR=.next-dev npx next dev -p 3200    # dev server
NEXT_DIST_DIR=.next-build npm run build         # production build (runs tsc + lint; prebuild writes public/sitemap.xml and public/rss.xml)
npm run typecheck                               # tsc --noEmit for the app, then for tests/ (tests/tsconfig.json)
npm run lint                                    # ESLint (next lint)
npm run check:copy                              # copy guard + teleop catalog guard + OPS console guard + dossier sketch guard
npm test                                        # the Vitest unit suite (everything in tests/)
npm run test:teleop                             # just tests/teleop (the engine)
npm run check:ssr                               # reads $NEXT_DIST_DIR (default .next-build)/server/pages/*.html; refuses a build older than any source file
npm run og                                      # regenerate public/og.png and the icons, then commit them
```

**Always set `NEXT_DIST_DIR`** for local builds and dev. A long-running `next start` may be serving `.next`; never write to `.next` and never touch `node_modules` in a way that breaks it. Builds fail on any TypeScript or ESLint error by design.

Before every commit: `typecheck`, `lint`, `check:copy`, `npm test`, then one build and `check:ssr`. That is also the CI order (see Engineering).

## Guards (all must pass)

| Guard | File | What it enforces |
| --- | --- | --- |
| `check:copy` | `scripts/check-copy.mjs` | No em dashes, no emoji, no forbidden internal terms, no `TODO`/`_todo` in `data/*.json` (except `_todo`), `_posts/*.md`, and all source under `components/` (including `components/ops/**`), `pages/`, `lib/`, `hooks/`, plus `scripts/build-og.mjs`. Rules live in `scripts/copy-rules.mjs`. |
| `check-teleop` | `scripts/check-teleop.mjs` | `data/teleop.json` maps every skill in `portfolio.json` to exactly one block, every group has a bin, labels are drawable by the bitmap font. |
| `check-ops` | `scripts/check-ops.mjs` | Compiles `components/ops/commands.ts` and runs every command against a stub. Every `help` entry has a handler; all output passes the copy rules; every printed number is a fact from `portfolio.json` / `lib/facts.ts`, a level number, or labeled as the visitor's own (`your run`, `your link`, `your clock`, `SIM`, `this browser`); no availability wording; the eggs reply exactly; `open operator-hmi` targets that card and offers the dossier; `dossier <id>` goes to `/work/<id>` for every project. |
| `check-work` | `scripts/check-work.mjs` | Every project has a sketch in `data/schematics.json` (and no sketch is orphaned). Every node label and edge note appears in that project's own copy (case and punctuation folded). Labels are 1 or 2 lines of at most 13 bitmap-font characters. 4 x 2 grid, one node per cell, no backward flow, no wire through another node. |
| `check:ssr` | `scripts/check-ssr.mjs` | On the built home page: one h1 with the name; eyebrow, lede, proof lines, and the resume link come before the cell; every visible fact string renders; hidden entries and `_todo` never leak; no invented numbers; no canvas, console, badges, or toast in SSR; skip link before TAKE CONTROL; E-STOP and track wiring; `og:image` and `twitter:card`; icons exist. Every card has an "Open dossier" link. Each built `/work/<id>`: one h1 with the title, every project field, canonical and `og:url`, CreativeWork JSON-LD, breadcrumb back to the card, the "FIG. n / system sketch (illustrative)" caption with server-rendered SVG, prev/next, source links, nothing private, listed in the sitemap. `public/rss.xml` lists every post with pubDate and description; the head links it and `/blog` shows an RSS link. On the built 404: Home, Work, and Blog links come before the "Drive AB-01 home" button. On every built page (except /lab and /500): one `<main>` with a skip link to it, exactly one nav named "Main" (the menu panel is "Menu"), a viewport meta that never disables zoom, and every SVG either `aria-hidden` or `role="img"` with a name. Every in-page fragment link on any built page, and every `card-<id>` (OPS `open`), is covered by the `scroll-margin-top` rule in `globals.css`, so no anchor lands under the status bar. |

When you add a guard-relevant feature, extend the guard in the same commit.

## Engineering

**Unit tests** live in `tests/` (Vitest, node environment, no jsdom) and run with `npm test`. They test the real modules, not copies:

| File | Covers |
| --- | --- |
| `tests/teleop/ik.test.ts` | IK round trips, the elbow branch, reach limits (including targets exactly on the reach circle), unwrap, the cable-wrap window, `clampWorkspace`, the servo |
| `tests/teleop/safety.test.ts` | The FSM: E-STOP latches until an explicit CLEAR (refused under the site stop), deadman, watchdog timing, scripted modes |
| `tests/teleop/latency.test.ts` | `CommandBuffer` delays a 60 Hz stream by exactly the set amount; ring overflow; `RttTrace`; `CommandLink` (the engine's link: send-on-change, live command until one is due) |
| `tests/teleop/world.test.ts` | Catalog to bin mapping, right bin sorts, every wrong bin bounces, stacking, seeded shuffles |
| `tests/teleop/episodes.test.ts` | Recorder at 30 Hz and its 60 s cap, Player round trip and determinism, storage parsing (malformed frames dropped) |
| `tests/teleop/pipeline.test.ts` | The headless cell (the engine's `CommandLink`, `driveArm`, `World.step`; only the three-call step order mirrors `engine/index.ts`): auto demo at several latencies, a manual misroute and re-sort, the parked servo, cable-wrap unwinding, deterministic replay |
| `tests/teleop/engine.test.ts` | `createEngine` itself, with `render` and `loop` mocked and the clock owned by the test: E-STOP, site stop, watchdog park, deadman, latency, record and replay, through the public `Engine` API |
| `tests/facts.test.ts` | Every `lib/facts.ts` value matches its source sentence; rewording a sentence makes the import throw (via `vi.doMock` of `portfolio.json`) |
| `tests/ops.test.ts` | OPS parser and registry: help, open/dossier, eggs and the latch, argument checks, Tab completion |
| `tests/feeds.test.ts` | `scripts/feeds.mjs` sitemap and RSS builders, and that the committed `public/sitemap.xml` and `public/rss.xml` are current |
| `tests/content.test.ts` | Project and job fields, unique ids, sketches, the private-data loader, copy rules on every published string |

- Tests type-check under `tests/tsconfig.json` (adds node types); the app `tsconfig.json` excludes `tests/` so Next never sees them.
- `vitest.config.mjs` swaps the server-only `require("./spriteData")` in `lib/pixel/spriteStore.ts` for a dynamic import, because vite-node cannot `require` a .ts file. App code is unchanged.
- Use `tests/helpers/rng.ts` (`seeded()`) wherever a `World` is built, so runs are reproducible.
- A bug fix lands in its own commit with the test that would have caught it. New engine, parser, or generator behavior gets a test in the same commit.
- `vite` is pinned to 6 because Vite 7 needs Node 20.19 or newer.

**CI** is `.github/workflows/ci.yml`: on every push and pull request, Node from `.nvmrc` (20, matching `engines`), then `npm ci`, `lint`, `typecheck`, `check:copy`, `npm test`, `build` (into `.next-build`), and `check:ssr`. To reproduce it, export HEAD into an empty directory (`git archive HEAD | tar -x -C /tmp/ci`) and run the same steps there.

## Fact rules (non-negotiable)

- **Sources of truth:** `public/Adnan_Baig_Resume.pdf` (NDA-safe) and the existing copy in `data/portfolio.json`. Never invent metrics, employers, dates, outcomes, or testimonials. Absence from the resume is not a reason to cut a project.
- **No internal details** beyond the resume: no codenames, internal tools, people, or IDs. `check:copy` has the forbidden list.
- **Every fact renders verbatim from `data/portfolio.json`.** Playful labels are framing only ("BAY 01 / DEPLOYED", "LV 3", "SERVICE LOG", "MOD-01").
- **Derived numbers come from `lib/facts.ts`** (500+, 6 programs, 296 tests, 31 skills, Top 5% (2024), 2nd, May 2025). Each extractor throws if its source sentence changes shape, so the build fails instead of shipping a stale number. Never hand-type one of these numbers in a component.
- **LV numbers** are computed from experience array order (`questLevels()`), oldest is LV 1.
- **Game and visitor values are labeled:** joint angles, latency, episode counts, sorted n/31, ping, clock, and badge counts carry SIM, "your run", "your link", or "your clock".
- **No availability claim anywhere.** `sudo hire adnan` opens a channel (focuses Contact), nothing more.
- **Hidden entries stay hidden.** `experience[].hidden` (Vizualty) and the `_todo` notes are never rendered. `scripts/strip-private-loader.cjs` (wired in `next.config.js`) removes both before `portfolio.json` reaches any JS bundle; node scripts read the full file.
- **Copy voice:** plain, punchy, short. No em dashes. No emoji characters (pixel-art icons are fine).

## Code map

```
pages/
  _document.tsx     pre-paint script (html flags below) + view-source hello + icons; preloads Pixelify only
  _app.tsx          global CSS, viewport
  index.tsx         home: Hero (BAY 00), Selected work (01), Experience (02), Independent builds (03),
                    About + Inventory + Diploma + Trophies + Visitor badges (04), Writing (05); Footer is Contact (06)
  404.tsx           "Signal lost": plain links first, optional "Drive AB-01 home" level below
  work/[id].tsx     project dossiers (SSG over every project): breadcrumb, MOD/RIG plate, brief + checklist,
                    spec sheet, FIG. n system sketch (illustrative) + netlist, prev/next, CreativeWork JSON-LD
  blog/             index (with the RSS link) + [slug], reading-first layout
  lab.tsx           noindex review bench: every sprite, the palette with contrast, frames, the OG card
components/
  Header/           status bar, nav, RESUME.PDF, Text mode, E-STOP, OPS>, menu; mounts ScrollTrack + StationLayer
  ScrollTrack/      AB-01 walking the 28px track (frames incl. wave and sit groups)
  EStop/            global E-STOP toggle
  sections/         Hero, BootLog (CSS-only POST), Telemetry (derived facts), Inventory (skill cross-reference)
  WorkCard/         MOD/RIG cards (id="card-<id>", heading id="project-<id>", data-skills, OPEN DOSSIER link)
  Footer/           Uplink (contact) with COPY ADDRESS
  pixel/            Sprite, PixelButton, Panel, Led, Eyebrow, DitherBand
  teleop/           TeleopCell (main-bundle shell + SSR poster), TeleopLive + engine/ (lazy)
  ops/              OpsButton/KeysButton, SoundToggle, sound.ts, StationLayer (shortcuts, dialogs, idle boot),
                    Terminal + commands.ts (lazy), Keymap (lazy), useModal
  Toast/            badge toast (lazy, role=status)
  Badges/           "Visitor badges (earned in this browser)" row (lazy, client-only)
  lost/             LostSignal, the 404 micro-level (lazy)
lib/
  facts.ts          derived numbers (see Fact rules)
  projects.ts       every project in order with its MOD/RIG unit, FIG. number, icon (PROJECT_ICONS), dossier href
  schematic.ts      build-time renderer for the dossier sketches (bitmap-font labels, wide 4x2 and phone 2x4 layouts)
  skillIndex.ts     skill -> cards/roles/About paragraphs it appears in (aliases must be honest)
  bus.ts            typed window CustomEvents
  station.ts        html flag getters/setters (estop, plain, theme, crt) + reduced-motion helpers
  storage.ts        local/session storage with an in-memory fallback, and all storage KEYS
  badges.ts         visitor badges + secrets (localStorage), earning rules
  audio.ts          the synth (lazy; the only AudioContext)
  hello.ts          console greeting + window.ab01 (lazy)
  puppet.ts         AB-01 wave/dance/color and the idle sit (lazy)
  pixel/            sprites.json, font.json (5x7 bitmap), toPaths.ts (pure), spriteData.ts (the sheet,
                    lazy in the browser), spriteStore.ts (where <Sprite> finds it), raster.ts, tokens.ts, groups.ts
  clientOnly.tsx    React.lazy behind a mount guard; use it instead of next/dynamic
  teleop/dims.ts    the cell's 320x180 frame (so the poster shell does not import the scene)
  teleop/scene.ts   workcell geometry and drawing shared by the SSR poster and the canvas
data/
  portfolio.json    all content (typed by types/portfolio.ts)
  teleop.json       skill block labels and bin labels for the cell
  schematics.json   per-project sketch spec (nodes on a 4x2 grid, edges); labels must come from that project's copy
_drafts/            unpublished posts (never read by the build; move to _posts/ only after Adnan approves)
scripts/            guards, feeds.mjs (pure sitemap and RSS builders) + the prebuild writers, OG renderer, private-data loader
tests/              Vitest unit suite (see Engineering)
.github/workflows/  ci.yml
```

## Design tokens and pixel primitives

- **Palette "Station 16"** lives as CSS custom properties in `:root` (`styles/globals.css`) and is mapped into `tailwind.config.js` colors (the default Tailwind palette is replaced). `lib/pixel/tokens.ts` mirrors it for `/lab` contrast checks. Text tokens: `--paper` (body), `--mist` (muted), `--teal` (accent, links, focus), `--amber`, `--coral`, `--leaf`, `--violet`, `--sky`. Never text: `--steel`, `--alloy`, `--rust`, `--sand`, `--moss`. No body text on a colored fill.
- **Themes:** `html[data-theme="amber"]` and `html[data-theme="mono"]` (high contrast, all accents white, links underlined, scanlines and dither off) override the variables. The canvas reads the live variables, so it recolors too.
- **Skill groups and bins:** Programming = teal, Robotics & ML = amber, Embedded & Hardware = leaf, Software & Infrastructure = violet. Always paired with the text label.
- **Bay accents:** 00/01 teal, 02 amber, 03 leaf, 04/05 violet, 06 sky (`data-bay` / `data-accent` set `--accent`).
- **Primitives:** `.px-frame` (2px border, stepped corner notch on `::before` so `clip-path` never clips a focus ring; variants `--active`, `--inset`, `--crt`), `.px-titlebar`, `.px-body`, `.px-btn` (`--primary`, `--secondary`, `--danger`, `--ghost`, `--compact`; 48px min height; 2px press), `.chip`, `.led` (blink 0.5 Hz, motion only), `.crt-screen` (the only place scanlines appear), `.dither` (static Bayer bands between bays). No `border-radius` anywhere.
- **Focus:** 2px teal outline at 2px offset plus pixel corner brackets on buttons and chips. Always visible on `:focus-visible`.
- **Digits and ampersands:** Pixelify Sans draws 5 like an S, and Silkscreen draws & like a $. Two `unicode-range` faces fix both everywhere: "Pixel Digits" (0-9 from Silkscreen) leads `--font-pixel`, and "Label Amp" (& from Pixelify) leads `--font-label`. Big numbers (telemetry values, LV numbers) use Silkscreen outright. Check any new numeric display on a screenshot.
- **Type rules:** Silkscreen only at 16px, 24px, or 32px (multiples of its 8px grid; 32px is for LV numbers only), uppercase, 0.04em tracking, `-webkit-font-smoothing: none` on those elements only. Anything smaller uses Plex Mono 13 to 14px. Paragraphs are Plex Sans 17 to 18px, line height 1.6.
- **Sprites:** authored at 1x as palette-indexed string rows in `lib/pixel/sprites.json` (`.` is transparent; keys come from `palette`). `components/pixel/Sprite.tsx` renders crisp SSR SVG, one `<path>` per color via `rowsToPaths` (horizontal runs merged). The art is server markup: the browser keeps it through hydration without the sheet (`hooks/useServerMarkup.ts`, `dangerouslySetInnerHTML` plus `suppressHydrationWarning`), and loads `lib/pixel/spriteData.ts` only when it must draw something the server did not (a client-side navigation, or a new frame such as the SND speaker). The cell poster (`CellPoster` + `posterArt.ts`) and the track walker frames work the same way. `--px` is 3px under 768px and 4px above. The canvas and the OG renderer use the same JSON, and canvas text uses `lib/pixel/font.json`, so no font load gates the canvas.

### Adding a sprite

1. Add rows to `lib/pixel/sprites.json` (every row the same width, only palette keys). Generating rows with a script is fine; keep the output in the JSON.
2. Review it on `/lab` (every sprite renders at 1x to 4x) and on the page where it is used.
3. **Original art only.** No recreating or imitating any existing game, character, sprite, level, logo, or look. Genre conventions (pixel art, HUDs, CRTs, platforming) are fine. AB-01 is a squat 16x24 biped: steel chassis, digitigrade legs with boxy feet, thin arms with 2-finger grippers, a wide black teleop visor with two 2x2 teal eyes, one antenna with a status LED, a 5-segment battery pack on the back. Do not drift it toward a known character.
4. `sprites.json` does not ship in the main bundle (see Sprites above), so new art costs nothing on first load. A sprite that changes on the client (new `frame`, `name`, or `mono`) loads the sheet chunk the first time it changes. A lazy chunk that draws sprites on mount imports `lib/pixel/spriteData` directly (Badges and Toast do).

## Adding or editing content

- **A project:** add it to `projects` (Selected work) or `engineeringProjects` (Independent builds) in `data/portfolio.json`, following `types/portfolio.ts` (at most four highlights). That one entry feeds the card (MOD/RIG number from position), its `/work/<id>` dossier and sitemap entry, the Inventory cross-reference (via its stack and highlights), the OPS console (`projects`, `open <id>`, `dossier <id>`, Tab completion), and `check:ssr` (every field must render on the home page and on the dossier). Add a sketch to `data/schematics.json` using only parts the project's copy names (`check-work` fails until you do). Add a 32x32 icon to `sprites.json` and map it in `lib/projects.ts` (`PROJECT_ICONS`), or it falls back to a skill block.
- **A skill:** add it to `skills` and give it exactly one block in `data/teleop.json` (2 to 6 uppercase chars the bitmap font can draw). `check-teleop` fails until you do.
- **A job:** add to `experience` newest first; LV numbers update automatically. `current: true` gets the CURRENT badge. `hidden: true` keeps it out of every page and bundle.
- **A number you want to show:** derive it in `lib/facts.ts` with an extractor that throws on drift. Then use the export.

## Event bus and html flags

Independent islands talk through typed window CustomEvents (`lib/bus.ts`, `emit` / `on`):

| Event | Emitted by | Used by |
| --- | --- | --- |
| `ab:skill` | Teleop engine (correct sort) | Inventory chip "found" mark |
| `ab:cell` | Teleop engine: grip, sort, misroute, stop, clear, rec, saved, replay, complete | sound, badges |
| `ab:cmd` | OPS `latency <ms>` | live Teleop engine |
| `ab:estop` | `setEstop` | track, canvas, 404 level, sound (mutes) |
| `ab:ops` | OPS console: open, key, run, deny | sound, badges |
| `ab:open` | OPS>/Keys buttons | StationLayer (opens the dialog, remembers the opener), Header (closes the menu) |
| `ab:bot` | `window.ab01`, head-logo triple-click | `lib/puppet.ts` |
| `ab:badge` | `lib/badges.ts` `earn()` | toast, badges row, sound |
| `ab:sound` | `components/ops/sound.ts` | SND toggles stay in sync |
| `ab:home` | 404 level finished | badges, sound |

Flags on `<html>`, all applied by the inline pre-paint script in `pages/_document.tsx` before first paint:

- `js`: scripting is on (`.lost__drive` and similar only show with JS).
- `motion-ok`: the visitor has not asked for reduced motion. **Every CSS animation must be gated on `.motion-ok`.**
- `data-plain`: Text Mode (`?plain=1`, or the saved choice). Everything in Plex, one column, no pixel decoration.
- `data-theme="amber" | "mono"`: saved theme (`theme` command).
- `data-estop`: the global E-STOP is latched (persists across visits). Stops every CSS animation and transition (`animation: none`, so one-shot entrances such as the OPS drawer and toast land on their visible final state instead of freezing invisible at keyframe 0), freezes the track, the cell, and the 404 level, and mutes sound.
- `data-booted`: the boot POST already played this session.
- `data-crt="off"`: scanlines hidden (`crt off`).

Storage keys live in `lib/storage.ts` `KEYS`. Read storage only in effects and handlers so server and client markup match.

## Lazy loading and budgets

The first viewport is plain SSR HTML. Heavy or optional pieces load on intent:

| Piece | Loads when | Budget (gzip) |
| --- | --- | --- |
| `/` First Load JS | always | 110 kB target, 130 kB hard ceiling (99 kB after the sprite split) |
| `/work/<id>` First Load JS | always on a dossier | about 94 kB; the sketch SVG is built in `getStaticProps`, so `lib/schematic.ts` and `font.json` never ship |
| Sprite sheet (`lib/pixel/spriteData`) | a client-side navigation, a live sprite frame change, or a lazy chunk that draws sprites | about 4 kB |
| Teleop engine + live cell (`TeleopLive`) | TAKE CONTROL / AUTO DEMO, or idle prefetch once the cell is half visible | 25 kB |
| OPS console UI (`Terminal`) | first open (`/`, `` ` ``, OPS>) | 8 kB per chunk (about 4 kB today) |
| OPS parser + command table (`commands.ts`) | `import()` as the console mounts | 8 kB per chunk (about 6.5 kB today; the two together are about 10 kB) |
| Keymap placard | first `?` / Keys | small |
| Synth (`lib/audio.ts`) | SND opt-in (warmed on hover/focus of the toggle) | 2 kB |
| Toast + badge rules, console greeting, puppetry | idle (or first input) | small |
| Visitor badges row | after hydration, client-only | small |
| 404 level (`LostSignal`) | "Drive AB-01 home" click | 8 kB |

After a build, check the table Next prints, and confirm lazy chunks are not in `build-manifest.json` for `/`. Client-only lazy components use `lib/clientOnly` (React.lazy behind a mount guard), not `next/dynamic`, which drags its loadable runtime into the first load. Server-only code behind `typeof window === "undefined" ? require(...) : null` is dropped from the browser build (Next compiles `typeof window` to a constant). Sprites cost zero image requests. Fixed aspect-ratio boxes mean no layout shift when the poster swaps for the canvas.

## Motion, sound, and access contract

- Animate only transform, opacity, and canvas. UI transitions are 120ms (buttons, chips) and 160ms (panels) with `steps(4)`.
- Nothing blinks faster than 1 Hz; nothing flashes above 3 Hz. Highlight pulses fire once for 600ms.
- **Reduced motion:** final states immediately; static conveyor; AB-01 cuts between checkpoints (no walk, beam, or idle sit; puppet acts hold one pose); no boot typing, reels, particles, shake, or landing squash; smooth scroll off.
- **Canvas loops** (cell, 404 level) run a fixed 60 Hz step with rAF render and stop off-screen, on a hidden tab, under E-STOP, and when settled.
- **Keyboard:** arrow keys are captured only while the cell (or the 404 level) has focus; Esc releases. Global shortcuts (`/`, `` ` ``, `?`) ignore inputs, textareas, selects, contenteditable, and any Ctrl/Meta/Alt chord. Dialogs (OPS console, keymap) are native modal `<dialog>`s via `useModal`: Tab wraps inside, Esc and backdrop close, focus returns to the opener (or the menu button if the opener was in the closed menu).
- **Touch:** D-pad, GRIP, HOLD, and the 404 pads are 56px or larger; every other control is at least 44px on a coarse pointer (track checkpoints are 44px wide, and a Writing entry is its title link's target). The status bar fits from 320px (below 375px it tightens gaps and uses 44px E-STOP and menu squares). Nothing is hover-only.
- **iOS:** `viewport-fit=cover`, so the container gutter, the OPS drawer, and the toast take `env(safe-area-inset-*)`. Use `svh` (with a `vh` fallback line) for viewport heights. The OPS input is 16px so Safari does not zoom on focus. No `backdrop-filter`, and no `overflow` on any ancestor of the sticky status bar.
- **Sound** is off by default. The AudioContext is created only inside `lib/audio.ts` `enable()`, reached only through `import()` in `components/ops/sound.ts` after an opt-in (SND click, `sound on`, or the first gesture of a visit after a saved opt-in). Master gain 0.06. Every sound doubles a visual or text cue.
- **Content is HTML.** The canvas is `aria-hidden` and only duplicates labels that exist in the HTML; narration goes through one polite live region per island. The page is complete with JS off, in Text Mode, and in print.

## OPS console

Opened with `/`, `` ` ``, or the OPS> button. Commands (all output generated from `portfolio.json` and `lib/facts.ts`):

`help`, `whoami`, `status`, `resume`, `projects` / `ls`, `open <id>`, `dossier <id>`, `experience`, `skills`, `education`, `awards`, `contact`, `email` (copy), `github`, `linkedin`, `blog`, `teleop`, `latency <ms>` (0 to 300, SIM), `estop`, `keys`, `badges`, `clear`, `theme cyan|amber|mono`, `sound on|off`, `crt on|off`, `ping` (your link), `history`, `date` (your clock), `exit`.

Table output (`help`, `projects`) is a name padded with `padEnd` and then a description. `Terminal.tsx` splits any plain output line with two or more spaces after the name into two cells that stack under 640px, so keep that format for new tables.

Eggs (not listed in `help`): `sudo hire adnan` ("Access granted. Opening a channel.", then focuses Contact's COPY ADDRESS), `rm -rf /` ("Fail-closed. Request denied and latched. Type clear to resume."; the console stays latched until `clear`). Every command has an ordinary on-page equivalent.

Other discoveries: `window.ab01.wave()`, `.dance()`, `.color('amber')`; triple-click the AB-01 head in the status bar; AB-01 sits after 20 s idle; a view-source hello in the pre-paint script. The keymap placard lists secrets only after they are found.

**Visitor badges** (`lib/badges.ts`): Calibrated (sort 31/31), Fail-closed (latch and clear a stop), Recorded (record and replay), Root access (open the console), Signal found (finish the 404 level), Night shift (visit 22:00 to 05:00 local), Read the manual (open the resume). They live in localStorage, render only after mount in their own clearly labeled row, and never mix with the real awards. No points.

## Social card and icons

`npm run og` (`scripts/build-og.mjs`) is a dependency-free PNG encoder that rasterizes `sprites.json` and `font.json` with the name, title, location, and host from `portfolio.json` into `public/og.png` (1200x630), `public/icon-32.png`, and `public/apple-touch-icon.png` (180x180). Re-run and commit after changing AB-01, the arm, or those facts. `components/Seo` defaults `og:image` to `/og.png` (so `twitter:card` is `summary_large_image`); `favicon.ico` stays.

## Manual QA before merging to main

Headless browsers are blocked in the agent environment, so a human pass is the only visual check. Run `NEXT_DIST_DIR=.next-dev npx next dev -p 3200` and open it on a laptop and a phone (same Wi-Fi, `http://<mac-ip>:3200`).

1. First viewport, no interaction: name, role, lede, three proof rows, RESUME.PDF (also in the status bar). Nothing waits on a boot screen.
2. Read every section top to bottom. Facts match the resume PDF. No overflow in the status bar at 320px, 375px, 768px, 1024px, 1280px.
3. Keyboard only: Tab from the top (skip links work, focus is always visible), TAKE CONTROL, drive with arrows, Space to grip, X then C, R to record, Esc releases. Inventory chips toggle highlights; Clear works.
4. `/` opens the console; run `help`, `open operator-hmi`, `sudo hire adnan`, `rm -rf /` then `clear`, `theme amber`, `theme mono`, `theme cyan`, Esc. `?` opens the placard. Focus returns where it was.
5. Header E-STOP: everything freezes, sound mutes, the cell refuses CLEAR until the header stop is released.
6. SND on: a short chime; grip and sort blip. Reload: sound stays on but starts only after your first click.
7. macOS "Reduce motion" on: no walking, typing, particles, or shake; the conveyor is static.
8. Phone: menu opens and closes, touch pads drive the cell, the 404 level (visit `/nope`) is playable with pads.
9. Text mode, print preview, and JS disabled all show the full content.
10. `/lab`: review new art against the original-art rule; check the OG card.
11. Paste a page URL into a link-preview tool (or Slack DM to yourself) after deploy to confirm the card.

Then merge to `main` (that deploys).
