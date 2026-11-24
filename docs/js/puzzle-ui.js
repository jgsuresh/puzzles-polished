// UI layer for a puzzle page. Upstream's (patched) Emscripten glue owns the
// canvas, the game menu wiring and the dialogs; this file adds everything
// modern around it: menus that work on touch, dark mode, real touch input,
// on-screen keys, a win celebration and robust resizing.
(function () {
  'use strict';

  var CFG = window.STG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Palette ----------
     The engines hard-code a fairly garish palette (pure blue, neon green,
     black). Every colour they announce passes through here: saturated colours
     are softened and nudged toward nicer hues, and black becomes a soft ink.
     Colour 0 is the background (comes from our CSS) and neutrals derived from
     it are left alone, so highlights and shadows stay consistent. */
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var a = s * Math.min(l, 1 - l);
    var f = function (n) {
      var k = (n + h / 30) % 12;
      var c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return ('0' + Math.round(c * 255).toString(16)).slice(-2);
    };
    return '#' + f(0) + f(8) + f(4);
  }
  window.stgRecolour = function (index, colour) {
    var out = baseRecolour(index, colour);
    // A skin may then override individual palette slots outright.
    var sk = window.stgSkin;
    return sk && sk.palette ? (sk.palette(index, out) || out) : out;
  };
  function baseRecolour(index, colour) {
    if (index === 0) return colour;
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
    if (!m) return colour;
    var hsl = rgb2hsl(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (s < 0.15) return l < 0.1 ? '#232a3d' : colour;
    var s2 = s * 0.78, l2 = l, h2 = h;
    if (h >= 45 && h < 75) { h2 = h - 12; l2 = l * 0.96; }                 // yellow -> amber
    else if (h >= 75 && h < 170) { h2 = h + (h > 100 ? 22 : 5); l2 = l * 0.82; } // neon green -> emerald
    else if (h >= 170 && h < 200) { l2 = l * 0.88; }                       // cyan -> teal
    else if (h >= 200 && h < 265) { h2 = h + 8; }                          // blue -> indigo-ish
    return hsl2hex(h2, s2, l2);
  }

  /* ---------- Toasts ---------- */
  function toast(text, cls) {
    var host = $('#toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = text;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }
  window.stgError = function (msg) {
    if (/setPointerCapture/.test(msg)) return; // harmless: stale/synthetic pointer
    var apology = $('#apology');
    // A failure before the puzzle appeared means WASM didn't start.
    if (apology && apology.style.display !== 'none') {
      apology.classList.add('failed');
      var f = $('.apology-failed', apology);
      if (f) f.hidden = false;
    }
    toast(msg, 'error');
    console.error(msg);
  };

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('stg-theme', t); } catch (e) {}
    var m = $('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#0f1320' : '#f4f1ea';
  }
  applyTheme(document.documentElement.dataset.theme || 'light');
  $('#theme-btn').addEventListener('click', function () {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Menus ---------- */
  function closeMenus(except) {
    $$('.menu.open').forEach(function (m) {
      if (m === except) return;
      m.classList.remove('open');
      var t = $('.menu-trigger', m);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (e) {
    var trig = e.target.closest('.menu-trigger');
    if (trig) {
      var menu = trig.closest('.menu');
      closeMenus(menu);
      var open = menu.classList.toggle('open');
      trig.setAttribute('aria-expanded', String(open));
      return;
    }
    var inPopup = e.target.closest('.popup');
    if (!inPopup) { closeMenus(); return; }

    // Nested submenu headers in the Type menu act as accordions.
    var head = e.target.closest('#gametype li > div');
    if (head && !e.target.closest('#gametype li > div > ul')) {
      head.parentElement.classList.toggle('open');
      return;
    }
    // Choosing an item closes the menu.
    if (e.target.closest('button, a.menu-link, input.tick')) closeMenus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenus();
  });

  // Copy-link items
  ['permalink-desc', 'permalink-seed'].forEach(function (id) {
    var a = document.getElementById(id);
    if (!a) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var url = location.href.split('#')[0] + (a.getAttribute('href') || '');
      var done = function () { toast('Link copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { location.hash = a.getAttribute('href'); });
      } else {
        location.hash = a.getAttribute('href');
      }
    });
  });

  /* ---------- Help dialog ---------- */
  var help = $('#help');
  $('#help-btn').addEventListener('click', function () { help.showModal(); });
  $('#help-close').addEventListener('click', function () { help.close(); });
  help.addEventListener('click', function (e) { if (e.target === help) help.close(); });

  /* ---------- Once the puzzle is up ---------- */
  window.stgOnReady = function () {
    // #puzzle is laid out (so the engine can measure its container) but
    // invisible until now; a 0x0 container makes some engines throw.
    $('#puzzle').style.visibility = 'visible';
    var canvas = $('#puzzlecanvas');
    var api = window.stgApi || {};
    var coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    /* Keep the game fitted to its container, however the layout changes
       (rotation, keypad appearing, soft keyboards, split-screen...). */
    var rescale = Module.cwrap('rescale_puzzle', 'void', []);
    var raf = 0;
    new ResizeObserver(function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { rescale(); });
    }).observe($('#puzzlecanvascontain'));

    /* Refocus the canvas after using the dock so keyboard play continues. */
    $('.dock').addEventListener('click', function () {
      setTimeout(function () {
        if (!document.getElementById('dlgform')) canvas.focus({ preventScroll: true });
      }, 0);
    });

    /* ---- Touch / pen input ----
       The upstream glue only listens for mouse events, which touch devices
       synthesise on tap but never for drags, and never as right-clicks. */
    var tapButton = 0;
    var BUTTONS = { left: 0, middle: 1, right: 2 };
    var activeTouch = null;
    function coords(e) {
      return canvas_mouse_coords(e, canvas); // from upstream glue (patched to use client coords)
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || !api.mousedown) return;
      e.preventDefault(); // suppresses the synthesised mouse events
      if (activeTouch !== null) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      var p = coords(e);
      activeTouch = { id: e.pointerId, button: tapButton };
      api.mousedown(p.x, p.y, tapButton);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!activeTouch || e.pointerId !== activeTouch.id) return;
      var p = coords(e);
      api.mousemove(p.x, p.y, 1 << activeTouch.button);
    });
    function endTouch(e) {
      if (!activeTouch || e.pointerId !== activeTouch.id) return;
      var p = coords(e);
      api.mouseup(p.x, p.y, activeTouch.button);
      activeTouch = null;
    }
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);

    /* ---- Touch aids ---- */
    var aids = $('#aids');
    var modes = CFG.modes || ['left', 'right'];
    if (coarse && modes.length > 1) {
      var LABELS = { left: 'Left click', right: 'Right click', middle: 'Middle click' };
      var wrap = $('#tapmodes');
      modes.forEach(function (m, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(i === 0));
        b.textContent = LABELS[m];
        b.addEventListener('click', function () {
          tapButton = BUTTONS[m];
          $$('button', wrap).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        });
        wrap.appendChild(b);
      });
      wrap.hidden = false;
      aids.hidden = false;
    }

    function sendKey(key) {
      if (!api.key) return;
      var code = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
      api.key(code, key, key.length === 1 ? key : undefined, 0, 0, 0);
    }
    function keyButton(parent, label, key, extraClass, aria) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (extraClass) b.className = extraClass;
      if (aria) b.setAttribute('aria-label', aria);
      // Don't steal focus (and don't summon a soft keyboard).
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { sendKey(key); });
      parent.appendChild(b);
      return b;
    }

    if (coarse && CFG.keypad) {
      var pad = $('#keypad');
      aids.hidden = false;
      pad.hidden = false;
      if (CFG.keypad === 'digits') {
        var digitBtns = [];
        for (var d = 1; d <= 9; d++) digitBtns.push(keyButton(pad, String(d), String(d), 'digit'));
        var gap = document.createElement('span'); gap.className = 'gap'; pad.appendChild(gap);
        if (CFG.pencil) keyButton(pad, '✎ Pencil', 'm', '', 'Toggle pencil marks');
        keyButton(pad, '⌫', 'Backspace', '', 'Clear cell');
        // Only offer the digits the current grid size uses.
        var sync = function () {
          var checked = $('#gametype input.tick:checked');
          var label = checked ? checked.parentElement.textContent.trim() : '';
          var m = label.match(/(\d+)\s*x\s*(\d+)/i);
          var n = 9;
          if (m) n = (CFG.name === 'solo' && !/jigsaw/i.test(label)) ? (+m[1]) * (+m[2]) : +m[1];
          n = Math.max(1, Math.min(9, n));
          digitBtns.forEach(function (b, i) { b.hidden = i >= n; });
        };
        $('#gamemenu').addEventListener('click', function () { setTimeout(sync, 50); });
        sync();
      } else if (CFG.keypad === 'undead') {
        keyButton(pad, 'Ghost', 'g'); keyButton(pad, 'Vampire', 'v'); keyButton(pad, 'Zombie', 'z');
        keyButton(pad, '⌫', 'Backspace', '', 'Clear');
      } else if (CFG.keypad === 'dpad') {
        pad.classList.add('dpad');
        // Cube and Inertia move in 8 directions; the corners use the numpad keys.
        var cells = [
          ['↖', 'Home'], ['↑', 'ArrowUp'], ['↗', 'PageUp'],
          ['←', 'ArrowLeft'], null, ['→', 'ArrowRight'],
          ['↙', 'End'], ['↓', 'ArrowDown'], ['↘', 'PageDown'],
        ];
        cells.forEach(function (c) {
          if (!c) { var s = document.createElement('span'); s.className = 'blank'; pad.appendChild(s); return; }
          keyButton(pad, c[0], c[1]);
        });
      }
    }

    /* ---- Win detection (status bar says COMPLETED!) ---- */
    var status = $('#statusbar');
    if (status) {
      var wasSolved = false;
      new MutationObserver(function () {
        var solved = /COMPLETED/i.test(status.textContent);
        status.classList.toggle('solved', solved);
        canvas.classList.toggle('solved', solved);
        if (solved && !wasSolved) celebrate();
        wasSolved = solved;
      }).observe(status, { childList: true, characterData: true, subtree: true });
    }
  };

  function celebrate() {
    toast('Solved! 🎉', 'win');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var colours = ['#4f46e5', '#f59e0b', '#16a34a', '#ec4899', '#06b6d4', '#ef4444'];
    for (var i = 0; i < 70; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colours[i % colours.length];
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  }
})();
