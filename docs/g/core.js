// Shared pieces for the two-player (pass-and-play) games: SVG helper and the page
// shell (new-game dialog, undo, turn banner, confirm-before-commit).
//
// A game is a plain object:
//   name, players [{name},{name}], colors {light:[c0,c1], dark:[c0,c1]}   -> CSS vars --p0 / --p1
//   options   [{id,label,choices:[{v,label}],def}]                         (board size etc.)
//   init(opts) -> state        state.turn is 0 or 1; states are treated as immutable
//   moves(s)   -> array        legal moves, JSON-able; 'swap' / 'pass' are strings (used for tests + passes)
//   apply(s,m) -> new state    sets s.last to whatever render wants to highlight
//   result(s)  -> null | {winner: 0|1|-1}   -1 = draw
//   render({svg,s,ui,res,theme}), tap(s,ui,c) -> {move} | {redraw:true} | null, newUi()
//   status(s,ui) -> optional text replacing "<Name> to move"
//   winInfo(s,res) -> optional {path:[cell..], cells:[cell..], lose:[cell..]}: what to light up on the win screen.
//        path = ordered cells joined by a drawn line (a chain from A to B); cells = a group to ring;
//        lose = cells to mark as the loser's (e.g. trapped queens).

export const NS = 'http://www.w3.org/2000/svg';
export function h(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export function mountGame(def) {
  const $ = (s) => document.querySelector(s);
  const svg = $('#boardsvg'), statusEl = $('#statusbar');
  const undoBtn = $('#undo'), swapBtn = $('#swap'), okBtn = $('#confirm'), passBtn = $('#pass');
  const KEY = 'stg-g-' + def.name;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const defaults = {};
  (def.options || []).forEach((o) => { defaults[o.id] = o.def; });
  const cfg = { confirm: saved.confirm ?? 1, opts: { ...defaults, ...(saved.opts || {}) } };
  (def.options || []).forEach((o) => { if (!o.choices.some((c) => String(c.v) === String(cfg.opts[o.id]))) cfg.opts[o.id] = o.def; });

  let s, ui, hist = [], pending = null, gen = 0;
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const newUi = () => (def.newUi ? def.newUi() : {});

  function applyTheme() {
    const col = def.colors[theme()];
    const r = document.documentElement.style;
    r.setProperty('--p0', col[0]);
    r.setProperty('--p1', col[1]);
    const ink = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150 ? '#1b1f2a' : '#ffffff'; };
    r.setProperty('--p0-ink', ink(col[0]));
    r.setProperty('--p1-ink', ink(col[1]));
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = theme() === 'dark' ? '#0f1320' : '#f4f1ea';
  }

  // A move waiting for Confirm: either a previewed square, or one the game itself has assembled.
  const confirmable = () => (pending !== null ? pending : (def.pendingMove ? def.pendingMove(s, ui) : null));

  function banner(res) {
    if (res) return res.text || (res.winner < 0 ? 'Draw!' : `${def.players[res.winner].name} wins!`);
    if (pending !== null) return `${def.players[s.turn].name}: tap Confirm`;
    const extra = def.status ? def.status(s, ui) : '';
    return extra || `${def.players[s.turn].name} to move`;
  }

  // Win screen: dim the board, ring the winning cells and draw the winning line from A to B.
  function showWin(res) {
    svg.classList.toggle('won', !!res);
    if (!res || !def.winInfo || res.winner < 0) return;
    let info = null;
    try { info = def.winInfo(s, res); } catch (e) { console.error(e); }
    if (!info) return;
    const centre = (c) => {
      const g = svg.querySelector(`[data-c="${c}"]`);
      if (!g) return null;
      const b = g.getBBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.min(b.width, b.height) * 0.46 };
    };
    const ring = (c, cls) => {
      const g = svg.querySelector(`[data-c="${c}"]`), p = centre(c);
      if (!g || !p) return;
      if (cls === 'win') g.classList.add('win');
      h('circle', { cx: p.x, cy: p.y, r: p.r, class: cls === 'win' ? 'win-ring' : 'lose-ring', 'pointer-events': 'none' }, svg);
    };
    (info.cells || []).forEach((c) => ring(c, 'win'));
    (info.path || []).forEach((c) => { const g = svg.querySelector(`[data-c="${c}"]`); if (g) g.classList.add('win'); });
    (info.lose || []).forEach((c) => ring(c, 'lose'));
    const pts = (info.path || []).map(centre).filter(Boolean);
    if (pts.length >= 2) {
      const d = pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
      h('polyline', { points: d, class: 'win-line halo', pathLength: 1, 'pointer-events': 'none' }, svg);
      h('polyline', { points: d, class: 'win-line', pathLength: 1, 'pointer-events': 'none' }, svg);
      const a = pts[0], z = pts[pts.length - 1];
      h('circle', { cx: a.x, cy: a.y, r: 0.2, class: 'win-end', 'pointer-events': 'none' }, svg);
      h('circle', { cx: z.x, cy: z.y, r: 0.2, class: 'win-end', 'pointer-events': 'none' }, svg);
    }
  }

  function draw() {
    const res = def.result(s);
    def.render({ svg, s, ui, res, theme: theme() });
    showWin(res);
    if (pending !== null) {
      const t = svg.querySelector(`[data-c="${pending}"]`);
      if (t) t.classList.add('pending');
    }
    statusEl.textContent = banner(res);
    statusEl.className = res ? (res.winner < 0 ? 'draw' : `turn${res.winner} over`) : `turn${s.turn}`;
    if (s.note && !res) statusEl.title = s.note;
    undoBtn.disabled = hist.length === 0;
    swapBtn.hidden = !(s.swapAvail && !res);
    passBtn.hidden = !(def.canPass && !res);
    okBtn.hidden = !!res || confirmable() === null;
    document.body.classList.toggle('over', !!res);
    document.body.dataset.turn = s.turn;
  }

  function commit(m) {
    hist.push({ s, ui });
    s = def.apply(s, m);
    ui = newUi();
    pending = null;
    // A forced pass is played for the player who has no move.
    const note = [];
    while (!def.result(s)) {
      const ms = def.moves(s);
      if (ms.length === 1 && ms[0] === 'pass') { note.push(def.players[s.turn].name); hist.push({ s, ui }); s = def.apply(s, 'pass'); } else break;
    }
    if (note.length) s = { ...s, note: `${note.join(' and ')} had no move and passed.` };
    draw();
    if (note.length) toast(s.note);
  }

  function newGame() {
    gen++;
    s = def.init(cfg.opts);
    ui = newUi();
    hist = [];
    pending = null;
    draw();
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  svg.addEventListener('click', (e) => {
    if (def.result(s)) return;
    const t = e.target.closest && e.target.closest('[data-c]');
    if (!t) return;
    const c = t.dataset.c;
    // Second tap on the highlighted square confirms it.
    if (pending !== null && c === String(pending)) { commit(+c); return; }
    const r = def.tap(s, ui, c);
    if (!r) return;
    if (r.move !== undefined) {
      if (cfg.confirm && typeof r.move === 'number') { pending = r.move; draw(); }
      else commit(r.move);
    } else if (r.redraw) { pending = null; draw(); }
  });
  okBtn.addEventListener('click', () => { const m = confirmable(); if (m !== null) commit(m); });

  undoBtn.addEventListener('click', () => {
    if (pending !== null || (def.partial && def.partial(ui))) { pending = null; ui = newUi(); draw(); return; }   // first undo just clears a half-made move
    if (!hist.length) return;
    // Step back over any automatic passes.
    do { ({ s, ui } = hist.pop()); } while (hist.length && def.moves(s).length === 1 && def.moves(s)[0] === 'pass');
    draw();
  });
  swapBtn.addEventListener('click', () => commit('swap'));
  passBtn.addEventListener('click', () => commit('pass'));

  // ----- dialogs -----
  const dlg = $('#newgame'), form = $('#newgame-form');
  function sel(id, label, choices, cur) {
    return `<label class="field"><span>${label}</span><select name="${id}">` +
      choices.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`).join('') +
      '</select></label>';
  }
  function openNew() {
    const rows = (def.options || []).map((o) => sel('o:' + o.id, o.label, o.choices.map((c) => [c.v, c.label]), cfg.opts[o.id]));
    rows.push(sel('confirm', 'Confirm each move', [[1, 'On — tap, then Confirm (safe for passing the phone)'], [0, 'Off — a tap plays immediately']], cfg.confirm));
    $('#newgame-fields').innerHTML = rows.join('');
    dlg.showModal();
  }
  $('#newgame-btn').addEventListener('click', openNew);
  $('#new').addEventListener('click', openNew);
  $('#newgame-cancel').addEventListener('click', () => dlg.close());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    cfg.confirm = +fd.get('confirm');
    (def.options || []).forEach((o) => {
      const ch = o.choices.find((c) => String(c.v) === fd.get('o:' + o.id));
      cfg.opts[o.id] = ch ? ch.v : o.def;
    });
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (err) {}
    dlg.close();
    newGame();
  });
  const help = $('#help');
  $('#help-btn').addEventListener('click', () => help.showModal());
  $('#help-close').addEventListener('click', () => help.close());
  help.addEventListener('click', (e) => { if (e.target === help) help.close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  $('#theme-btn').addEventListener('click', () => {
    const t = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('stg-theme', t); } catch (e) {}
    applyTheme();
    draw();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('dialog')) return;
    if ((e.key === 'u' || e.key === 'z') && !undoBtn.disabled) undoBtn.click();
    if (e.key === 'Enter' && !okBtn.hidden) okBtn.click();
  });

  applyTheme();
  newGame();
  document.getElementById('apology')?.remove();
  window.stgGame = { def, get state() { return s; }, cfg, newGame, commit };
}
