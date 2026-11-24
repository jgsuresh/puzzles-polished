// Per-game "skins".
//
// The engines draw through a handful of primitives (rect, line, poly, circle,
// text) and identify colours by *semantic index* (COL_MINE, COL_HIGHLIGHT...).
// The patched glue offers each primitive to window.stgSkin first; a skin method
// returns true if it drew the call itself, false to let the stock drawing run.
//
// Skins draw on the global `ctx` (upstream's offscreen canvas, already scaled)
// and read the engine's announced palette from the global `colours` array.
// The colour index lists below mirror each game's `enum` in upstream's C source.
(function () {
  'use strict';

  /* ---------- colour helpers ---------- */
  function parse(c) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    m = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(c);
    return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
  }
  function hex(rgb) {
    return '#' + rgb.map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
  }
  function mix(a, b, t) {
    var x = parse(a), y = parse(b);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  var lighten = function (c, t) { return mix(c, '#ffffff', t); };
  var darken = function (c, t) { return mix(c, '#000000', t); };

  /* ---------- geometry helpers ---------- */
  function area(p) {
    var a = 0;
    for (var i = 0, n = p.length / 2; i < n; i++) {
      var j = (i + 1) % n;
      a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
    }
    return a / 2;
  }
  // Offset a polygon inward by d (negative = outward) using mitred corners.
  function offsetPoly(p, d) {
    var n = p.length / 2, out = [], sgn = area(p) > 0 ? 1 : -1;
    var nx = [], ny = [];
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n, dx = p[2 * j] - p[2 * i], dy = p[2 * j + 1] - p[2 * i + 1];
      var len = Math.hypot(dx, dy) || 1;
      nx.push(-dy / len * sgn); ny.push(dx / len * sgn);
    }
    for (var k = 0; k < n; k++) {
      var m = (k - 1 + n) % n;
      var bx = nx[m] + nx[k], by = ny[m] + ny[k];
      var dot = 1 + nx[m] * nx[k] + ny[m] * ny[k];
      out.push(p[2 * k] + bx / dot * d, p[2 * k + 1] + by / dot * d);
    }
    return out;
  }
  function pathPoly(p) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (var i = 1; i < p.length / 2; i++) ctx.lineTo(p[2 * i], p[2 * i + 1]);
    ctx.closePath();
  }
  function bbox(p) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = 0; i < p.length; i += 2) {
      x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]);
      y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]);
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }
  // Fill a polygon with rounded corners: shrink by (gap + r/2), fill, then
  // stroke with a round join of width r so the outline grows back out rounded.
  function fillRounded(p, gap, r, fill) {
    var q = offsetPoly(p, gap + r / 2);
    pathPoly(q);
    ctx.fillStyle = fill;
    ctx.fill();
    if (r > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = r;
      ctx.strokeStyle = typeof fill === 'string' ? fill : colours[0];
      if (typeof fill === 'string') ctx.stroke();
    }
    return q;
  }
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- theme tokens ----------
     Skins call tk() at draw/palette time, never at load, so a live theme switch
     (which re-announces the palette and redraws) just works. */
  var TOKENS = {
    light: { dark: false, ink: '#1f2640', accent: '#4f46e5', tint: '#8f8bf0', muted: '#6b7394', danger: '#e5484d',
             grid: '#2a3150', wire: '#4a5578', barrier: '#2c3550', pencil: '#7b819c', killer: '#c9741b', shadow: 'rgba(60, 50, 30, 0.28)' },
    dark:  { dark: true, ink: '#e8ebf7', accent: '#9a96ff', tint: '#6e6ad8', muted: '#9aa3c7', danger: '#ff6b72',
             grid: '#c9cff0', wire: '#9aa6d0', barrier: '#d3d9f2', pencil: '#8f96b8', killer: '#e59a4a', shadow: 'rgba(0, 0, 0, 0.5)' },
  };
  function tk() { return document.documentElement.dataset.theme === 'dark' ? TOKENS.dark : TOKENS.light; }

  window.stgSkinKit = { parse: parse, hex: hex, mix: mix, lighten: lighten, darken: darken, offsetPoly: offsetPoly, pathPoly: pathPoly, bbox: bbox, fillRounded: fillRounded, rrect: rrect, area: area };

  var SKINS = {};

  /* =====================================================================
     MINES
     ===================================================================== */
  (function () {
    var C = {};
    ['BACKGROUND', 'BACKGROUND2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
      'MINE', 'BANG', 'CROSS', 'FLAG', 'FLAGBASE', 'QUERY', 'HIGHLIGHT', 'LOWLIGHT',
      'WRONGNUMBER', 'CURSOR', 'FLAGLIGHT', 'CYCLIC_ARROW'].forEach(function (n, i) { C[n] = i; });

    var bevel = null; // outer polygon of a covered tile, gathered from the engine's bevel quads

    SKINS.mines = {
      poly: function (pts, fill, outline) {
        var n = pts.length / 2;
        // 1. The four bevel quads of a covered tile: swallow them, remember the outer edge.
        if (n === 4 && fill === outline && (fill === C.HIGHLIGHT || fill === C.LOWLIGHT)) {
          if (!bevel) bevel = { pts: [], quads: 0 };
          bevel.pts.push(pts[0], pts[1]);
          bevel.quads++;
          return true;
        }
        // 2. The inner face that follows them: draw a raised, rounded tile instead.
        if (bevel && fill === outline && n >= 3 && n <= bevel.quads) {
          // (the board's rim is also bevel quads: only the last n belong to this tile)
          var outer = bevel.pts.slice(-2 * n);
          bevel = null;
          var bb = bbox(outer);
          var base = colours[fill];
          var dk = tk().dark;
          var top = dk ? mix(base, '#ffffff', 0.17) : lighten(base, 0.85);
          var bot = dk ? mix(base, '#7771ea', 0.14) : mix(base, '#9d97d6', 0.32);
          // soft drop shadow
          ctx.save();
          ctx.shadowColor = tk().shadow;
          ctx.shadowBlur = Math.max(2, bb.h * 0.08);
          ctx.shadowOffsetY = Math.max(1, bb.h * 0.04);
          var g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
          g.addColorStop(0, top); g.addColorStop(1, bot);
          var r = Math.max(2, bb.h * 0.2);
          fillRounded(outer, Math.max(0.5, bb.h * 0.015), r, g);
          ctx.restore();
          return true;
        }
        bevel = null;
        // 3. Opened tiles: flat, recessed, rounded.
        if (fill === outline && n >= 3 && (fill === C.BACKGROUND2 || fill === C.BANG || fill === C.WRONGNUMBER)) {
          var b2 = bbox(pts);
          var col = fill === C.BACKGROUND2 ? mix(colours[C.BACKGROUND], colours[C.LOWLIGHT], 0.28) : colours[fill];
          fillRounded(pts, Math.max(0.5, b2.h * 0.015), Math.max(2, b2.h * 0.18), col);
          return true;
        }
        // 4. Flag: same shapes, softened.
        if (fill === C.FLAG || fill === C.FLAGBASE || fill === C.FLAGLIGHT) {
          pathPoly(pts);
          ctx.fillStyle = colours[fill];
          ctx.fill();
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(1.5, bbox(pts).h * 0.12);
          ctx.strokeStyle = colours[fill];
          ctx.stroke();
          return true;
        }
        return false;
      },
      // The old mine: a circle plus two crossing rects plus a glint. Redraw as a bomb.
      circle: function (x, y, r, fill) {
        if (fill !== C.MINE) return false;
        var R = r * 6 / 5 * 0.82;
        var ink = colours[C.MINE];
        ctx.save();
        ctx.translate(x + 0.5, y + 0.5);
        ctx.strokeStyle = ink;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.5, R * 0.18);
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
          ctx.lineTo(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02);
          ctx.stroke();
        }
        var g = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.05, 0, 0, R * 0.75);
        g.addColorStop(0, tk().dark ? '#ffffff' : lighten(ink, 0.35)); g.addColorStop(1, ink);
        ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, 2 * Math.PI);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(-R * 0.25, -R * 0.28, R * 0.12, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
        ctx.restore();
        return true;
      },
      // spikes and glint of the stock mine are redrawn by the circle hook
      rect: function (x, y, w, h, colour) { return colour === C.MINE || colour === C.HIGHLIGHT; },
      // thin outlines between opened tiles: the rounded tiles already have gaps
      line: function (x1, y1, x2, y2, width, colour) { return colour === C.LOWLIGHT; },
    };
  })();


  /* =====================================================================
     NET
     ===================================================================== */
  (function () {
    var C = {};
    ['BACKGROUND', 'LOCKED', 'BORDER', 'WIRE', 'ENDPOINT', 'POWERED', 'BARRIER', 'ERR']
      .forEach(function (n, i) { C[n] = i; });
    SKINS.net = {
      palette: function (i, c) {
        var t = tk(), bg = colours[0] || c;
        switch (i) {
          case C.WIRE: return t.wire;
          case C.ENDPOINT: return '#f4b03d';
          case C.POWERED: return '#19c3a4';
          case C.BARRIER: return t.barrier;
          case C.ERR: return '#ef4a5a';
          case C.LOCKED: return mix(bg, t.tint, t.dark ? 0.3 : 0.38);
          case C.BORDER: return mix(bg, t.muted, t.dark ? 0.2 : 0.28);
          default: return c;
        }
      },
      // Endpoint boxes: two stacked quads (outline, then fill) -> soft rounded squares.
      poly: function (pts, fill, outline) {
        if (pts.length !== 8 || outline !== C.WIRE) return false;
        var bb = bbox(pts), r = Math.max(2, bb.w * 0.28);
        if (fill === C.WIRE) { // outer rim of the box
          fillRounded(pts, 0, r, colours[C.WIRE]);
        } else {               // face of the box, with a soft highlight
          var g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
          g.addColorStop(0, lighten(colours[fill], 0.3)); g.addColorStop(1, colours[fill]);
          fillRounded(pts, 0, r, g);
        }
        return true;
      },
      // Wires: slightly slimmer, so the cyan "power" core reads as a glow.
      line: function (x1, y1, x2, y2, width, colour) {
        if (width < 2 || (colour !== C.WIRE && colour !== C.POWERED && colour !== C.ERR)) return false;
        var w = colour === C.WIRE ? width * 0.82 : width * 1.4;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = w;
        ctx.strokeStyle = colours[colour];
        if (colour !== C.WIRE) { ctx.shadowColor = colours[colour]; ctx.shadowBlur = width * 0.9; }
        ctx.beginPath();
        ctx.moveTo(x1 + 0.5, y1 + 0.5); ctx.lineTo(x2 + 0.5, y2 + 0.5);
        ctx.stroke();
        ctx.restore();
        return true;
      },
    };
  })();


  /* =====================================================================
     SOLO (and, via the same drawing code shape, any digit-grid game we add)
     ===================================================================== */
  var fontFamilyCache = null;
  function fontFamily() {
    if (!fontFamilyCache) fontFamilyCache = getComputedStyle(onscreen_canvas).fontFamily;
    return fontFamilyCache;
  }
  // Same placement rules as upstream's js_canvas_draw_text, but with a chosen weight.
  function drawText(x, y, halign, colour, size, weight, txt) {
    ctx.font = weight + ' ' + size + 'px ' + fontFamily();
    ctx.fillStyle = colour;
    ctx.textAlign = halign === 0 ? 'left' : halign === 1 ? 'center' : 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, x, y);
  }
  (function () {
    var C = {};
    ['BACKGROUND', 'XDIAGONALS', 'GRID', 'CLUE', 'USER', 'HIGHLIGHT', 'ERROR', 'PENCIL', 'KILLER']
      .forEach(function (n, i) { C[n] = i; });
    SKINS.solo = {
      palette: function (i, c) {
        var t = tk(), bg = colours[0] || c;
        switch (i) {
          case C.CLUE: return t.ink;
          case C.USER: return t.accent;
          case C.ERROR: return t.danger;
          case C.PENCIL: return t.pencil;
          case C.KILLER: return t.killer;
          case C.HIGHLIGHT: return mix(bg, t.tint, t.dark ? 0.55 : 0.5);
          case C.XDIAGONALS: return mix(bg, t.tint, 0.18);
          case C.GRID: return t.grid;
          default: return c;
        }
      },
      rect: function (x, y, w, h, colour) {
        if (colour === C.GRID) {
          // Thin lines between cells are faint; block borders stay strong.
          var thin = Math.min(w, h) <= 1.5;
          ctx.fillStyle = thin ? mix(colours[C.GRID], colours[C.BACKGROUND], 0.72) : colours[C.GRID];
          ctx.fillRect(x, y, w, h);
          return true;
        }
        if (colour === C.HIGHLIGHT && w > 8 && h > 8) {
          // Selected cell: a soft rounded tile instead of a flat block.
          ctx.fillStyle = colours[C.BACKGROUND];
          ctx.fillRect(x, y, w, h);
          var inset = Math.max(1.5, Math.min(w, h) * 0.06);
          rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, Math.min(w, h) * 0.18);
          ctx.fillStyle = colours[C.HIGHLIGHT];
          ctx.fill();
          return true;
        }
        return false;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (colour === C.CLUE) { drawText(x, y, halign, colours[colour], size, 800, txt); return true; }
        if (colour === C.USER || colour === C.ERROR) { drawText(x, y, halign, colours[colour], size, 600, txt); return true; }
        if (colour === C.PENCIL) { drawText(x, y, halign, colours[colour], size, 600, txt); return true; }
        return false;
      },
    };
  })();


  /* =====================================================================
     LOOPY
     ===================================================================== */
  (function () {
    var C = {};
    ['BACKGROUND', 'FOREGROUND', 'LINEUNKNOWN', 'HIGHLIGHT', 'MISTAKE', 'SATISFIED', 'FAINT']
      .forEach(function (n, i) { C[n] = i; });
    SKINS.loopy = {
      palette: function (i, c) {
        var t = tk(), bg = colours[0] || c;
        switch (i) {
          case C.FOREGROUND: return t.ink;
          case C.LINEUNKNOWN: return mix(bg, t.muted, t.dark ? 0.34 : 0.38);
          case C.FAINT: return mix(bg, t.muted, t.dark ? 0.18 : 0.22);
          case C.HIGHLIGHT: return '#f2a900';
          case C.MISTAKE: return t.danger;
          case C.SATISFIED: return mix(bg, t.muted, t.dark ? 0.6 : 0.65);
          default: return c;
        }
      },
      // Chosen loop segments: round-capped indigo ribbons (unknown/"no" edges keep stock look).
      line: function (x1, y1, x2, y2, width, colour) {
        if (colour !== C.FOREGROUND && colour !== C.MISTAKE && colour !== C.HIGHLIGHT) return false;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = width * 1.15;
        ctx.strokeStyle = colour === C.FOREGROUND ? (tk().dark ? '#a5a1ff' : '#4f46e5') : colours[colour];
        ctx.beginPath();
        ctx.moveTo(x1 + 0.5, y1 + 0.5); ctx.lineTo(x2 + 0.5, y2 + 0.5);
        ctx.stroke();
        ctx.restore();
        return true;
      },
      // Dots: a touch larger and softer than upstream's pin-pricks.
      circle: function (x, y, r, fill) {
        if (fill !== C.FOREGROUND) return false;
        ctx.beginPath();
        ctx.arc(x + 0.5, y + 0.5, r * 1.15, 0, 2 * Math.PI);
        ctx.fillStyle = mix(tk().ink, colours[C.BACKGROUND], 0.42);
        ctx.fill();
        return true;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (colour !== C.FOREGROUND && colour !== C.SATISFIED && colour !== C.MISTAKE) return false;
        drawText(x, y, halign, colours[colour], size, 800, txt);
        return true;
      },
    };
  })();


  /* =====================================================================
     FLOOD
     ===================================================================== */
  (function () {
    var C = { BACKGROUND: 0, SEPARATOR: 1, HIGHLIGHT: 12, LOWLIGHT: 13 };
    // red, yellow, green, blue, orange, purple, brown, sky, pink, slate (upstream order)
    var CANDY = ['#ef5b5b', '#f6c141', '#3dbb7e', '#4c8df6', '#f4893a', '#9a6bdf', '#a8754f', '#59c7ea', '#ee7fb6', '#8a93a8'];

    SKINS.flood = {
      palette: function (i, c) {
        if (i >= 2 && i <= 11) return CANDY[i - 2];
        if (i === C.SEPARATOR) return tk().dark ? mix(colours[0] || c, '#000000', 0.5) : mix(colours[0] || c, '#ffffff', 0.72);
        return c;
      },
      // The recessed 3D frame around the board: not needed.
      poly: function (pts, fill, outline) { return fill === C.HIGHLIGHT || fill === C.LOWLIGHT; },
      // Tiles get a soft top-to-bottom sheen.
      rect: function (x, y, w, h, colour) {
        if (colour < 2 || colour > 11 || w !== h || w < 6) return false;
        var g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, lighten(colours[colour], 0.16));
        g.addColorStop(1, darken(colours[colour], 0.05));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        return true;
      },
    };
  })();

  /* =====================================================================
     FIFTEEN
     ===================================================================== */
  (function () {
    var C = { BACKGROUND: 0, TEXT: 1, HIGHLIGHT: 2, LOWLIGHT: 3 };
    var pend = null; // outer origin of the tile whose bevel we just swallowed

    SKINS.fifteen = {
      palette: function (i, c) {
        var t = tk();
        if (i === C.TEXT) return t.ink;
        if (i === C.HIGHLIGHT) return t.dark ? '#454d8f' : '#ffffff';
        if (i === C.LOWLIGHT) return t.dark ? '#2d3366' : mix(colours[0] || c, '#8f8bf0', 0.35);
        return c;
      },
      poly: function (pts, fill, outline) {
        if (fill !== outline || (fill !== C.HIGHLIGHT && fill !== C.LOWLIGHT)) return false;
        if (pts.length === 10) return true;                    // recessed frame around the board
        if (pts.length === 6) {                                // bevel triangles of a tile
          if (fill === C.LOWLIGHT) pend = { x: pts[4], y: pts[3] };
          return true;
        }
        return false;
      },
      rect: function (x, y, w, h, colour) {
        if (w !== h || w < 8) return false;
        if (pend) {                                            // the face of a tile
          var ox = pend.x, oy = pend.y, size = w + 2 * (x - ox);
          pend = null;
          ctx.fillStyle = colours[C.BACKGROUND];
          ctx.fillRect(ox, oy, size + 1, size + 1);
          var gap = Math.max(1.5, size * 0.04), r = size * 0.2;
          var face;
          if (colour === C.BACKGROUND) {
            face = ctx.createLinearGradient(0, oy, 0, oy + size);
            face.addColorStop(0, tk().dark ? '#464e90' : '#ffffff');
            face.addColorStop(1, tk().dark ? '#2f3569' : mix(colours[C.BACKGROUND], '#9d97d6', 0.3));
          } else face = colours[colour];
          ctx.save();
          ctx.shadowColor = tk().dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(60, 50, 90, 0.28)';
          ctx.shadowBlur = size * 0.07;
          ctx.shadowOffsetY = size * 0.03;
          rrect(ox + gap, oy + gap, size - 2 * gap - 1, size - 2 * gap - 1, r);
          ctx.fillStyle = face;
          ctx.fill();
          ctx.restore();
          return true;
        }
        if (colour === C.BACKGROUND && w < (onscreen_canvas.width / fe_scale) * 0.5) { // the empty slot: a faint recess
          ctx.fillStyle = colours[C.BACKGROUND];
          ctx.fillRect(x, y, w, h);
          var inset = Math.max(1.5, w * 0.04);
          rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, w * 0.2);
          ctx.fillStyle = darken(colours[C.BACKGROUND], tk().dark ? 0.25 : 0.05);
          ctx.fill();
          return true;
        }
        return false;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (colour !== C.TEXT) return false;
        drawText(x, y, halign, colours[colour], size, 800, txt);
        return true;
      },
    };
  })();

  /* =====================================================================
     LIGHTS UP
     ===================================================================== */
  (function () {
    var C = { BACKGROUND: 0, GRID: 1, BLACK: 2, LIGHT: 3, LIT: 4, ERROR: 5, CURSOR: 6 };
    var floorW = 0, blackW = 0;

    SKINS.lightup = {
      palette: function (i, c) {
        var t = tk(), bg = colours[0] || c;
        switch (i) {
          case C.GRID: return mix(bg, t.muted, t.dark ? 0.22 : 0.3);
          case C.BLACK: return t.dark ? '#5a6498' : '#2b3252';
          case C.LIGHT: return '#ffffff';
          case C.LIT: return t.dark ? '#5c4e1f' : '#ffe7a0';
          case C.ERROR: return t.danger;
          case C.CURSOR: return t.accent;
          default: return c;
        }
      },
      rect: function (x, y, w, h, colour) {
        if (colour === C.BACKGROUND || colour === C.LIT || colour === C.GRID) {
          if (w === h && w > 8) floorW = w;
          return false;
        }
        if (colour !== C.BLACK) return false;
        var T = Math.max(floorW, blackW);
        if (w >= 0.6 * T) {                                    // a wall
          blackW = Math.max(blackW, w);
          ctx.fillStyle = colours[C.BACKGROUND];
          ctx.fillRect(x, y, w, h);
          var inset = Math.max(1, w * 0.045);
          var g = ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, tk().dark ? '#6c77ad' : '#3d4670'); g.addColorStop(1, tk().dark ? '#505a8c' : '#262c4a');
          rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, w * 0.16);
          ctx.fillStyle = g;
          ctx.fill();
        } else {                                               // the "can't be a light" marker
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, w * 0.42, 0, 2 * Math.PI);
          ctx.fillStyle = tk().dark ? mix('#9aa3c7', colours[C.BACKGROUND], 0.5) : mix('#2b3252', colours[C.BACKGROUND], 0.45);
          ctx.fill();
        }
        return true;
      },
      circle: function (x, y, r, fill, outline) {
        if (outline !== C.BLACK || (fill !== C.LIGHT && fill !== C.ERROR)) return false;
        var bad = fill === C.ERROR, cx = x + 0.5, cy = y + 0.5;
        ctx.save();
        if (!bad) { ctx.shadowColor = 'rgba(255, 190, 40, 0.9)'; ctx.shadowBlur = r * 0.9; }
        var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        if (bad) { g.addColorStop(0, '#ff9aa0'); g.addColorStop(1, '#e5484d'); }
        else { g.addColorStop(0, '#fffbe8'); g.addColorStop(0.55, '#ffd84d'); g.addColorStop(1, '#f2a900'); }
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, 2 * Math.PI);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        return true;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (colour !== C.LIGHT && colour !== C.ERROR) return false;
        drawText(x, y, halign, colour === C.ERROR ? '#ff7b82' : '#ffffff', size, 800, txt);
        return true;
      },
    };
  })();

  /* =====================================================================
     PATTERN (nonogram)
     ===================================================================== */
  (function () {
    var C = { BACKGROUND: 0, EMPTY: 1, FULL: 2, TEXT: 3, UNKNOWN: 4, GRID: 5, CURSOR: 6, ERROR: 7, CURSOR_GUIDE: 8 };

    SKINS.pattern = {
      palette: function (i, c) {
        var t = tk(), bg = colours[0] || c;
        switch (i) {
          case C.GRID: return mix(bg, t.muted, t.dark ? 0.2 : 0.32);
          case C.TEXT: return t.ink;
          case C.ERROR: return t.danger;
          case C.CURSOR_GUIDE: return t.accent;
          case C.CURSOR: return t.accent;
          case C.UNKNOWN: return mix(bg, t.muted, t.dark ? 0.14 : 0.1);
          case C.EMPTY: return t.dark ? mix(bg, '#ffffff', 0.06) : lighten(bg, 0.7);
          case C.FULL: return t.dark ? '#a5a1ff' : '#2c3260';
          default: return c;
        }
      },
      rect: function (x, y, w, h, colour) {
        if ((colour !== C.FULL && colour !== C.EMPTY && colour !== C.UNKNOWN) || w < 6 || h < 6) return false;
        var inset = Math.max(0.5, w * 0.03), r = Math.min(w, h) * 0.24;
        var fill = colours[colour];
        if (colour === C.FULL) {
          var g = ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, tk().dark ? '#b7b3ff' : '#454d8f'); g.addColorStop(1, tk().dark ? '#8782f2' : '#262b52');
          fill = g;
        }
        rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, r);
        ctx.fillStyle = fill;
        ctx.fill();
        if (colour === C.EMPTY) {                              // a marked-empty cell gets a tiny dot
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.max(1, w * 0.07), 0, 2 * Math.PI);
          ctx.fillStyle = mix(colours[C.BACKGROUND], tk().muted, 0.45);
          ctx.fill();
        }
        return true;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (colour !== C.TEXT && colour !== C.ERROR && colour !== C.CURSOR_GUIDE) return false;
        drawText(x, y, halign, colours[colour], size, 700, txt);
        return true;
      },
    };
  })();


  /* =====================================================================
     TIER A - declarative skins for the rest of the collection.
     def(name, colourNames, palette, extra): `colourNames` is a space-separated
     enum list (or an {NAME: index} object where the engine aliases entries);
     `palette` maps NAME -> function(t, bg, c); `extra(C)` may add hooks.
     Every non-monospaced label is set in bold by default.
     ===================================================================== */
  var CANDY = ['#ef5b5b', '#f6c141', '#3dbb7e', '#4c8df6', '#f4893a', '#9a6bdf', '#a8754f', '#59c7ea', '#ee7fb6', '#8a93a8'];
  function def(name, cols, pal, extra) {
    var C = {};
    if (typeof cols === 'string') cols.split(' ').forEach(function (n, i) { C[n] = i; });
    else C = cols;
    var skin = {
      palette: function (i, c, raw) {
        var t = tk(), bg = colours[0] || c;
        for (var n in pal) if (C[n] === i) return pal[n](t, bg, c, raw);
        return c;
      },
      text: function (x, y, halign, colour, size, mono, txt) {
        if (mono) return false;
        drawText(x, y, halign, colours[colour], size, 700, txt);
        return true;
      },
    };
    if (extra) { var more = extra(C, skin); for (var k in more) skin[k] = more[k]; }
    SKINS[name] = skin;
    return skin;
  }
  var ink = function (t) { return t.ink; };
  var accent = function (t) { return t.accent; };
  var danger = function (t) { return t.danger; };
  var faint = function (a) { return function (t, bg) { return mix(bg, t.muted, t.dark ? a * 0.7 : a); }; };
  var tinted = function (a) { return function (t, bg) { return mix(bg, t.tint, a); }; };
  var fixed = function (light, dark) { return function (t) { return t.dark ? dark : light; }; };
  var GOOD = fixed('#2fa56a', '#4fd08f');
  var goodTint = function (a) { return function (t, bg) { return mix(bg, t.dark ? '#4fd08f' : '#2fa56a', a); }; };
  var dangerTint = function (a) { return function (t, bg) { return mix(bg, t.danger, a); }; };
  var DARKFILL = fixed('#2c3260', '#a5a1ff');   // "black" cells
  var SOFTLIGHT = function (t, bg) { return t.dark ? mix(bg, '#ffffff', 0.07) : lighten(bg, 0.7); }; // "white" cells

  // --- Latin-square family ---
  def('keen', 'BACKGROUND GRID USER HIGHLIGHT ERROR PENCIL',
    { GRID: function (t) { return t.grid; }, USER: accent, HIGHLIGHT: tinted(0.5), ERROR: danger, PENCIL: function (t) { return t.pencil; } });
  def('towers', 'BACKGROUND GRID USER HIGHLIGHT ERROR PENCIL DONE',
    { GRID: function (t) { return t.grid; }, USER: accent, HIGHLIGHT: tinted(0.5), ERROR: danger, PENCIL: function (t) { return t.pencil; }, DONE: faint(0.6) });
  def('unequal', 'BACKGROUND GRID TEXT GUESS ERROR PENCIL HIGHLIGHT LOWLIGHT',
    { GRID: function (t) { return t.grid; }, TEXT: ink, GUESS: accent, ERROR: danger, PENCIL: function (t) { return t.pencil; }, HIGHLIGHT: tinted(0.5), LOWLIGHT: faint(0.5) });
  def('filling', 'BACKGROUND GRID HIGHLIGHT CORRECT ERROR USER CURSOR',
    { GRID: function (t) { return t.grid; }, HIGHLIGHT: tinted(0.5), CORRECT: goodTint(0.32), ERROR: dangerTint(0.45), USER: accent, CURSOR: accent });
  def('range', { BACKGROUND: 0, GRID: 1, BLACK: 1, TEXT: 1, USER: 1, ERROR: 2, LOWLIGHT: 3, CURSOR: 3 },
    { GRID: function (t) { return t.grid; }, ERROR: danger, LOWLIGHT: tinted(0.3) });
  def('singles', 'BACKGROUND UNUSED1 LOWLIGHT BLACK WHITE BLACKNUM GRID CURSOR ERROR',
    { LOWLIGHT: faint(0.3), BLACK: fixed('#2b3252', '#5a6498'), WHITE: SOFTLIGHT, BLACKNUM: function () { return '#ffffff'; }, GRID: faint(0.3), CURSOR: accent, ERROR: danger });
  def('dominosa', 'BACKGROUND TEXT DOMINO DOMINOCLASH DOMINOTEXT EDGE HIGHLIGHT_1 HIGHLIGHT_2',
    { TEXT: ink, DOMINO: SOFTLIGHT, DOMINOCLASH: dangerTint(0.4), DOMINOTEXT: ink, EDGE: function (t) { return t.grid; }, HIGHLIGHT_1: tinted(0.5),
      HIGHLIGHT_2: function (t, bg) { return mix(bg, '#f2a900', 0.4); } });

  // --- Loops & paths ---
  def('slant', 'BACKGROUND GRID INK SLANT1 SLANT2 ERROR CURSOR FILLEDSQUARE GROUNDED',
    { GRID: faint(0.3), INK: ink, SLANT1: accent, SLANT2: function (t) { return t.muted; }, ERROR: danger, CURSOR: accent, FILLEDSQUARE: tinted(0.25), GROUNDED: goodTint(0.3) });
  def('pearl', 'BACKGROUND HIGHLIGHT LOWLIGHT BLACK WHITE ERROR GRID FLASH DRAGON DRAGOFF',
    { LOWLIGHT: tinted(0.3), BLACK: DARKFILL, WHITE: function (t, bg) { return t.dark ? mix(bg, '#000000', 0.2) : '#ffffff'; }, ERROR: danger, GRID: faint(0.3), DRAGON: accent, DRAGOFF: function (t) { return t.muted; } });
  def('palisade', { BACKGROUND: 0, FLASH: 1, GRID: 2, CLUE: 2, LINE_YES: 2, LINE_MAYBE: 3, LINE_NO: 4, ERROR: 5 },
    { GRID: ink, LINE_MAYBE: faint(0.4), LINE_NO: faint(0.15), ERROR: danger });
  def('tracks', 'BACKGROUND TRACK_BACKGROUND GRID CLUE CURSOR TRACK TRACK_CLUE SLEEPER DRAGON DRAGOFF ERROR FLASH ERROR_BACKGROUND',
    { TRACK_BACKGROUND: tinted(0.2), GRID: faint(0.3), CLUE: ink, CURSOR: accent, TRACK: ink, TRACK_CLUE: ink, SLEEPER: faint(0.5), DRAGON: accent, DRAGOFF: function (t) { return t.muted; }, ERROR: danger, ERROR_BACKGROUND: dangerTint(0.3) });
  def('bridges', 'BACKGROUND FOREGROUND HIGHLIGHT LOWLIGHT SELECTED MARK HINT GRID WARNING CURSOR',
    { FOREGROUND: ink, SELECTED: accent, MARK: function (t) { return t.muted; }, HINT: function (t, bg) { return mix(bg, '#f2a900', 0.55); }, GRID: faint(0.3), WARNING: danger, CURSOR: accent });
  def('signpost', 'BACKGROUND HIGHLIGHT LOWLIGHT GRID CURSOR ERROR DRAG_ORIGIN ARROW ARROW_BG_DIM NUMBER NUMBER_SET NUMBER_SET_MID',
    { GRID: faint(0.3), CURSOR: accent, ERROR: danger, ARROW: ink, NUMBER: ink });

  // --- Grid logic ---
  def('tents', 'BACKGROUND GRID GRASS TREETRUNK TREELEAF TENT ERROR ERRTEXT ERRTRUNK',
    { GRID: faint(0.3), GRASS: goodTint(0.22), TREETRUNK: fixed('#8b5e3c', '#b98a63'), TREELEAF: GOOD, TENT: fixed('#f4893a', '#ffa45c'), ERROR: danger, ERRTEXT: danger });
  def('undead', 'BACKGROUND GRID TEXT ERROR HIGHLIGHT FLASH GHOST ZOMBIE VAMPIRE DONE',
    { GRID: faint(0.35), TEXT: ink, ERROR: danger, HIGHLIGHT: tinted(0.45), GHOST: fixed('#7e6cf0', '#a99bff'), ZOMBIE: GOOD, VAMPIRE: fixed('#ef5b5b', '#ff8087'), DONE: function (t) { return t.muted; } });
  def('magnets', 'BACKGROUND HIGHLIGHT LOWLIGHT TEXT ERROR CURSOR DONE NEUTRAL NEGATIVE POSITIVE NOT',
    { TEXT: ink, ERROR: danger, CURSOR: accent, DONE: function (t) { return t.muted; }, NEUTRAL: faint(0.5), NEGATIVE: fixed('#4c6ff0', '#8aa2ff'), POSITIVE: fixed('#ef5b5b', '#ff8087') });
  def('mosaic', { BACKGROUND: 0, UNMARKED: 1, GRID: 2, MARKED: 3, BLANK: 4, TEXT_SOLVED: 5, ERROR: 6, CURSOR: 7 },
    { UNMARKED: faint(0.14), GRID: faint(0.3), MARKED: DARKFILL, BLANK: fixed('#ffffff', '#262b4d'), TEXT_SOLVED: function (t) { return t.muted; }, ERROR: danger, CURSOR: accent });
  def('blackbox', 'BACKGROUND COVER LOCK TEXT FLASHTEXT HIGHLIGHT LOWLIGHT GRID BALL WRONG BUTTON CURSOR',
    { COVER: function (t, bg) { return mix(bg, t.dark ? '#6e6ad8' : '#9d97d6', 0.35); }, LOCK: tinted(0.35), TEXT: ink, FLASHTEXT: function () { return '#ffffff'; }, GRID: faint(0.3), BALL: ink, WRONG: danger, BUTTON: accent, CURSOR: accent });
  def('guess', { BACKGROUND: 0, FRAME: 1, CURSOR: 2, FLASH: 3, HOLD: 4, EMPTY: 5, 1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 15, CORRECTPLACE: 16, CORRECTCOLOUR: 17 },
    (function () {
      var p = { FRAME: function (t) { return t.muted; }, CURSOR: accent, HOLD: tinted(0.5), EMPTY: faint(0.25),
                CORRECTPLACE: fixed('#1f2640', '#e8ebf7'), CORRECTCOLOUR: fixed('#ffffff', '#6a72a6') };
      for (var i = 1; i <= 10; i++) (function (k) { p[k] = function () { return CANDY[k - 1]; }; })(i);
      return p;
    })());

  // --- Regions ---
  def('rect', 'BACKGROUND CORRECT LINE TEXT GRID DRAG DRAGERASE CURSOR',
    { CORRECT: goodTint(0.3), LINE: ink, TEXT: ink, GRID: faint(0.3), DRAG: tinted(0.4), DRAGERASE: dangerTint(0.3), CURSOR: accent });
  def('galaxies', 'BACKGROUND WHITEBG BLACKBG WHITEDOT BLACKDOT GRID EDGE ARROW CURSOR',
    { WHITEBG: function (t, bg) { return t.dark ? mix(bg, '#ffffff', 0.07) : lighten(bg, 0.55); }, BLACKBG: function (t, bg) { return mix(bg, t.ink, t.dark ? 0.22 : 0.2); },
      WHITEDOT: function () { return '#ffffff'; }, BLACKDOT: fixed('#1f2640', '#0c0f20'), GRID: faint(0.3), EDGE: ink, ARROW: accent, CURSOR: accent });
  def('map', 'BACKGROUND GRID 0 1 2 3 ERROR ERRTEXT',
    { GRID: ink, 0: fixed('#ef8a8a', '#d86a6a'), 1: fixed('#f6c141', '#d8a62c'), 2: fixed('#59c78a', '#3aa56a'), 3: fixed('#6aa5f6', '#4a82da'), ERROR: danger, ERRTEXT: danger });

  // --- Action & sliding ---
  def('flip', 'BACKGROUND WRONG RIGHT GRID DIAG HINT CURSOR',
    { WRONG: fixed('#2b3252', '#3b4373'), RIGHT: fixed('#ffe08a', '#ffd45c'), GRID: faint(0.3), DIAG: faint(0.4), HINT: accent, CURSOR: accent });
  def('cube', 'BACKGROUND BORDER BLUE',
    { BORDER: function (t) { return t.wire; }, BLUE: fixed('#4f46e5', '#7c78f0') });
  def('inertia', 'BACKGROUND OUTLINE HIGHLIGHT LOWLIGHT PLAYER DEAD_PLAYER MINE GEM WALL HINT',
    { OUTLINE: ink, PLAYER: accent, DEAD_PLAYER: danger, MINE: fixed('#ef4a5a', '#ff7a85'), GEM: fixed('#19c3a4', '#3de0c2'), WALL: function (t) { return t.wire; }, HINT: fixed('#f2a900', '#ffc533') });
  def('pegs', 'BACKGROUND HIGHLIGHT LOWLIGHT PEG CURSOR',
    { PEG: accent, CURSOR: accent });
  def('samegame', 'BACKGROUND 1 2 3 4 5 6 7 8 9 IMPOSSIBLE SEL HIGHLIGHT LOWLIGHT',
    (function () {
      var order = [3, 0, 2, 1, 5, 4, 7, 6, 9], p = { IMPOSSIBLE: faint(0.6), SEL: ink };
      for (var i = 1; i <= 9; i++) (function (k) { p[k] = function () { return CANDY[order[k - 1]]; }; })(i);
      return p;
    })());
  def('untangle', 'SYSBACKGROUND BACKGROUND LINE CROSSEDLINE OUTLINE POINT DRAGPOINT CURSORPOINT NEIGHBOUR FLASH1 FLASH2',
    { BACKGROUND: function (t, bg, c, raw) { return raw; }, LINE: function (t) { return t.wire; }, CROSSEDLINE: danger, OUTLINE: ink, POINT: accent, DRAGPOINT: fixed('#f2a900', '#ffc533'), CURSORPOINT: fixed('#f2a900', '#ffc533'), NEIGHBOUR: GOOD });
  def('unruly', { BACKGROUND: 0, GRID: 1, EMPTY: 2, 0: 3, '0_HIGHLIGHT': 4, '0_LOWLIGHT': 5, 1: 6, '1_HIGHLIGHT': 7, '1_LOWLIGHT': 8, CURSOR: 9, ERROR: 10 },
    { GRID: faint(0.3), EMPTY: faint(0.14), 0: DARKFILL, 1: fixed('#ffffff', '#262b4d'), CURSOR: accent, ERROR: danger });
  SKINS.sixteen = SKINS.fifteen;   // identical tile code upstream
  def('twiddle', 'BACKGROUND TEXT HIGHLIGHT HIGHLIGHT_GENTLE LOWLIGHT LOWLIGHT_GENTLE HIGHCURSOR LOWCURSOR', { TEXT: ink });
  def('netslide', 'BACKGROUND FLASHING BORDER WIRE ENDPOINT POWERED BARRIER LOWLIGHT TEXT',
    { BORDER: faint(0.28), WIRE: function (t) { return t.wire; }, ENDPOINT: fixed('#f4b03d', '#f4b03d'), POWERED: fixed('#19c3a4', '#19c3a4'), BARRIER: function (t) { return t.barrier; }, TEXT: ink });


  /* =====================================================================
     TIER B - shape upgrades layered on the declarative skins above
     ===================================================================== */

  // Netslide shares Net's endpoint boxes and wires (same colour indices 3..5).
  SKINS.netslide.poly = SKINS.net.poly;
  SKINS.netslide.line = SKINS.net.line;

  // Unruly: rounded cells; "given" cells get a ring instead of four thin bevel bars.
  (function () {
    var S = SKINS.unruly;
    S.rect = function (x, y, w, h, colour) {
      if (colour === 1) return false;                                   // grid gutter
      if (colour >= 2 && colour <= 8 && w === h && w > 6) {              // the cell itself (or its flash colour)
        var inset = Math.max(0.5, w * 0.03);
        rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, w * 0.22);
        ctx.fillStyle = colours[colour];
        ctx.fill();
        return true;
      }
      if (Math.min(w, h) <= 1 && (colour === 4 || colour === 5 || colour === 7 || colour === 8)) {
        if (h === 1 && w > 1 && (colour === 5 || colour === 8)) {         // first of the four bars: draw the ring once
          var ts = 1.5 * (w + 2), cx = x + w / 2, cy = y + ts / 3;
          ctx.beginPath();
          ctx.arc(cx, cy, ts * 0.12, 0, 2 * Math.PI);
          ctx.lineWidth = Math.max(1.5, ts * 0.04);
          ctx.strokeStyle = colour === 5 ? colours[6] : colours[3];
          ctx.stroke();
        }
        return true;
      }
      return false;
    };
  })();

  // Samegame: pieces get the same soft sheen as Flood tiles.
  (function () {
    SKINS.samegame.rect = function (x, y, w, h, colour) {
      if (colour < 1 || colour > 9 || w < 4 || h < 4) return false;
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, lighten(colours[colour], 0.18));
      g.addColorStop(1, darken(colours[colour], 0.06));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      return true;
    };
  })();

  // Pegs: glossy pegs in recessed holes.
  (function () {
    var C = { BACKGROUND: 0, HIGHLIGHT: 1, LOWLIGHT: 2, PEG: 3, CURSOR: 4 };
    SKINS.pegs.circle = function (x, y, r, fill) {
      var cx = x + 0.5, cy = y + 0.5, t = tk();
      if (fill === C.PEG) {
        ctx.save();
        ctx.shadowColor = t.shadow; ctx.shadowBlur = r * 0.35; ctx.shadowOffsetY = r * 0.12;
        var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        g.addColorStop(0, lighten(colours[C.PEG], 0.5)); g.addColorStop(1, darken(colours[C.PEG], 0.08));
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        return true;
      }
      if (fill === C.CURSOR) {                                          // selection halo
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, 2 * Math.PI);
        ctx.lineWidth = Math.max(2, r * 0.25);
        ctx.strokeStyle = t.accent; ctx.stroke();
        return true;
      }
      if (fill === C.LOWLIGHT || fill === C.HIGHLIGHT) {                // empty hole
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = fill === C.HIGHLIGHT ? mix(colours[C.BACKGROUND], t.tint, 0.55)
                                             : mix(colours[C.BACKGROUND], '#000000', t.dark ? 0.35 : 0.1);
        ctx.fill();
        return true;
      }
      return false;
    };
  })();

  // Blackbox: raised cover tiles, glossy balls, no hard grid outline on covered cells.
  (function () {
    var C = { BACKGROUND: 0, COVER: 1, LOCK: 2, GRID: 7, BALL: 8 };
    var lastTile = false;
    SKINS.blackbox.rect = function (x, y, w, h, colour) {
      lastTile = false;
      if ((colour !== C.COVER && colour !== C.LOCK) || w !== h || w < 8) return false;
      lastTile = true;
      ctx.fillStyle = colours[C.BACKGROUND];
      ctx.fillRect(x, y, w, h);
      var base = colours[colour], dk = tk().dark, inset = Math.max(1, w * 0.04);
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, dk ? mix(base, '#ffffff', 0.16) : lighten(base, 0.7));
      g.addColorStop(1, dk ? mix(base, '#7771ea', 0.1) : base);
      ctx.save();
      ctx.shadowColor = tk().shadow; ctx.shadowBlur = w * 0.07; ctx.shadowOffsetY = w * 0.03;
      rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, w * 0.2);
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      return true;
    };
    SKINS.blackbox.poly = function (pts, fill, outline) {
      if (fill < 0 && outline === C.GRID && pts.length === 8 && lastTile) { lastTile = false; return true; }
      return false;
    };
    SKINS.blackbox.circle = function (x, y, r, fill) {
      // circles painted in the tile's own colour only exist to erase; our tile needs none
      if (fill === C.COVER || fill === C.LOCK || fill === C.BACKGROUND) return true;
      if (fill !== C.BALL) return false;
      var cx = x + 0.5, cy = y + 0.5;
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      g.addColorStop(0, tk().dark ? '#ffffff' : lighten(colours[C.BALL], 0.45)); g.addColorStop(1, colours[C.BALL]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = g; ctx.fill();
      return true;
    };
  })();

  /* ---------- activate ---------- */
  var name = (window.STG || {}).name;
  /* "Colour digits": every digit gets its own hue (toggle in the aids bar). The
     golden-angle step keeps neighbouring digits far apart on the wheel. Errors stay red. */
  var ERROR_INDEX = { solo: 6, keen: 4, towers: 4, unequal: 4, filling: 4 };
  function digitColour(ch) {
    var i = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(ch.toUpperCase());
    var dark = document.documentElement.dataset.theme === 'dark';
    return 'hsl(' + Math.round((i * 137.508 + 8) % 360) + ',' + (dark ? 78 : 72) + '%,' + (dark ? 68 : 40) + '%)';
  }
  Object.keys(ERROR_INDEX).forEach(function (n) {
    var skin = SKINS[n];
    if (!skin) return;
    var base = skin.text;
    skin.text = function (x, y, halign, colour, size, mono, txt) {
      if (window.stgDigitColours && colour !== ERROR_INDEX[n] && /^[1-9A-Za-z]$/.test(txt)) {
        drawText(x, y, halign, digitColour(txt), size, 800, txt);
        return true;
      }
      return base ? base.apply(this, arguments) : false;
    };
  });

  if (name && SKINS[name] && !/[?&]skin=off\b/.test(location.search)) window.stgSkin = SKINS[name];
})();
