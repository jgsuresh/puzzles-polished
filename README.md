# Puzzles, polished

A modern, responsive front-end for [Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) — 40 classic logic puzzles that I love, with a fresh coat of paint.

The puzzle **engines are the original C code**, compiled to WebAssembly, so generators, solvers and game rules are exactly upstream's. What's new is everything you look at and touch:

| | Upstream web build | Here |
|---|---|---|
| Layout | fixed-size page, tiny menu | fills any screen; resizes live (rotate your phone!) |
| Menus | hover-only drop-downs | tap-friendly menus + a bottom control dock |
| Touch | taps only; no right-click, no keyboard, no drags | real touch drags, a **tap-mode switch** (left / right / middle click) and an **on-screen keypad** (digits, pencil marks, D-pad) |
| Look | grey page, harsh palette | warm paper theme, softened puzzle palette, rounded canvas, **dark mode** |
| Home | plain list of links | searchable, filterable gallery with live thumbnails |
| Feedback | `COMPLETED!` in the status bar | confetti + toast when you solve one, in-page how-to-play dialog, link copying |

## Run it

The built site lives in [`docs/`](docs/) and is plain static files, so it can be hosted anywhere (e.g. GitHub Pages → *Deploy from branch → `/docs`*). To view it locally:

```bash
npm run serve        # http://localhost:8080
```

## Build from source

You need `git`, `node`, `cmake`, `perl` and the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (`brew install emscripten cmake` on macOS).

```bash
npm run build        # fetch upstream @ pinned commit -> patch glue -> compile to WASM -> assemble docs/
npm run site         # re-assemble docs/ only (after editing web/ — no recompile)
npm install && npm run thumbs   # regenerate gallery thumbnails (needs Chrome)
```

> Editing `web/css` or `web/js/home.js`/`puzzle-ui.js`/templates only needs `npm run site`.
> Changes to `scripts/patch-glue.mjs` need a full `npm run build`, because upstream's JS glue is compiled *into* each puzzle.

## How it works

```
.upstream/          upstream puzzles source, pinned commit (git-ignored, fetched by the build)
scripts/
  build.sh          orchestrates the whole build
  patch-glue.mjs    small, asserted patches to upstream's emccpre.js / emcclib.js
  build-site.mjs    parses upstream metadata, renders pages from templates into docs/
  puzzles-meta.mjs  categories + per-puzzle touch config (keypad type, which click buttons matter)
  thumbs.mjs        headless-Chrome screenshots -> web/thumbs
web/                templates, CSS, JS (the actual front-end)
docs/               build output (committed so it can be served as-is)
```

Upstream's glue expects certain element IDs (`#new`, `#undo`, `#gametype`, `#puzzlecanvas` …), so the new page keeps those and restyles around them. The patches are tiny and each one asserts that it matched, so an upstream change fails the build loudly instead of silently breaking:

- expose the C input functions so the touch/keypad layer can drive the puzzle,
- compute pointer coordinates from `getBoundingClientRect()` (robust inside flex/transformed layouts),
- route errors to toasts instead of `alert()`,
- pass every palette colour through a recolouring hook (`stgRecolour`) — saturated colours are softened and black becomes soft ink.

Dark mode inverts the canvas with a hue-preserving CSS filter, because the engines hard-code black ink on a light palette.

## Adding or tweaking a puzzle's touch controls

Edit [`scripts/puzzles-meta.mjs`](scripts/puzzles-meta.mjs): `modes` picks which click buttons appear in the tap-mode switch (`[]` hides it), `keypad` is `digits`, `dpad` or `undead`, and `pencil` adds a pencil-mark key.

## Credits & license

All puzzle designs and code © Simon Tatham and contributors, MIT licensed — please go and enjoy [the original](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) and its documentation too. This project's front-end is released under the same MIT license; see [LICENSE](LICENSE).
