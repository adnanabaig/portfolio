# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

> **Note:** `next.config.js` intentionally skips ESLint and TypeScript checks during builds (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true`). Type-checking is editor-only.

## Architecture

**Stack:** Next.js 12 + React 18 + TypeScript + Tailwind CSS + GSAP

### Pages & Routing

File-system routing via `pages/`:
- `pages/_app.tsx` — global wrapper; mounts the SVG liquid distortion filter and tracks mouse velocity globally
- `pages/index.tsx` — single-page home (Hero → Work → Technical Engineering → About → Footer)
- `pages/blog/index.tsx` — static blog listing (`getStaticProps`)
- `pages/blog/[slug].tsx` — SSG dynamic blog posts (`getStaticPaths` + `getStaticProps`)

### Data

- **`data/portfolio.json`** — single source of truth for all project info, social links, and copy. Imported as a TypeScript object at build time (no API calls).
- **`_posts/*.md`** — blog posts as Markdown; parsed with `gray-matter` in `utils/api.ts` during static generation.

### Animation System (GSAP)

All animations use GSAP. Key patterns to understand:

1. **Liquid distortion** (`_app.tsx`): SVG `<feTurbulence>` + `<feDisplacementMap>` on a fixed background layer. Mouse velocity animates displacement scale with organic decay.

2. **First-visit typewriter** (`pages/index.tsx`): On first load (checked via `sessionStorage`), a fullscreen overlay runs a character-by-character typewriter animation ("Adnan Baig."), then fades out. Subsequent visits skip to the stagger reveal immediately.

3. **ScrollTrigger**: Dynamically imported (`import('gsap/ScrollTrigger')`) to avoid SSR hydration issues. Used for hero curtain effect and section parallax.

4. **Magnetic cards** (`components/WorkCard/`): Uses `gsap.quickTo()` for spring-like card pull toward mouse cursor within a 100px radius.

5. **`useIsomorphicLayoutEffect`** (`utils/index.ts`): Wrapper around `useLayoutEffect` / `useEffect` to avoid SSR warnings — use this instead of `useLayoutEffect` directly.

### Component Patterns

- Components live in `components/<ComponentName>/index.tsx`
- GSAP refs are created with `useRef`, targeted directly — no state for animation values
- `GlassWrapper` provides the Apple-style glass morphism container used across sections

### Tailwind Custom Breakpoints

Defined in `tailwind.config.js`:
- `mob` — mobile
- `tablet`
- `laptop`
- `laptopl` — large laptop

Use these instead of default sm/md/lg/xl breakpoints.
