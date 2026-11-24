# Puzzles, polished

A modern, responsive front-end for [Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) — 40 classic logic puzzles that I love, with a fresh coat of paint.

The puzzle **engines are the original C code**, compiled to WebAssembly, so generators, solvers and game rules are exactly upstream's. What's new is everything you look at and touch:

| | Upstream web build | Here |
|---|---|---|
| Layout | fixed-size page, tiny menu | fills any screen; resizes live (rotate your phone!) |
| Menus | hover-only drop-downs | tap-friendly menus + a bottom control dock |
| Touch | taps only; no right-click, no keyboard, no drags | real touch drags, a **tap-mode switch** (left / right / middle click) and an **on-screen keypad** (digits, pencil marks, D-pad) |
| Digit games | one click mode, pencil via right-click or `M` | **Pen / Pencil / Erase** mode bar on every device and a **Colour digits** toggle (Solo, Keen, Towers, Unequal, Filling) |
| Hints | none | **Mouseover hints** (toggle in the header): what each mouse button does on the board you are hovering, plus tooltips on the controls. Texts live in `scripts/hints.mjs` |
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
npm install && npm run thumbs   # regenerate gallery thumbnails, light + dark (needs Chrome)
npm run smoke                   # play every puzzle headlessly and fail on any JS error
npm run smoke:touch             # same on a phone-sized touch viewport, plus layout checks
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
- pass every palette colour through a recolouring hook (`stgRecolour`) — saturated colours are softened and black becomes soft ink,
- add `refresh_colours()` so the theme can change live, and guard upstream's menu key handler (our canvas lives inside its form).


## Skins

Every puzzle has its own skin. The patched glue offers each drawing primitive the engine emits (`rect`, `line`, `poly`, `circle`, `text`) to a per-game skin first; a skin returns `true` if it drew the call itself. Engines identify colours by semantic index (`COL_MINE`, `COL_HIGHLIGHT`…), so a skin knows *what* it is drawing, and it can override individual palette slots. Skins live in [`web/js/skins.js`](web/js/skins.js); add `?skin=off` to a puzzle URL to compare with stock drawing.

- **Hand-drawn skins** (shapes redrawn): Mines, Net, Netslide, Solo, Loopy, Flood, Fifteen, Sixteen, Light Up, Pattern, Unruly, Samegame, Pegs, Blackbox.
- **Declarative skins** (the rest): a theme-aware palette (ink, accent, danger, soft grid lines, candy colours) plus bold typography, defined in a few lines each with `def(name, colourNames, palette)`.

Where the JS layer can't reach (layout constants, margins, exports), `scripts/patch-glue.mjs` also carries small asserted patches to the engines' C source, applied to the pinned upstream commit before compiling.

### Dark mode

Dark mode is a real second palette, not a filter. The canvas gets a dark background colour, so the engines derive their own highlights and shadows from it; a generic remap turns their hard-coded black/white into ink, and each skin picks per-theme colours from shared tokens (`tk()`). Switching theme mid-game calls an exported `refresh_colours()` (a tiny C patch) so the engine re-announces its palette and redraws, with no reload and no lost progress.

### Tests

`npm run smoke` loads every puzzle in headless Chrome, clicks and types at it, flips the theme live, starts a new game, and fails on any JS error. `npm run smoke:touch` does it on an emulated phone (taps, drags, no overflow, board clear of the dock).

## Adding or tweaking a puzzle's touch controls

Edit [`scripts/puzzles-meta.mjs`](scripts/puzzles-meta.mjs): `modes` picks which click buttons appear in the tap-mode switch (`[]` hides it), `keypad` is `digits`, `dpad` or `undead`, and `pencil` adds a pencil-mark key.

## Credits & license

All puzzle designs and code © Simon Tatham and contributors, MIT licensed — please go and enjoy [the original](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) and its documentation too. This project's front-end is released under the same MIT license; see [LICENSE](LICENSE).
