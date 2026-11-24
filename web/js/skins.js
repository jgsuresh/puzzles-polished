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
          var top = lighten(base, 0.85), bot = mix(base, '#9d97d6', 0.32);
          // soft drop shadow
          ctx.save();
          ctx.shadowColor = 'rgba(60, 50, 30, 0.28)';
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
        g.addColorStop(0, lighten(ink, 0.35)); g.addColorStop(1, ink);
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
    var PAL = { WIRE: '#4a5578', ENDPOINT: '#f4b03d', POWERED: '#19c3a4', BARRIER: '#2c3550', ERR: '#ef4a5a' };

    SKINS.net = {
      palette: function (i, c) {
        for (var k in PAL) if (C[k] === i) return PAL[k];
        if (i === C.LOCKED) return mix(colours[0] || c, '#8f8bf0', 0.38);
        if (i === C.BORDER) return mix(colours[0] || c, '#7a7f99', 0.28);
        return c;
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
    var PAL = { CLUE: '#1f2640', USER: '#4f46e5', ERROR: '#e5484d', PENCIL: '#7b819c', KILLER: '#c9741b' };

    SKINS.solo = {
      palette: function (i, c) {
        for (var k in PAL) if (C[k] === i) return PAL[k];
        var bg = colours[0] || c;
        if (i === C.HIGHLIGHT) return mix(bg, '#8f8bf0', 0.5);
        if (i === C.XDIAGONALS) return mix(bg, '#8f8bf0', 0.18);
        if (i === C.GRID) return '#2a3150';
        return c;
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
    var INK = '#1f2640', LOOP = '#4f46e5';

    SKINS.loopy = {
      palette: function (i, c) {
        var bg = colours[0] || c;
        switch (i) {
          case C.FOREGROUND: return INK;
          case C.LINEUNKNOWN: return mix(bg, '#6b7394', 0.38);
          case C.FAINT: return mix(bg, '#6b7394', 0.22);
          case C.HIGHLIGHT: return '#f2a900';
          case C.MISTAKE: return '#e5484d';
          case C.SATISFIED: return mix(bg, '#6b7394', 0.65);
          default: return c;
        }
      },
      // Chosen loop segments: round-capped indigo ribbons (unknown/"no" edges keep stock look).
      line: function (x1, y1, x2, y2, width, colour) {
        if (colour !== C.FOREGROUND && colour !== C.MISTAKE && colour !== C.HIGHLIGHT) return false;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = width * 1.15;
        ctx.strokeStyle = colour === C.FOREGROUND ? LOOP : colours[colour];
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
        ctx.fillStyle = mix(INK, colours[C.BACKGROUND], 0.42);
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

  /* ---------- activate ---------- */
  var name = (window.STG || {}).name;
  if (name && SKINS[name] && !/[?&]skin=off\b/.test(location.search)) window.stgSkin = SKINS[name];
})();
