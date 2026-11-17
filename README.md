# adnanbaig.com

The portfolio of Adnan Baig, Robotics Software Engineer: https://adnanbaig.com

It is a plain, fast, server-rendered resume site dressed as **Station AB-01**, a pixel-art robotics workcell console. The name, role, key work, and resume link are in the first screen with no interaction needed. Everything playful sits on top and is optional:

- **Teleop Cell:** a small simulated two-link arm. Take control and sort skill blocks into their bins, with IK, a latency knob, E-STOP, a deadman switch, a watchdog, and episode record and replay.
- **OPS console:** press `/` for a terminal that answers from the same data as the page.
- Visitor badges, opt-in sound, a Text mode, and a short level on the 404 page.

The page is complete with JavaScript off, in Text mode, and in print. It supports full keyboard use and reduced motion, and sound is off by default.

## Run it

Node 22 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

## Test and check

```bash
npm run lint                                  # ESLint
npm run typecheck                             # TypeScript, app and tests
npm run check:copy                            # copy rules, teleop catalog, OPS console output, dossier sketches
npm test                                      # Vitest unit suite (tests/)
NEXT_DIST_DIR=.next-build npm run build       # also writes public/sitemap.xml and public/rss.xml
npm run check:ssr                             # checks the pages built into .next-build (refuses a stale build)
```

CI (`.github/workflows/ci.yml`) runs the same steps in that order, with `NEXT_DIST_DIR=.next-build`, on every push and pull request.

The unit suite covers the teleop engine (IK, the safety state machine, the latency link, sorting, record and replay, and the engine end to end with the canvas stubbed out), the derived numbers in `lib/facts.ts`, the OPS console parser, the sitemap and RSS builders, and the content rules.

## How it is built

Next.js 12 (pages router), React 18, strict TypeScript, and Tailwind CSS 3. There are no UI, animation, or audio libraries. Motion is CSS and canvas, the sound is a small WebAudio synth, and the pixel art is SVG rendered on the server from JSON.

All content lives in `data/portfolio.json`. Any number the site shows is derived from a sentence in that file by `lib/facts.ts`, which fails the build if the sentence changes shape. `CLAUDE.md` is the full guide: design tokens, the fact rules, the guards, and the performance budgets.

## Fonts and art

- Fonts are self-hosted under the SIL Open Font License 1.1. The license texts are in `public/fonts`: IBM Plex Sans and IBM Plex Mono (IBM Corp.), Pixelify Sans (The Pixelify Sans Project Authors), and Silkscreen (The Silkscreen Project Authors).
- The pixel art (AB-01, the cell, the icons, and the social card) is original to this site and drawn from `lib/pixel/sprites.json`.
- The repo has no license file, so the code, copy, and art are not licensed for reuse.
