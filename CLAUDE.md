# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo: Adnan Baig's portfolio, https://adnanbaig.com.

The site is **Station AB-01**: a pixel-art robotics workcell console. Under the 8-bit layer it is a plain, fast, fully server-rendered resume site. A recruiter gets the name, role, key work, and the resume link in the first viewport with zero interaction. Everything playful (the Teleop Cell game, the AB-01 track, the OPS console, badges, sound, the 404 level) is an optional layer on top and is never a gate.

**Vercel deploys `main` on push.** Work on a branch, commit locally, and do the manual QA pass below before anything reaches `main`.

## Stack

- Next.js 12 (pages router) + React 18 + TypeScript (strict) + Tailwind CSS 3. Do not upgrade the Next or React majors.
- No animation, UI, or audio libraries. Motion is CSS (transform/opacity) and canvas; sound is hand-rolled WebAudio; pixel art is SSR SVG built from JSON.
- Blog: `_posts/*.md` parsed with `gray-matter` and rendered to HTML at build time (`utils/api.ts`, `utils/markdownToHtml.ts`).
- Fonts are self-hosted latin woff2 in `public/fonts` with their OFL texts: IBM Plex Sans and Mono (body, meta), Pixelify Sans (h1, h2, big numbers; the only preloaded font), Silkscreen (labels, buttons, nav; 16px or 24px only). Each pixel face has a metric-matched fallback `@font-face` so the swap does not shift layout.
- Adding an npm dependency needs a real reason. Use `npm install --package-lock-only`; npm is the only package manager.

## Commands

Node is not on the default PATH on Adnan's Mac. Prefix every command:

```bash
export PATH=$HOME/.local/node/bin:$PATH

NEXT_DIST_DIR=.next-dev npx next dev -p 3200    # dev server
NEXT_DIST_DIR=.next-build npm run build         # production build (runs tsc + lint; prebuild writes public/sitemap.xml)
npx tsc --noEmit                                # types
npm run lint                                    # ESLint (next lint)
npm run check:copy                              # copy guard + teleop catalog guard + OPS console guard
npm run check:ssr                               # reads .next-build/server/pages/*.html, so build first
npm run test:teleop                             # teleop engine self-test (IK, safety, latency, sorting)
npm run og                                      # regenerate public/og.png and the icons, then commit them
```

**Always set `NEXT_DIST_DIR`** for local builds and dev. A long-running `next start` may be serving `.next`; never write to `.next` and never touch `node_modules` in a way that breaks it. Builds fail on any TypeScript or ESLint error by design.

Before every commit: `tsc`, `lint`, `check:copy`, then one build and `check:ssr`.

## Guards (all must pass)

| Guard | File | What it enforces |
| --- | --- | --- |
| `check:copy` | `scripts/check-copy.mjs` | No em dashes, no emoji, no forbidden internal terms, no `TODO`/`_todo` in `data/*.json` (except `_todo`), `_posts/*.md`, and all source under `components/` (including `components/ops/**`), `pages/`, `lib/`, `hooks/`, plus `scripts/build-og.mjs`. Rules live in `scripts/copy-rules.mjs`. |
| `check-teleop` | `scripts/check-teleop.mjs` | `data/teleop.json` maps every skill in `portfolio.json` to exactly one block, every group has a bin, labels are drawable by the bitmap font. |
| `check-ops` | `scripts/check-ops.mjs` | Compiles `components/ops/commands.ts` and runs every command against a stub. Every `help` entry has a handler; all output passes the copy rules; every printed number is a fact from `portfolio.json` / `lib/facts.ts`, a level number, or labeled as the visitor's own (`your run`, `your link`, `your clock`, `SIM`, `this browser`); no availability wording; the eggs reply exactly; `open operator-hmi` targets that card. |
| `check:ssr` | `scripts/check-ssr.mjs` | On the built home page: one h1 with the name; eyebrow, lede, proof lines, and the resume link come before the cell; every visible fact string renders; hidden entries and `_todo` never leak; no invented numbers; no canvas, console, badges, or toast in SSR; skip link before TAKE CONTROL; E-STOP and track wiring; `og:image` and `twitter:card`; icons exist. On the built 404: Home, Work, and Blog links come before the "Drive AB-01 home" button. |

When you add a guard-relevant feature, extend the guard in the same commit.

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
  blog/             index + [slug], reading-first layout
  lab.tsx           noindex review bench: every sprite, the palette with contrast, frames, the OG card
components/
  Header/           status bar, nav, RESUME.PDF, Text mode, E-STOP, OPS>, menu; mounts ScrollTrack + StationLayer
  ScrollTrack/      AB-01 walking the 28px track (frames incl. wave and sit groups)
  EStop/            global E-STOP toggle
  sections/         Hero, BootLog (CSS-only POST), Telemetry (derived facts), Inventory (skill cross-reference)
  WorkCard/         MOD/RIG cards (id="card-<id>", heading id="project-<id>", data-skills)
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
  skillIndex.ts     skill -> cards/roles/About paragraphs it appears in (aliases must be honest)
  bus.ts            typed window CustomEvents
  station.ts        html flag getters/setters (estop, plain, theme, crt) + reduced-motion helpers
  storage.ts        local/session storage with an in-memory fallback, and all storage KEYS
  badges.ts         visitor badges + secrets (localStorage), earning rules
  audio.ts          the synth (lazy; the only AudioContext)
  hello.ts          console greeting + window.ab01 (lazy)
  puppet.ts         AB-01 wave/dance/color and the idle sit (lazy)
  pixel/            sprites.json, font.json (5x7 bitmap), toPaths.ts, raster.ts, tokens.ts
  teleop/scene.ts   workcell geometry and drawing shared by the SSR poster and the canvas
data/
  portfolio.json    all content (typed by types/portfolio.ts)
  teleop.json       skill block labels and bin labels for the cell
scripts/            guards, sitemap, OG renderer, private-data loader
```

## Design tokens and pixel primitives

- **Palette "Station 16"** lives as CSS custom properties in `:root` (`styles/globals.css`) and is mapped into `tailwind.config.js` colors (the default Tailwind palette is replaced). `lib/pixel/tokens.ts` mirrors it for `/lab` contrast checks. Text tokens: `--paper` (body), `--mist` (muted), `--teal` (accent, links, focus), `--amber`, `--coral`, `--leaf`, `--violet`, `--sky`. Never text: `--steel`, `--alloy`, `--rust`, `--sand`, `--moss`. No body text on a colored fill.
- **Themes:** `html[data-theme="amber"]` and `html[data-theme="mono"]` (high contrast, all accents white, links underlined, scanlines and dither off) override the variables. The canvas reads the live variables, so it recolors too.
- **Skill groups and bins:** Programming = teal, Robotics & ML = amber, Embedded & Hardware = leaf, Software & Infrastructure = violet. Always paired with the text label.
- **Bay accents:** 00/01 teal, 02 amber, 03 leaf, 04/05 violet, 06 sky (`data-bay` / `data-accent` set `--accent`).
- **Primitives:** `.px-frame` (2px border, stepped corner notch on `::before` so `clip-path` never clips a focus ring; variants `--active`, `--inset`, `--crt`), `.px-titlebar`, `.px-body`, `.px-btn` (`--primary`, `--secondary`, `--danger`, `--ghost`, `--compact`; 48px min height; 2px press), `.chip`, `.led` (blink 0.5 Hz, motion only), `.crt-screen` (the only place scanlines appear), `.dither` (static Bayer bands between bays). No `border-radius` anywhere.
- **Focus:** 2px teal outline at 2px offset plus pixel corner brackets on buttons and chips. Always visible on `:focus-visible`.
- **Type rules:** Silkscreen only at 16px or 24px, uppercase, 0.04em tracking, `-webkit-font-smoothing: none` on those elements only. Anything smaller uses Plex Mono 13 to 14px. Paragraphs are Plex Sans 17 to 18px, line height 1.6.
- **Sprites:** authored at 1x as palette-indexed string rows in `lib/pixel/sprites.json` (`.` is transparent; keys come from `palette`). `components/pixel/Sprite.tsx` renders crisp SSR SVG, one `<path>` per color via `rowsToPaths` (horizontal runs merged). `--px` is 3px under 768px and 4px above. The canvas and the OG renderer use the same JSON, and canvas text uses `lib/pixel/font.json`, so no font load gates the canvas.

### Adding a sprite

1. Add rows to `lib/pixel/sprites.json` (every row the same width, only palette keys). Generating rows with a script is fine; keep the output in the JSON.
2. Review it on `/lab` (every sprite renders at 1x to 4x) and on the page where it is used.
3. **Original art only.** No recreating or imitating any existing game, character, sprite, level, logo, or look. Genre conventions (pixel art, HUDs, CRTs, platforming) are fine. AB-01 is a squat 16x24 biped: steel chassis, digitigrade legs with boxy feet, thin arms with 2-finger grippers, a wide black teleop visor with two 2x2 teal eyes, one antenna with a status LED, a 5-segment battery pack on the back. Do not drift it toward a known character.
4. `sprites.json` ships in the main bundle. Keep big, page-specific art small, and watch First Load JS.

## Adding or editing content

- **A project:** add it to `projects` (Selected work) or `engineeringProjects` (Independent builds) in `data/portfolio.json`, following `types/portfolio.ts` (at most four highlights). That one entry feeds the card (MOD/RIG number from position), the Inventory cross-reference (via its stack and highlights), the OPS console (`projects`, `open <id>`, Tab completion), and `check:ssr` (every field must render). Add a 32x32 icon to `sprites.json` and map it in `components/WorkCard/index.tsx` (`ICONS`), or it falls back to a skill block.
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
| `/` First Load JS | always | 110 kB target, 130 kB hard ceiling |
| Teleop engine + live cell (`TeleopLive`) | TAKE CONTROL / AUTO DEMO, or idle prefetch once the cell is half visible | 25 kB |
| OPS console UI (`Terminal`) | first open (`/`, `` ` ``, OPS>) | 8 kB per chunk (about 4 kB today) |
| OPS parser + command table (`commands.ts`) | `import()` as the console mounts | 8 kB per chunk (about 6.5 kB today; the two together are about 10 kB) |
| Keymap placard | first `?` / Keys | small |
| Synth (`lib/audio.ts`) | SND opt-in (warmed on hover/focus of the toggle) | 2 kB |
| Toast + badge rules, console greeting, puppetry | idle (or first input) | small |
| Visitor badges row | after hydration, client-only | small |
| 404 level (`LostSignal`) | "Drive AB-01 home" click | 8 kB |

After a build, check the table Next prints, and confirm lazy chunks are not in `build-manifest.json` for `/`. Sprites cost zero image requests. Fixed aspect-ratio boxes mean no layout shift when the poster swaps for the canvas.

## Motion, sound, and access contract

- Animate only transform, opacity, and canvas. UI transitions are 120ms (buttons, chips) and 160ms (panels) with `steps(4)`.
- Nothing blinks faster than 1 Hz; nothing flashes above 3 Hz. Highlight pulses fire once for 600ms.
- **Reduced motion:** final states immediately; static conveyor; AB-01 cuts between checkpoints (no walk, beam, or idle sit; puppet acts hold one pose); no boot typing, reels, particles, shake, or landing squash; smooth scroll off.
- **Canvas loops** (cell, 404 level) run a fixed 60 Hz step with rAF render and stop off-screen, on a hidden tab, under E-STOP, and when settled.
- **Keyboard:** arrow keys are captured only while the cell (or the 404 level) has focus; Esc releases. Global shortcuts (`/`, `` ` ``, `?`) ignore inputs, textareas, selects, contenteditable, and any Ctrl/Meta/Alt chord. Dialogs (OPS console, keymap) are native modal `<dialog>`s via `useModal`: Tab wraps inside, Esc and backdrop close, focus returns to the opener (or the menu button if the opener was in the closed menu).
- **Touch:** D-pad, GRIP, HOLD, and the 404 pads are 56px or larger.
- **Sound** is off by default. The AudioContext is created only inside `lib/audio.ts` `enable()`, reached only through `import()` in `components/ops/sound.ts` after an opt-in (SND click, `sound on`, or the first gesture of a visit after a saved opt-in). Master gain 0.06. Every sound doubles a visual or text cue.
- **Content is HTML.** The canvas is `aria-hidden` and only duplicates labels that exist in the HTML; narration goes through one polite live region per island. The page is complete with JS off, in Text Mode, and in print.

## OPS console

Opened with `/`, `` ` ``, or the OPS> button. Commands (all output generated from `portfolio.json` and `lib/facts.ts`):

`help`, `whoami`, `status`, `resume`, `projects` / `ls`, `open <id>`, `experience`, `skills`, `education`, `awards`, `contact`, `email` (copy), `github`, `linkedin`, `blog`, `teleop`, `latency <ms>` (0 to 300, SIM), `estop`, `keys`, `badges`, `clear`, `theme cyan|amber|mono`, `sound on|off`, `crt on|off`, `ping` (your link), `history`, `date` (your clock), `exit`.

Eggs (not listed in `help`): `sudo hire adnan` ("Access granted. Opening a channel.", then focuses Contact's COPY ADDRESS), `rm -rf /` ("Fail-closed. Request denied and latched. Type clear to resume."; the console stays latched until `clear`). Every command has an ordinary on-page equivalent.

Other discoveries: `window.ab01.wave()`, `.dance()`, `.color('amber')`; triple-click the AB-01 head in the status bar; AB-01 sits after 20 s idle; a view-source hello in the pre-paint script. The keymap placard lists secrets only after they are found.

**Visitor badges** (`lib/badges.ts`): Calibrated (sort 31/31), Fail-closed (latch and clear a stop), Recorded (record and replay), Root access (open the console), Signal found (finish the 404 level), Night shift (visit 22:00 to 05:00 local), Read the manual (open the resume). They live in localStorage, render only after mount in their own clearly labeled row, and never mix with the real awards. No points.

## Social card and icons

`npm run og` (`scripts/build-og.mjs`) is a dependency-free PNG encoder that rasterizes `sprites.json` and `font.json` with the name, title, location, and host from `portfolio.json` into `public/og.png` (1200x630), `public/icon-32.png`, and `public/apple-touch-icon.png` (180x180). Re-run and commit after changing AB-01, the arm, or those facts. `components/Seo` defaults `og:image` to `/og.png` (so `twitter:card` is `summary_large_image`); `favicon.ico` stays.

## Manual QA before merging to main

Headless browsers are blocked in the agent environment, so a human pass is the only visual check. Run `NEXT_DIST_DIR=.next-dev npx next dev -p 3200` and open it on a laptop and a phone (same Wi-Fi, `http://<mac-ip>:3200`).

1. First viewport, no interaction: name, role, lede, three proof rows, RESUME.PDF (also in the status bar). Nothing waits on a boot screen.
2. Read every section top to bottom. Facts match the resume PDF. No overflow in the status bar at 375px, 768px, 1024px, 1280px.
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
