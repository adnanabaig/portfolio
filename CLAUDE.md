# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo: Adnan Baig's portfolio, https://adnanbaig.com.

The site is **Station AB-01**: a pixel-art robotics workcell console. Under the 8-bit layer it is a plain, fast, fully server-rendered resume site. A recruiter gets the name, role, key work, and the resume link in the first viewport with zero interaction. Everything playful (the AB-01 track, the OPS console, badges, sound, the 404 level) is an optional layer on top and is never a gate.

**Vercel deploys `main` on push.** Work on a branch, commit locally, and do the manual QA pass below before anything reaches `main`.

## Stack

- Next.js 12 (pages router) + React 18 + TypeScript (strict) + Tailwind CSS 3. Do not upgrade the Next or React majors.
- No animation, UI, or audio libraries. Motion is CSS (transform/opacity) and canvas; sound is hand-rolled WebAudio; pixel art is SSR SVG built from JSON.
- Blog: `_posts/*.md` parsed with `gray-matter` and rendered to HTML at build time (`utils/api.ts`, `utils/markdownToHtml.ts`). `scripts/generate-rss.mjs` writes `public/rss.xml` and `data/posts-index.json` (the command palette's post list) at prebuild; `_drafts/` is never read. After adding or editing a post, run `node scripts/generate-rss.mjs` and commit both (the feeds test fails otherwise).
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
npm run check:copy                              # copy guard + OPS console guard + dossier sketch guard
npm test                                        # the Vitest unit suite (everything in tests/)
npm run check:ssr                               # reads $NEXT_DIST_DIR (default .next-build)/server/pages/*.html; refuses a build older than any source file
npm run og                                      # regenerate public/og.png and the icons, then commit them
npm run grain                                   # regenerate public/tex/grain.png (seeded, reproducible), then commit it
```

**Always set `NEXT_DIST_DIR`** for local builds and dev. A long-running `next start` may be serving `.next`; never write to `.next` and never touch `node_modules` in a way that breaks it. Builds fail on any TypeScript or ESLint error by design.

Before every commit: `typecheck`, `lint`, `check:copy`, `npm test`, then one build and `check:ssr`. That is also the CI order (see Engineering).

## Guards (all must pass)

| Guard | File | What it enforces |
| --- | --- | --- |
| `check:copy` | `scripts/check-copy.mjs` | No em dashes, no emoji, no forbidden internal terms, no `TODO`/`_todo` in `data/*.json` (except `_todo`), `_posts/*.md`, and all source under `components/` (including `components/ops/**`), `pages/`, `lib/`, `hooks/`, plus `scripts/build-og.mjs`, `scripts/build-grain.mjs`, and `scripts/png.mjs`. Rules live in `scripts/copy-rules.mjs`. |
| `check-ops` | `scripts/check-ops.mjs` | Compiles `components/ops/commands.ts` and runs every command against a stub. Every `help` entry has a handler; `teleop` and `latency` stay unknown commands; all output passes the copy rules; every printed number is a fact from `portfolio.json` / `lib/facts.ts`, a level number, or labeled as the visitor's own (`your run`, `your link`, `your clock`, `this browser`); no availability wording; the eggs reply exactly; `open operator-hmi` targets that card and offers the dossier; `dossier <id>` goes to `/work/<id>` for every project. |
| `check-work` | `scripts/check-work.mjs` | Every project has a sketch in `data/schematics.json` (and no sketch is orphaned). Every node label and edge note appears in that project's own copy (case and punctuation folded). Labels are 1 or 2 lines of at most 13 bitmap-font characters. 4 x 2 grid, one node per cell, no backward flow, no wire through another node. |
| `check:ssr` | `scripts/check-ssr.mjs` | On the built home page: one h1 with the name; eyebrow, lede, proof lines, and the resume link come before the cell view; every visible fact string renders; hidden entries and `_todo` never leak; no invented numbers; the cell view is an `aria-hidden` frame with server-rendered SVG paths and no controls; no canvas and no game wording (take control, auto demo, skip teleop, teleop cell); no console, badges, toast, or command palette in SSR; both palette launchers carry `aria-keyshortcuts="Meta+K Control+K"`; keycaps render both the Cmd and the Ctrl label; the pre-paint script sets `data-os`; E-STOP and track wiring; `og:image` and `twitter:card`; icons exist. Every card has an "Open dossier" link. Each built `/work/<id>`: one h1 with the title, every project field, canonical and `og:url`, CreativeWork JSON-LD, breadcrumb back to the card, the "FIG. n / system sketch (illustrative)" caption with server-rendered SVG, prev/next, source links, nothing private, listed in the sitemap. `public/rss.xml` lists every post with pubDate and description; the head links it and `/blog` shows an RSS link. On the built 404: Home, Work, and Blog links come before the "Drive AB-01 home" button. On every built page (except /lab and /500): one `<main>` with a skip link to it, exactly one nav named "Main" (the menu panel is "Menu"), a viewport meta that never disables zoom, and every SVG either `aria-hidden` or `role="img"` with a name. Every in-page fragment link on any built page, and every `card-<id>` (OPS `open`), is covered by the `scroll-margin-top` rule in `globals.css`, so no anchor lands under the status bar. |

When you add a guard-relevant feature, extend the guard in the same commit.

## Engineering

**Unit tests** live in `tests/` (Vitest, node environment, no jsdom) and run with `npm test`. They test the real modules, not copies:

| File | Covers |
| --- | --- |
| `tests/facts.test.ts` | Every `lib/facts.ts` value matches its source sentence; rewording a sentence makes the import throw (via `vi.doMock` of `portfolio.json`) |
| `tests/ops.test.ts` | OPS parser and registry: help, open/dossier, eggs and the latch, `teleop` and `latency` gone, argument checks, Tab completion, table rows (every `help` and `projects` row splits into name and description) |
| `tests/feeds.test.ts` | `scripts/feeds.mjs` sitemap, RSS, and posts-index builders, and that the committed `public/sitemap.xml`, `public/rss.xml`, and `data/posts-index.json` are current |
| `tests/fuzzy.test.ts` | `lib/fuzzy.ts`, the palette scorer: ordering, no match, case folding, index ranges |
| `tests/workcell.test.ts` | The hero cell view scene: every rect inside the 320x180 frame, palette keys only, memoized markup with an ink backdrop and CSS-variable fills; the game sprites (bin, conveyor) stay out of the sheet |
| `tests/schematic.test.ts` | The dossier sketch renderer: arrowheads sharing a box face get separate ports (at least 16 units apart), and every tip stops `TIP_GAP` short of the box |
| `tests/content.test.ts` | Project and job fields, unique ids and skills, sketches, the private-data loader, copy rules on every published string |
| `tests/lighting.test.ts` | Every `litSurfaces` composite holds 4.5:1 for every text token on it (via `tokens.ts` `contrast()`); the palette's active row keeps mist at 5.2:1 and paper at 9.7:1 in the cyan and amber themes; every decorative light selector is reset in the Text Mode, mono, and print lists; every CSS animation sits under `.motion-ok`; no `backdrop-filter`, blur filter, or shadow blur over 60px; the `tokens.ts` lighting mirror matches `globals.css`; `grain.png` under 2 kB |
| `tests/lamp.test.ts` | `lib/lamp.ts` on a stubbed DOM: no layout read in pointermove, one rect read on enter and one after a scroll, one style write per frame, dialogs skipped, detach and clear on E-STOP / reduced motion / Text Mode, re-attach on release |

- Tests type-check under `tests/tsconfig.json` (adds node types); the app `tsconfig.json` excludes `tests/` so Next never sees them.
- `vitest.config.mjs` swaps the server-only `require("./spriteData")` in `lib/pixel/spriteStore.ts` for a dynamic import, because vite-node cannot `require` a .ts file. App code is unchanged.
- A bug fix lands in its own commit with the test that would have caught it. New parser, generator, or renderer behavior gets a test in the same commit.
- `vite` is pinned to 6 because Vite 7 needs Node 20.19 or newer.

**CI** is `.github/workflows/ci.yml`: on every push and pull request, Node from `.nvmrc` (22, matching `engines`), then `npm ci`, `lint`, `typecheck`, `check:copy`, `npm test`, `build` (into `.next-build`), and `check:ssr`. To reproduce it, export HEAD into an empty directory (`git archive HEAD | tar -x -C /tmp/ci`) and run the same steps there.

## Fact rules (non-negotiable)

- **Sources of truth:** `public/Adnan_Baig_Resume.pdf` (NDA-safe) and the existing copy in `data/portfolio.json`. Never invent metrics, employers, dates, outcomes, or testimonials. Absence from the resume is not a reason to cut a project.
- **No internal details** beyond the resume: no codenames, internal tools, people, or IDs. `check:copy` has the forbidden list.
- **Every fact renders verbatim from `data/portfolio.json`.** Playful labels are framing only ("BAY 01 / DEPLOYED", "LV 3", "SERVICE LOG", "MOD-01").
- **Derived numbers come from `lib/facts.ts`** (500+, 6 programs, 296 tests, 31 skills, Top 5% (2024), 2nd, May 2025). Each extractor throws if its source sentence changes shape, so the build fails instead of shipping a stale number. Never hand-type one of these numbers in a component.
- **LV numbers** are computed from experience array order (`questLevels()`), oldest is LV 1.
- **Visitor values are labeled:** ping, clock, and badge counts carry "your run", "your link", "your clock", or "this browser".
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
  lab.tsx           noindex review bench: every sprite, the palette with contrast, lighting lit/unlit and the
                    litSurfaces contrast table, frames, the OG card
components/
  Header/           status bar, nav, RESUME.PDF, Text mode, E-STOP, OPS>, menu; mounts ScrollTrack + StationLayer
  ScrollTrack/      AB-01 walking the 28px track (frames incl. wave and sit groups)
  EStop/            global E-STOP toggle
  sections/         Hero, BootLog (CSS-only POST), Telemetry (derived facts), Inventory (skill cross-reference)
  WorkCard/         MOD/RIG cards (id="card-<id>", heading id="project-<id>", data-skills, OPEN DOSSIER link)
  Footer/           Uplink (contact) with COPY ADDRESS
  pixel/            Sprite, PixelButton, Panel, Led, Eyebrow, DitherBand, Kbd (keycaps, 7x7 glyphs)
  workcell/         CellView: the hero CRT, a static SSR render of the workcell (decorative, aria-hidden)
  ops/              OpsButton/KeysButton/PaletteButton, SoundToggle, sound.ts, StationLayer (shortcuts, dialogs,
                    idle boot), Terminal + commands.ts (lazy), Keymap (lazy), Palette (lazy), useModal
  Toast/            badge and action toasts (lazy, role=status)
  Badges/           "Visitor badges (earned in this browser)" row (lazy, client-only)
  lost/             LostSignal, the 404 micro-level (lazy; under 560px it shows half the world at 2x in an 8:9 box, following AB-01)
lib/
  facts.ts          derived numbers (see Fact rules)
  projects.ts       every project in order with its MOD/RIG unit, FIG. number, icon (PROJECT_ICONS), dossier href
  schematic.ts      build-time renderer for the dossier sketches (bitmap-font labels, wide 4x2 and phone 2x4 layouts)
  skillIndex.ts     skill -> cards/roles/About paragraphs it appears in (aliases must be honest)
  bus.ts            typed window CustomEvents
  fuzzy.ts          the command palette's subsequence scorer (score + matched indices)
  copy.ts           copy the email (COPY ADDRESS and the palette share it)
  station.ts        html flag getters/setters (estop, plain, theme, crt) + reduced-motion helpers
  storage.ts        local/session storage with an in-memory fallback, and all storage KEYS
  badges.ts         visitor badges + secrets (localStorage), earning rules
  audio.ts          the synth (lazy; the only AudioContext)
  hello.ts          console greeting + window.ab01 (lazy)
  puppet.ts         AB-01 wave/dance/color and the idle sit (lazy)
  lamp.ts           the inspection lamp: lights the frame under a fine pointer (lazy; see Lighting)
  loop.ts           fixed 60 Hz step + rAF render loop (the 404 level)
  pixel/            sprites.json, font.json (5x7 bitmap), toPaths.ts (pure), spriteData.ts (the sheet,
                    lazy in the browser), spriteStore.ts (where <Sprite> finds it), raster.ts, tokens.ts, groups.ts
  clientOnly.tsx    React.lazy behind a mount guard; use it instead of next/dynamic
  workcell/dims.ts  the cell view's 320x180 frame (so the CellView shell does not import the scene)
  workcell/scene.ts the static workcell scene: AB-01 at its desk, the arm at home, stack light, dock (server only on first load)
data/
  portfolio.json    all content (typed by types/portfolio.ts)
  schematics.json   per-project sketch spec (nodes on a 4x2 grid, edges); labels must come from that project's copy
  posts-index.json  the palette's post list (slug, title, date), written at prebuild; never edit by hand
_drafts/            unpublished posts (never read by the build; move to _posts/ only after Adnan approves)
scripts/            guards, feeds.mjs (pure sitemap and RSS builders) + the prebuild writers, OG renderer and grain
                    writer (sharing png.mjs), private-data loader
tests/              Vitest unit suite (see Engineering)
.github/workflows/  ci.yml
```

## Design tokens and pixel primitives

- **Palette "Station 16"** lives as CSS custom properties in `:root` (`styles/globals.css`) and is mapped into `tailwind.config.js` colors (the default Tailwind palette is replaced). `lib/pixel/tokens.ts` mirrors it for `/lab` contrast checks. Text tokens: `--paper` (body), `--mist` (muted), `--teal` (accent, links, focus), `--amber`, `--coral`, `--leaf`, `--violet`, `--sky`. Never text: `--steel`, `--alloy`, `--rust`, `--sand`, `--moss`. No body text on a colored fill.
- **Themes:** `html[data-theme="amber"]` and `html[data-theme="mono"]` (high contrast, all accents white, links underlined, scanlines and dither off) override the variables. The 404 canvas reads the live variables, so it recolors too; the cell view's SVG fills are the variables themselves.
- **Skill groups:** Programming = teal, Robotics & ML = amber, Embedded & Hardware = leaf, Software & Infrastructure = violet. Always paired with the text label.
- **Bay accents:** 00/01 teal, 02 amber, 03 leaf, 04/05 violet, 06 sky (`data-bay` / `data-accent` set `--accent`).
- **Primitives:** `.px-frame` (2px border, stepped corner notch on `::before` so `clip-path` never clips a focus ring; variants `--active`, `--inset`, `--crt`), `.px-titlebar`, `.px-body`, `.px-btn` (`--primary`, `--secondary`, `--danger`, `--ghost`, `--compact`; 48px min height; 2px press), `.chip`, `.led` (blink 0.5 Hz, motion only), `.crt-screen` (the only place scanlines appear), `.dither` (static Bayer bands between bays). No `border-radius` anywhere.
- **Focus:** 2px teal outline at 2px offset plus pixel corner brackets on buttons and chips (the bracket layer carries a static glow). Always visible on `:focus-visible`.
- **Digits and ampersands:** Pixelify Sans draws 5 like an S, and Silkscreen draws & like a $. Two `unicode-range` faces fix both everywhere: "Pixel Digits" (0-9 from Silkscreen) leads `--font-pixel`, and "Label Amp" (& from Pixelify) leads `--font-label`. Big numbers (telemetry values, LV numbers) use Silkscreen outright. Silkscreen's own 2 reads as Z and its 0 equals O, so the shipped `silkscreen-latin-400-normal.woff2` has a redrawn 2 (rounded shoulder) and a slashed 0, made by `scripts/patch-silkscreen.py` (OFL, no Reserved Font Name; re-run it if the font file is ever replaced). Check any new numeric display on a screenshot.
- **Type rules:** Silkscreen only at 16px, 24px, or 32px (multiples of its 8px grid; 32px is for LV numbers only), uppercase, 0.04em tracking, `-webkit-font-smoothing: none` on those elements only. Anything smaller uses Plex Mono 13 to 14px. Paragraphs are Plex Sans 17 to 18px, line height 1.6.
- **Sprites:** authored at 1x as palette-indexed string rows in `lib/pixel/sprites.json` (`.` is transparent; keys come from `palette`). `components/pixel/Sprite.tsx` renders crisp SSR SVG, one `<path>` per color via `rowsToPaths` (horizontal runs merged). The art is server markup: the browser keeps it through hydration without the sheet (`hooks/useServerMarkup.ts`, `dangerouslySetInnerHTML` plus `suppressHydrationWarning`), and loads `lib/pixel/spriteData.ts` only when it must draw something the server did not (a client-side navigation, or a new frame such as the SND speaker). The hero cell view (`CellView` + `lib/workcell/scene.ts`) and the track walker frames work the same way. `--px` is 3px under 768px and 4px above. The cell view, the 404 canvas, and the OG renderer use the same JSON, and their text uses `lib/pixel/font.json`, so no font load gates them.

## Lighting

"Pixels snap, light glides." Station AB-01 is rendered with modern lighting, but no pixel changes: sprites, the notch, 2px borders, the hard 4px shadows, dither, and scanlines are the same lit or unlit. The tokens are the "Lighting" block in `:root` (`styles/globals.css`), mirrored as `LIGHTING` in `lib/pixel/tokens.ts`.

- **`--lit` is the master switch.** Every light alpha is `calc(<alpha> * var(--lit))`. `html[data-theme="mono"]`, `html[data-plain]`, and `@media print` set `--lit: 0`, `--grain: none`, and `--titlebar-top: var(--panel-hi)`, which is exactly the flat site. Layers `--lit` cannot zero (pseudo-element lights, non-alpha gradients, border-image) are reset explicitly in the "Lights off" block (mono and Text Mode) and in the print block; `tests/lighting.test.ts` keeps the three lists in step. Add any new light to all three.
- **Derived tokens** (`--hi`, `--edge`, `--depth`, `--depth-lg`, `--bloom`, `--bloom-half`, `--rail`) are declared on `:root, [data-lit], html[data-estop] .cell .crt-screen`, because a custom property that uses `var()` resolves where it is declared. A subtree with `data-lit="0"` is unlit (`/lab` uses it for the side-by-side).
- **Light sources:** the powered CELL VIEW CRT (`--bloom`, coral `--fault-rgb` under E-STOP; a glass `::before` with a hard glint and vignette under the scanlines), the hero light (`.hero::before`: teal key from the cell, violet rim, sky bounce, grain, masked out before the next bay), LED halos, telemetry glows, dither strips as light bars, the status bar's 2px `--rail`, the dossier plate key (4% bay accent), the FIG sketch and the 404 level screen (`--bloom-half`), and the 404 coral fault light behind the level.
- **Hierarchy:** the CRT is the brightest object; primary buttons and the command palette (a soft key glow on its frame, alpha on `--lit`) are second; everything else stays at 10% light alpha or less; the hard 4px outline shadow stays dominant on every frame (`--depth` sits under it). No `backdrop-filter`, no blur filter, no shadow blur over 60px, no fixed full-viewport layer.
- **Motion:** pixel objects keep `steps(4)`, 2px presses, and hard shadows. Only light (button glows, the lamp ring, the nav light) moves, on `--ease-light`. The nav light (`.nav-ink`, 1280px and up) is a 4px bay-colored bar under the current nav link: Header measures the link once per section change (and on resize or font load) and writes `--ink-x`/`--ink-w`; CSS moves it with transform under `.motion-ok`, turns it coral under E-STOP, and the dashed per-link underline remains the SSR and no-JS fallback. Primary and secondary buttons lift 1px on hover only with `(hover: hover)`, `.motion-ok`, and no E-STOP or Text Mode.
- **Caps (measured, AA at full light):** `--hi` 3% sheen, `--edge` 6%, lamp wash `--wash-max` 5% (only on `--panel` faces; never on `--inset`, `--crt`, dialogs, or the plate), palette row `--row-mix` 10%, grain alpha at most 8/255 (`npm run grain`, 96x96 drawn at 192px pixelated). `litSurfaces` in `tokens.ts` composites each worst case; `/lab` renders them with live ratios, and `tests/lighting.test.ts` fails under 4.5:1. Today's worst is coral on a leaf-washed frame face at 4.52:1. Raise any alpha only after adding its composite there.
- **Wrap every `color-mix()` rule** in `@supports (color: color-mix(in srgb, red 50%, transparent))` with a plain fallback declaration first.
- **The lamp** (`lib/lamp.ts`, lazy): StationLayer's idle boot imports it only for `(hover: hover) and (pointer: fine)`, no reduced motion, no E-STOP, no Text Mode. It sets `html.lamp-on`, marks the frame under the pointer `.is-lit`, and writes one property per frame, `--lamp: <x>px <y>px`, on that element. CSS turns that into a 2px ring masked to the border (`::after`, notched with `--notch`) and the `--spot` face wash. One passive pointermove stores x and y and schedules one rAF; the rect is read once on enter and again only after a scroll or resize; no layout reads in pointermove. It detaches and clears on E-STOP, reduced motion, and Text Mode, and re-attaches on release. `LAMP_SELECTOR` leaves out wells, bezels, dialogs, and the toast; CSS also skips a frame mid-highlight (`[data-hl]`, `[data-pulse]` own `::after` then). Without the lamp, hover lights the ring statically from the top-left corner. Pseudo-elements in use: `.px-frame::before` (face) and `::after` (ring), `.px-btn--primary/--secondary/--danger::before` (glow), `.cell .crt-screen::before` (glass), `.hero::before`, `.statusbar::after`, `.eyebrow::after` (trace, zero net size), `.card__links::before` (hairline), `.lost__level::before`.
- **Hairlines:** `.hairline` (decorative, `aria-hidden`) is a 2px rule lit from the middle with a 6x2 accent pip. Where one is added, split the existing gap around it so nothing shifts (dossier: 23 + 2 + 23; under a post title it takes a -17px bottom margin that collapses with the body margin; before the post footer it replaces the dashed rule).

### Adding a sprite

1. Add rows to `lib/pixel/sprites.json` (every row the same width, only palette keys). Generating rows with a script is fine; keep the output in the JSON.
2. Review it on `/lab` (every sprite renders at 1x to 4x) and on the page where it is used.
3. **Original art only.** No recreating or imitating any existing game, character, sprite, level, logo, or look. Genre conventions (pixel art, HUDs, CRTs, platforming) are fine. AB-01 is a squat 16x24 biped: steel chassis, digitigrade legs with boxy feet, thin arms with 2-finger grippers, a wide black teleop visor with two 2x2 teal eyes, one antenna with a status LED, a 5-segment battery pack on the back. Do not drift it toward a known character.
4. `sprites.json` does not ship in the main bundle (see Sprites above), so new art costs nothing on first load. A sprite that changes on the client (new `frame`, `name`, or `mono`) loads the sheet chunk the first time it changes. A lazy chunk that draws sprites on mount imports `lib/pixel/spriteData` directly (Badges and Toast do).

## Adding or editing content

- **A project:** add it to `projects` (Selected work) or `engineeringProjects` (Independent builds) in `data/portfolio.json`, following `types/portfolio.ts` (at most four highlights). That one entry feeds the card (MOD/RIG number from position), its `/work/<id>` dossier and sitemap entry, the Inventory cross-reference (via its stack and highlights), the OPS console (`projects`, `open <id>`, `dossier <id>`, Tab completion), and `check:ssr` (every field must render on the home page and on the dossier). Add a sketch to `data/schematics.json` using only parts the project's copy names (`check-work` fails until you do). Add a 32x32 icon to `sprites.json` and map it in `lib/projects.ts` (`PROJECT_ICONS`), or it falls back to the `skill-block` sprite.
- **A skill:** add it to `skills`. It appears in Inventory (add an honest alias in `lib/skillIndex.ts` if the copy names it differently), the OPS `skills` output, and the derived skill count.
- **A job:** add to `experience` newest first; LV numbers update automatically. `current: true` gets the CURRENT badge. `hidden: true` keeps it out of every page and bundle.
- **A number you want to show:** derive it in `lib/facts.ts` with an extractor that throws on drift. Then use the export.

## Event bus and html flags

Independent islands talk through typed window CustomEvents (`lib/bus.ts`, `emit` / `on`):

| Event | Emitted by | Used by |
| --- | --- | --- |
| `ab:estop` | `setEstop` | track, 404 level, sound (mutes), palette labels |
| `ab:ops` | OPS console: open, key, run, deny | sound, badges |
| `ab:open` | OPS>/Keys/search buttons, the Cmd/Ctrl+K chord, the palette (`what: "ops" \| "keys" \| "palette"`, optional `cmd`) | StationLayer (opens the dialog, remembers the opener; a hand-off from the palette keeps the palette's opener; `cmd` pre-fills the OPS input, which runs only on Enter), Header (closes the menu) |
| `ab:toast` | palette actions, COPY ADDRESS, OPS `theme`/`crt`/`sound` (`{ text, tone: "teal" \| "amber" \| "coral" }`) | toast (queued with badges, never takes focus) |
| `ab:plain` | `setPlain` | Header (both Text mode toggles' `aria-pressed`), palette labels |
| `ab:bot` | `window.ab01`, head-logo triple-click | `lib/puppet.ts` |
| `ab:badge` | `lib/badges.ts` `earn()` | toast, badges row, sound |
| `ab:sound` | `components/ops/sound.ts` | SND toggles stay in sync |
| `ab:home` | 404 level finished | badges, sound |

Flags on `<html>`, all applied by the inline pre-paint script in `pages/_document.tsx` before first paint:

- `js`: scripting is on (`.lost__drive` and similar only show with JS).
- `motion-ok`: the visitor has not asked for reduced motion. **Every CSS animation must be gated on `.motion-ok`.**
- `data-plain`: Text Mode (`?plain=1`, or the saved choice). Everything in Plex, one column, no pixel decoration.
- `data-theme="amber" | "mono"`: saved theme (`theme` command).
- `data-estop`: the global E-STOP is latched (persists across visits). CSS shows the coral "Site stop" strip under the status bar and the button's "E-stop on" label (both labels share one grid cell, so the nav never shifts). Stops every CSS animation and transition (`animation: none`, so one-shot entrances such as the OPS drawer and toast land on their visible final state instead of freezing invisible at keyframe 0), freezes the track and the 404 level, turns the hero CRT's glow to a coral fault light, and mutes sound.
- `data-booted`: the boot POST already played this session.
- `data-crt="off"`: scanlines hidden (`crt off`).
- `data-os="mac"`: an Apple platform (`navigator.userAgentData.platform` or `navigator.platform` matches Mac, iPhone, or iPad). Keycaps (`components/pixel/Kbd`) render both Cmd and Ctrl in one grid cell and CSS shows one, so SSR matches hydration and the cap width never changes.

Storage keys live in `lib/storage.ts` `KEYS`. Read storage only in effects and handlers so server and client markup match.

## Lazy loading and budgets

The first viewport is plain SSR HTML. Heavy or optional pieces load on intent:

| Piece | Loads when | Budget (gzip) |
| --- | --- | --- |
| `/` First Load JS | always | 110 kB target, 130 kB hard ceiling (100 kB today, with the static cell view, the palette launcher, and the nav light) |
| `/work/<id>` First Load JS | always on a dossier | about 94 kB; the sketch SVG is built in `getStaticProps`, so `lib/schematic.ts` and `font.json` never ship |
| Sprite sheet (`lib/pixel/spriteData`) | a client-side navigation, a live sprite frame change, or a lazy chunk that draws sprites | about 4 kB |
| OPS console UI (`Terminal`) | first open (`/`, `` ` ``, OPS>) | 8 kB per chunk (about 4 kB today) |
| OPS parser + command table (`commands.ts`) | `import()` as the console mounts | 8 kB per chunk (about 6.5 kB today; the two together are about 10 kB) |
| Keymap placard | first `?` / Keys | small |
| Command palette (`Palette`, with `lib/fuzzy`, `lib/copy`, `data/posts-index.json`) | first Cmd/Ctrl+K or search button (warmed on hover/focus of the button) | under 7 kB (about 6.4 kB today). No array/object spread or `for...of` in it or its imports: Babel inlines the helpers into the chunk |
| Synth (`lib/audio.ts`) | SND opt-in (warmed on hover/focus of the toggle) | 2 kB |
| Toast (badges and action toasts) + badge rules, console greeting, puppetry | idle (or first input) | small |
| Inspection lamp (`lib/lamp.ts`) | idle (or first input), only for a hovering fine pointer with motion allowed and no E-STOP or Text Mode | under 1 kB |
| Visitor badges row | after hydration, client-only | small |
| 404 level (`LostSignal`) | "Drive AB-01 home" click | 8 kB |

After a build, check the table Next prints, and confirm lazy chunks are not in `build-manifest.json` for `/`. Client-only lazy components use `lib/clientOnly` (React.lazy behind a mount guard), not `next/dynamic`, which drags its loadable runtime into the first load. Server-only code behind `typeof window === "undefined" ? require(...) : null` is dropped from the browser build (Next compiles `typeof window` to a constant). Sprites cost zero image requests. The cell view and the 404 level sit in fixed aspect-ratio boxes, so nothing shifts.

## Motion, sound, and access contract

- Animate only transform, opacity, and canvas. UI transitions are 120ms (buttons, chips) and 160ms (panels) with `steps(4)`. Light (glows, the lamp ring) is the one exception: opacity on `--ease-light` (see Lighting).
- Nothing blinks faster than 1 Hz; nothing flashes above 3 Hz. Highlight pulses fire once for 600ms.
- **Reduced motion:** final states immediately; AB-01 cuts between checkpoints (no walk, beam, or idle sit; puppet acts hold one pose); no boot typing, reels, particles, shake, or landing squash; smooth scroll off.
- **The canvas loop** (the 404 level, `lib/loop.ts`) runs a fixed 60 Hz step with rAF render and stops off-screen, on a hidden tab, under E-STOP, and when settled.
- **Keyboard:** arrow keys are captured only while the 404 level has focus; Esc releases. The hero cell view takes no input. Global shortcuts (`/`, `` ` ``, `?`) ignore inputs, textareas, selects, contenteditable, and any Ctrl/Meta/Alt chord. **The one exception is Cmd/Ctrl+K** (the command palette): StationLayer checks `(e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k"` before the chord filter, calls `preventDefault` (so browser search never takes it), toggles the palette closed if it is open, and does nothing when another dialog is open or focus is inside the 404 level. Text fields outside the palette do not block it (devtool convention). Dialogs (OPS console, keymap, palette) are native modal `<dialog>`s via `useModal`: Tab wraps inside, Esc and backdrop close, focus returns to the opener (or the menu button if the opener was in the closed menu).
- **Command palette** (`components/ops/Palette.tsx`): a combobox input (`aria-activedescendant`, `aria-controls` the listbox) over a listbox of `role=group` sections (JUMP TO, DOSSIERS, POSTS, ACTIONS) labelled by their headers; rows are `role=option` with `aria-selected`, at least 44px tall; matches are `<mark>` (teal and underlined). A polite live region says "N results" or "No match" (250ms debounce). Up/Down wrap, Home/End, PageUp/PageDown move 5, Enter activates, Shift+Enter is the alternate (a dossier's card on the home page). A leading `>` hands the text to the OPS console via `ab:open { what: "ops", cmd }` (pre-filled, never auto-run). Every action calls the existing setter, handler, or bus event (the resume and social rows click a real anchor so Read the manual earns exactly as the link does), and the palette prints no numbers. It works in Text Mode (plain styling), opens without motion under E-STOP or reduced motion, and never prints.
- **Touch:** the 404 pads are 56px or larger; every other control is at least 44px on a coarse pointer (track checkpoints are 44px wide, and a Writing entry is its title link's target). The status bar fits from 320px (below 375px it tightens gaps and uses 44px E-STOP and menu squares). Nothing is hover-only.
- **iOS:** `viewport-fit=cover`, so the container gutter, the OPS drawer, and the toast take `env(safe-area-inset-*)`. Use `svh` (with a `vh` fallback line) for viewport heights. The OPS input is 16px so Safari does not zoom on focus. No `backdrop-filter`, and no `overflow` on any ancestor of the sticky status bar.
- **Sound** is off by default. The AudioContext is created only inside `lib/audio.ts` `enable()`, reached only through `import()` in `components/ops/sound.ts` after an opt-in (SND click, `sound on`, or the first gesture of a visit after a saved opt-in). Master gain 0.06. Every sound doubles a visual or text cue.
- **Content is HTML.** The 404 canvas and the hero cell view are `aria-hidden` and only duplicate labels that exist in the HTML; narration goes through one polite live region per island. The page is complete with JS off, in Text Mode, and in print.

## OPS console

Opened with `/`, `` ` ``, the OPS> button, or the command palette (a leading `>` hands the typed command over, pre-filled; Enter runs it). Commands (all output generated from `portfolio.json` and `lib/facts.ts`):

`help`, `whoami`, `status`, `resume`, `projects` / `ls`, `open <id>`, `dossier <id>`, `experience`, `skills`, `education`, `awards`, `contact`, `email` (copy), `github`, `linkedin`, `blog`, `estop`, `keys`, `badges`, `clear`, `theme cyan|amber|mono`, `sound on|off`, `crt on|off`, `ping` (your link), `history`, `date` (your clock), `exit`.

Table output (`help`, `projects`) goes through `tableRows()` in `components/ops/table.ts` (names padded to the longest plus two spaces) and is printed with kind `"row"`. `Terminal.tsx` splits only `row` lines (via `splitRow`) into two cells that stack under 640px, so a visitor's own text (`history`) is never split. Use the same helper for new tables; `tests/ops.test.ts` asserts every row splits.

Eggs (not listed in `help`): `sudo hire adnan` ("Access granted. Opening a channel.", then focuses Contact's COPY ADDRESS), `rm -rf /` ("Fail-closed. Request denied and latched. Type clear to resume."; the console stays latched until `clear`). Every command has an ordinary on-page equivalent.

Other discoveries: `window.ab01.wave()`, `.dance()`, `.color('amber')`; triple-click the AB-01 head in the status bar; AB-01 sits after 20 s idle; a view-source hello in the pre-paint script. The keymap placard lists secrets only after they are found.

**Visitor badges** (`lib/badges.ts`): Root access (open the console), Signal found (finish the 404 level), Night shift (visit 22:00 to 05:00 local), Read the manual (open the resume). They live in localStorage, render only after mount in their own clearly labeled row, and never mix with the real awards. No points.

## Social card and icons

`npm run og` (`scripts/build-og.mjs`, with the dependency-free PNG encoder in `scripts/png.mjs`) rasterizes `sprites.json` and `font.json` with the name, title, location, and host from `portfolio.json` into `public/og.png` (1200x630), `public/icon-32.png`, and `public/apple-touch-icon.png` (180x180). Re-run and commit after changing AB-01, the arm, or those facts. `components/Seo` defaults `og:image` to `/og.png` (so `twitter:card` is `summary_large_image`); `favicon.ico` stays.

## Manual QA before merging to main

Headless browsers are blocked in the agent environment, so a human pass is the only visual check. Run `NEXT_DIST_DIR=.next-dev npx next dev -p 3200` and open it on a laptop and a phone (same Wi-Fi, `http://<mac-ip>:3200`).

1. First viewport, no interaction: name, role, lede, three proof rows, RESUME.PDF (also in the status bar). Nothing waits on a boot screen.
2. Read every section top to bottom. Facts match the resume PDF. No overflow in the status bar at 320px, 375px, 768px, 1024px, 1280px.
3. Keyboard only: Tab from the top (skip links work, focus is always visible, and the hero cell view takes no focus). Inventory chips toggle highlights; Clear works.
4. `/` opens the console; run `help`, `open operator-hmi`, `sudo hire adnan`, `rm -rf /` then `clear`, `theme amber`, `theme mono`, `theme cyan`, Esc. `?` opens the placard. Focus returns where it was.
5. Palette by keyboard: Cmd+K (Mac) or Ctrl+K opens it from anywhere, including a text field; pressing it again closes it. Type `tele`, walk with Up/Down, Home/End, PageUp/PageDown; Enter opens a dossier, Shift+Enter jumps to its card. `>theme amber` then Enter opens the console pre-filled (not run). Esc and a backdrop click close it and focus returns to the opener. Try it in Text Mode and under E-STOP. With VoiceOver (Safari): the input announces its name, expanded state, and the active option; groups and the result count are announced.
6. Header E-STOP: everything freezes, sound mutes, the hero CRT glows coral until the stop is released.
7. SND on: a short chime; opening the console blips. Reload: sound stays on but starts only after your first click.
8. macOS "Reduce motion" on: no walking, typing, particles, or shake.
9. Phone: menu opens and closes, the cell view fits the column, the 404 level (visit `/nope`) is playable with pads.
10. Text mode, print preview, and JS disabled all show the full content.
11. `/lab`: review new art against the original-art rule; check the OG card.
12. Paste a page URL into a link-preview tool (or Slack DM to yourself) after deploy to confirm the card.

Then merge to `main` (that deploys).
