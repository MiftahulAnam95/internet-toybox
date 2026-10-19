# INTERNET TOYBOX

> Pick a toy. Break nothing. Probably.

An interactive digital playground of six small browser experiments, all running locally in the browser. There are no accounts, no backend and no tracking.

## Stack

The brief asked for Next.js App Router. This project was built in a **React 19 + Vite 7 + TypeScript + Tailwind CSS v4** environment, so it uses that instead. Routing is done with query parameters (`?toy=pixel-garden`), so every toy still has its own shareable URL.

| Concern | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| Icons | lucide-react |
| Graphics | Canvas 2D (gravity, liquid type, particles, pixel garden, sequencer visuals), SVG (previews) |
| Audio | Web Audio API (oscillators made in code, no audio files) |
| Persistence | `localStorage` (language, recent toys, play counts, seen hints, secrets, UI sound) |
| Build | `vite build` with `vite-plugin-singlefile`, which outputs one `dist/index.html` |

No physics library and no Framer Motion are used. The physics is a small custom engine (circle bodies + spatial hash), and the motion is CSS or canvas.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs dist/index.html
npm run preview   # serve the production build
```

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. You don't need any environment variables.

The build is a single static HTML file, so any static host works (Netlify, GitHub Pages, S3). Deployment has **not** been tested from this workspace. Only the local production build was checked.

## Project structure

```
src/
  App.tsx                     routing (?toy=), surprise, history, easter eggs
  lib/
    i18n.tsx                  EN + ID dictionaries, provider, useI18n()
    toys.ts                   toy registry (slug, number, accent) + URL helpers
    storage.ts                localStorage wrapper (recent, plays, eggs, hints…)
    export.ts                 PNG download, clipboard copy with fallback, canvas DPR fit
    hooks.ts                  useReducedMotion, useLatest, isLowPower
    uiSound.ts                optional UI blips (off by default) + shared AudioContext
  components/
    layout/                   Header, Home, HeroField, ToyGrid, ToyPreviews, About
    toys/                     ToyShell (shared frame), ToyLayout, and one file per toy
    controls/Controls.tsx     Slider, Segmented, Toggle, Swatches, Btn
    ui/Toast.tsx              toast notifications
```

## Features

**Homepage**
- Interactive hero field: shapes on springs scatter away from the pointer, and clicking or tapping makes them pop. Shows live coordinates and a cursor status message.
- Editorial toy grid with a different preview and layout for each toy, plus a toy number, description, hint and local play count.
- **Surprise me** opens a random toy in a randomized starting state.
- **Recently played** list and play counter, stored locally and labelled as local-only.
- EN / ID language switch (remembered), a UI sound toggle (off by default), and an About / Credits dialog.

**Shared toy frame**
- Back button, toy numbers 01–06, previous/next, surprise, a hint button, and copy link.
- A first-visit hint overlay for each toy. Once dismissed, it stays dismissed.
- `Esc` returns to the playground. Toys are lazy-loaded inside an error boundary with a loading state.
- Each toy has keyboard support, and touch scrolling is blocked while you're using a canvas.

**Toys**
1. **Gravity is Optional**: click to spawn and drag to throw. Three modes (gravity, zero-G, reverse), plus gravity strength, object size, spawn count, spawn type, trails, bouncy walls, earthquake, clear and reset. Keys: `Space` spawns, `E` shakes, `G` changes gravity.
2. **Liquid Type**: your text is drawn as a spring mesh that you deform with the pointer. Four modes (ripple, magnet, melt, twist), plus font size, distortion amount, ink and background colors, effect on/off, randomize, reset and PNG export. Arrow keys wobble the text.
3. **Particle Orchestra**: up to 8,000 particles stored in typed arrays. Four patterns (swarm, orbit, explosion, flow field), attract/repel, particle count, pull strength, speed, five palettes, long exposure, click bursts, pause, randomize and PNG export. Keys: `Space` bursts, `P` pauses.
4. **The Button Lab**: seven buttons — one runs away, one duplicates itself (up to 12), one changes its label, one fires confetti, one fakes loading, one swaps the page fonts for 8 seconds, and one reacts to how fast you click. Includes a lab log and **Reset all**. Every effect can be undone.
5. **Pixel Garden**: 16², 24² and 32² grids that scale by whole pixels so they never stretch. Draw, erase and flood fill, 15 colors, undo/redo (60 steps), clear with confirmation, six templates, grid lines, PNG export (transparent background, about 512 px), and **share link** (run-length encoded, capped at 1,800 characters). Keys: arrows, `Space`, `D`/`E`/`F`, `Ctrl+Z`/`Ctrl+Shift+Z`.
6. **Sound of Nothing**: a 16-step × 8-row pentatonic sequencer with lookahead scheduling. Four sound palettes (glass, 8-bit, wood, void), tempo 60–200 BPM, volume, mute, randomize, clear, reset and a share link. Audio only starts after you tap or press a button, and the visual score keeps running even if audio is unavailable or muted.

**Secrets** (progress is shown in About): the Konami code, typing `toybox` on the homepage, clicking the wordmark letters quickly, clicking the status light 7 times, and moving the cursor very fast across the hero.

**Accessibility and performance**
- Semantic landmarks, a skip link, ARIA roles on segmented controls, switches and grids, and visible focus rings.
- Respects `prefers-reduced-motion`: CSS animations are turned off, the hero drift and Liquid Type intro are skipped, and particles default to a slower speed with no long-exposure trails.
- Lower particle counts and pixel density on small screens and devices with few CPU cores.
- Animation loops use refs and `requestAnimationFrame`, and are cancelled on unmount. `ResizeObserver` keeps canvases sharp at any device pixel ratio.

## Known limitations

- Shared links only encode Pixel Garden art and Sound of Nothing patterns. For the other visual toys, the exported PNG is the thing you share. Nothing is ever uploaded.
- Physics bodies collide as circles, so emoji and squares are approximated.
- Liquid Type needs to load the web font for best results. Until it loads, it falls back to a system sans-serif.
- Play counts and history only cover this browser. They are not global statistics.
- The Web Audio timing depends on the browser. Background tabs may throttle the scheduler.

## Adding a new toy

1. Add a slug to `TOY_SLUGS` and an entry to `TOYS` in `src/lib/toys.ts` (number, accent color, ink color, kind).
2. Add copy under `toys["your-slug"]` in **both** `en` and `id` in `src/lib/i18n.tsx` (`title`, `desc`, `hint`, `long`, plus any control labels). TypeScript will flag a missing translation.
3. Create `src/components/toys/YourToy.tsx`, exporting a default component that takes `ToyProps` (`surprise`, `params`) and renders `<ToyLayout stage={…} panel={…} />`. Use the controls from `components/controls`.
4. Register it in `TOY_COMPONENTS` in `ToyShell.tsx`, add a preview in `ToyPreviews.tsx`, and add a layout slot in `ToyGrid.tsx`.
5. Keep animation state in refs, cancel loops on unmount, and support touch (`touch-none` on canvases) and keyboard.
