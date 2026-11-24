#!/usr/bin/env node
// Applies our small, explicit patches to upstream's Emscripten glue
// (emccpre.js / emcclib.js). Both files are compiled *into* every puzzle's
// .js via --pre-js / --js-library, so this must run before the WASM build.
//
// Every patch asserts that it matched, so an upstream change that breaks one
// fails loudly instead of silently producing a half-patched build.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const up = join(root, '.upstream');

// Start from pristine upstream so the script is idempotent.
const PATCHED_FILES = ['emccpre.js', 'emcclib.js', 'mines.c', 'emcc.c', 'cmake/platforms/emscripten.cmake'];
execFileSync('git', ['-C', up, 'checkout', '--', ...PATCHED_FILES], { stdio: 'inherit' });

function patch(file, edits) {
  const path = join(up, file);
  let src = readFileSync(path, 'utf8');
  for (const { name, from, to, count = 1 } of edits) {
    const matches = typeof from === 'string' ? src.split(from).length - 1 : (src.match(from) || []).length;
    if (matches !== count) throw new Error(`${file}: patch "${name}" matched ${matches}x, expected ${count}`);
    src = src.replace(from, to);
  }
  writeFileSync(path, src);
}

patch('emccpre.js', [
  {
    // Expose the C input entry points so our own touch/pointer layer and the
    // on-screen keypad can drive the puzzle.
    name: 'expose input api',
    from: /var (mousedown|mousemove|mouseup|key) = Module\.cwrap\(([^;]*?)\);/gs,
    to: (m, n) => `${m}\n    (window.stgApi = window.stgApi || {}).${n} = ${n};`,
    count: 4,
  },
  {
    name: 'ready hook',
    from: '// Default to giving keyboard focus to the puzzle.\n    onscreen_canvas.focus();',
    to: "// Default to giving keyboard focus to the puzzle.\n    onscreen_canvas.focus();\n    if (window.stgOnReady) window.stgOnReady();",
  },
  {
    // The original walks the offsetParent chain, which breaks as soon as the
    // canvas sits inside a transformed or scrolled container.
    name: 'robust mouse coordinates',
    from: 'var rcoords = relative_mouse_coords(event, element);',
    to: 'var rect = element.getBoundingClientRect();\n    var rcoords = {x: event.clientX - rect.left, y: event.clientY - rect.top};',
  },
  {
    // Upstream attaches this handler to the whole <form>, whose only descendants
    // were menu items. Our canvas lives inside the form too, so key events from
    // the board bubbled into it and crashed on `null.closest`.
    name: 'menukey: ignore events from outside menus',
    from: 'var thisitem = target.closest("li");\n        var thismenu = thisitem.closest("ul");',
    to: 'var thisitem = target.closest("li");\n        if (thisitem === null) return;\n        var thismenu = thisitem.closest("ul");',
  },
  {
    // KaiOS workaround upstream: every link in the form is turned into window.open(),
    // which made our "back to all puzzles" link open a popup (or "[object SVGAnimatedString]").
    name: 'links navigate normally',
    from: 'for (var elem of document.querySelectorAll("#gamemenu a[href]")) {',
    to: 'for (var elem of []) {',
  },
  {
    name: 'no alert() on error',
    from: 'alert(e.message);',
    to: 'if (window.stgError) window.stgError(e.message); else console.error(e.message);',
  },
]);

patch('emcclib.js', [
  {
    name: 'no alert() in error box',
    from: 'alert(UTF8ToString(ptr));',
    to: 'var msg = UTF8ToString(ptr); if (window.stgError) window.stgError(msg); else alert(msg);',
  },
  // ---- Skin hooks: a per-game skin (window.stgSkin) may take over any
  // drawing primitive by returning true. Skins draw on the global `ctx`.
  {
    name: 'skin: rect',
    from: 'js_canvas_draw_rect: function(dr, x, y, w, h, colour) {',
    to: 'js_canvas_draw_rect: function(dr, x, y, w, h, colour) {\n        if (window.stgSkin && window.stgSkin.rect && window.stgSkin.rect(x, y, w, h, colour)) return;',
  },
  {
    name: 'skin: line',
    from: 'js_canvas_draw_line: function(x1, y1, x2, y2, width, colour) {',
    to: 'js_canvas_draw_line: function(x1, y1, x2, y2, width, colour) {\n        if (window.stgSkin && window.stgSkin.line && window.stgSkin.line(x1, y1, x2, y2, width, colour)) return;',
  },
  {
    name: 'skin: poly',
    from: 'js_canvas_draw_poly: function(dr, pointptr, npoints, fill, outline) {',
    to: `js_canvas_draw_poly: function(dr, pointptr, npoints, fill, outline) {
        if (window.stgSkin && window.stgSkin.poly) {
            var pts = [];
            for (var pi = 0; pi < 2 * npoints; pi++) pts.push(getValue(pointptr + 4 * pi, 'i32'));
            if (window.stgSkin.poly(pts, fill, outline)) return;
        }`,
  },
  {
    name: 'skin: circle',
    from: 'js_canvas_draw_circle: function(dr, x, y, r, fill, outline) {',
    to: 'js_canvas_draw_circle: function(dr, x, y, r, fill, outline) {\n        if (window.stgSkin && window.stgSkin.circle && window.stgSkin.circle(x, y, r, fill, outline)) return;',
  },
  {
    name: 'skin: text',
    from: `text) {
        canvas_set_font(ctx, fontsize, monospaced);`,
    to: `text) {
        if (window.stgSkin && window.stgSkin.text &&
            window.stgSkin.text(x, y, halign, colour, fontsize, monospaced, UTF8ToString(text))) return;
        canvas_set_font(ctx, fontsize, monospaced);`,
  },

  {
    // Lets the UI layer restyle every colour a puzzle announces.
    name: 'recolour hook',
    from: 'colours[colour_number] = UTF8ToString(colour_string);',
    to: 'colours[colour_number] = UTF8ToString(colour_string);\n        if (window.stgRecolour) colours[colour_number] = window.stgRecolour(colour_number, colours[colour_number]);',
  },
]);

// ---- Engine (C) patches: layout tweaks that no amount of JS can do ----
patch('mines.c', [
  {
    // Upstream reserves a fat 1.5-tile margin around the board for the 3D rim.
    // Our skin has no rim, and on a phone that margin wastes a third of the screen.
    name: 'mines: slim border',
    from: '#define BORDER max(TILE_SIZE * 3 / 2, ARROW_DIST+ARROW_HEAD_WIDTH + 2)',
    to: '#define BORDER (IS_CYCLIC(ds->grid->type) ? ARROW_DIST+ARROW_HEAD_WIDTH + 4 : TILE_SIZE / 2)',
  },
]);

patch('emcc.c', [
  {
    // Colours are normally announced once at startup. Re-announcing them (after
    // the page theme changed) lets the engine rebuild its palette from the new
    // background colour and redraw, so dark mode needs no reload.
    name: 'refresh_colours()',
    from: 'void rescale_puzzle(void)\n{\n    resize();\n    midend_force_redraw(me);\n}',
    to: `void rescale_puzzle(void)
{
    resize();
    midend_force_redraw(me);
}

/* Called from JS when the page theme (and so the default background) changes */
void refresh_colours(void)
{
    int i, n;
    float *c = midend_colours(me, &n);
    for (i = 0; i < n; i++) {
        char col[40];
        sprintf(col, "#%02x%02x%02x",
                (unsigned)(0.5F + 255 * c[i*3+0]),
                (unsigned)(0.5F + 255 * c[i*3+1]),
                (unsigned)(0.5F + 255 * c[i*3+2]));
        js_set_colour(i, col);
    }
    sfree(c);
    midend_force_redraw(me);
}`,
  },
]);

patch('cmake/platforms/emscripten.cmake', [
  { name: 'export refresh_colours', from: '  _rescale_puzzle\n', to: '  _rescale_puzzle\n  _refresh_colours\n' },
]);

console.log('Patched upstream glue and engines.');
