// Nex (João Pedro Neto): Hex with shared neutral stones. Each turn you either
//   (a) drop one stone of your colour and one neutral stone on two empty cells, or
//   (b) turn two neutral stones into yours and one of your stones into a neutral.
// Red joins top to bottom, Blue joins left to right.
import { h } from './core.js';
import { hexXY, hexVerts, pts, boundsOf, DIRS } from './hexgeom.js';

const cache = new Map();
function neighbours(n) {
  if (cache.has(n)) return cache.get(n);
  const nb = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const l = [];
    for (const [dq, dr] of DIRS) {
      const cc = c + dq, rr = r + dr;
      if (cc >= 0 && cc < n && rr >= 0 && rr < n) l.push(rr * n + cc);
    }
    nb.push(l);
  }
  cache.set(n, nb);
  return nb;
}
const NEUTRAL = 3;

function connected(b, n, p) {          // p: 0 = Red (top-bottom), 1 = Blue (left-right)
  const nb = neighbours(n), v = p + 1, seen = new Uint8Array(n * n), st = [];
  for (let k = 0; k < n; k++) { const i = p === 0 ? k : k * n; if (b[i] === v) { seen[i] = 1; st.push(i); } }
  while (st.length) {
    const i = st.pop();
    if (p === 0 ? i >= n * (n - 1) : i % n === n - 1) return true;
    for (const j of nb[i]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); }
  }
  return false;
}

const cells = (b, v) => { const o = []; for (let i = 0; i < b.length; i++) if (b[i] === v) o.push(i); return o; };

// Endgame convention: when no ordinary move exists, a single stone is placed or converted.
// Returns that cell, or -1 when ordinary moves exist (or the board is finished).
function singleCell(s) {
  const E = cells(s.b, 0), N = cells(s.b, NEUTRAL), F = cells(s.b, s.turn + 1);
  if (E.length >= 2 || (N.length >= 2 && F.length >= 1)) return -1;
  if (E.length === 1) return E[0];
  if (E.length === 0 && N.length === 1) return N[0];
  return -1;
}
const hasMove = (s) => {
  const E = cells(s.b, 0).length, N = cells(s.b, NEUTRAL).length, F = cells(s.b, s.turn + 1).length;
  return E >= 2 || (N >= 2 && F >= 1) || singleCell(s) >= 0;
};

export default {
  name: 'nex',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [7, 9, 11].map((v) => ({ v, label: `${v} × ${v}` })) },
  ],

  init({ n }) { return { n: +n, b: new Uint8Array(n * n), turn: 0, last: [], won: -1 }; },

  // Moves: [a, b]            friendly on a, neutral on b
  //        [n1, n2, f]       neutrals n1,n2 become friendly; friendly f becomes neutral
  //        [x]               end-of-game conventions when the board is nearly full
  moves(s) {
    const E = cells(s.b, 0), N = cells(s.b, NEUTRAL), F = cells(s.b, s.turn + 1), m = [];
    if (E.length >= 2) for (const a of E) for (const c of E) if (a !== c) m.push([a, c]);
    if (N.length >= 2) for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) for (const f of F) m.push([N[i], N[j], f]);
    if (!m.length) {
      if (E.length === 1) m.push([E[0]]);
      else if (E.length === 0 && N.length === 1) m.push([N[0]]);
    }
    return m;
  },
  apply(s, mv) {
    const b = s.b.slice(), v = s.turn + 1;
    if (mv.length === 2) { b[mv[0]] = v; b[mv[1]] = NEUTRAL; }
    else if (mv.length === 3) { b[mv[0]] = v; b[mv[1]] = v; b[mv[2]] = NEUTRAL; }
    else b[mv[0]] = v;
    const won = connected(b, s.n, s.turn) ? s.turn : connected(b, s.n, 1 - s.turn) ? 1 - s.turn : -1;
    return { ...s, b, turn: 1 - s.turn, last: mv, won };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    if (!hasMove(s)) return { winner: 1 - s.turn };
    return null;
  },

  newUi() { return { a: -1, neu: [] }; },
  partial(ui) { return ui.a >= 0 || ui.neu.length > 0; },
  status(s, ui) {
    const who = this.players[s.turn].name;
    if (ui.a >= 0) return `${who}: now tap an empty cell for the neutral stone`;
    if (ui.neu.length === 1) return `${who}: tap a second neutral stone`;
    if (ui.neu.length === 2) return `${who}: tap one of your stones to turn neutral`;
    return `${who}: tap an empty cell, or two neutral stones`;
  },
  tap(s, ui, c) {
    const i = +c, v = s.b[i], me = s.turn + 1;
    if (singleCell(s) === i) return { move: [i] };
    if (v === 0) {
      if (ui.neu.length) return null;
      if (ui.a < 0) { ui.a = i; return { redraw: true }; }
      if (ui.a === i) { ui.a = -1; return { redraw: true }; }
      return { move: [ui.a, i] };
    }
    if (v === NEUTRAL && ui.a < 0) {
      const at = ui.neu.indexOf(i);
      if (at >= 0) { ui.neu.splice(at, 1); return { redraw: true }; }
      if (ui.neu.length < 2) { ui.neu.push(i); return { redraw: true }; }
      return null;
    }
    if (v === me && ui.neu.length === 2) return { move: [ui.neu[0], ui.neu[1], i] };
    return null;
  },

  render({ svg, s, ui }) {
    const n = s.n;
    svg.replaceChildren();
    const pos = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos.push(hexXY(c, r));
    const [x, y, w, hh] = boundsOf(pos, 1.5);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    for (let k = 0; k < n; k++) {
      const top = hexVerts(...pos[k]), bot = hexVerts(...pos[(n - 1) * n + k]);
      const left = hexVerts(...pos[k * n]), right = hexVerts(...pos[k * n + n - 1]);
      const edge = (p, l) => h('polyline', { points: pts(l), class: `bd-edge p${p}`, fill: 'none' }, svg);
      edge(0, [top[4], top[5], top[0]].map((p) => [p[0], p[1] - 0.12]));
      edge(0, [bot[3], bot[2], bot[1]].map((p) => [p[0], p[1] + 0.12]));
      edge(1, [left[3], left[4]].map((p) => [p[0] - 0.12, p[1]]));
      edge(1, [right[0], right[1]].map((p) => [p[0] + 0.12, p[1]]));
    }
    const lastSet = new Set(s.last || []);
    for (let i = 0; i < n * n; i++) {
      const [cx, cy] = pos[i];
      const v = s.b[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (v === 1 || v === 2 ? ' taken' : '') }, svg);
      h('polygon', { points: pts(hexVerts(cx, cy, 0.97)), class: 'hexcell' }, g);
      if (v) {
        h('circle', { cx: cx, cy: cy, r: 0.62, class: v === NEUTRAL ? 'stone neutral' : `stone p${v - 1}` + (ui.neu.includes(i) ? ' sel' : '') }, g);
        if (ui.neu.includes(i)) h('circle', { cx, cy, r: 0.78, class: 'sel-ring' }, g);
        if (lastSet.has(i)) h('circle', { cx, cy, r: 0.17, class: 'last-dot' }, g);
      } else if (i === ui.a) {
        h('circle', { cx, cy, r: 0.62, class: `stone p${s.turn}`, opacity: 0.55 }, g);
      }
    }
  },
};
