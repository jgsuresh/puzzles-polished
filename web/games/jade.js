// Jade (Mark Thompson): on a hex board either player may drop a white OR a black stone each turn.
// Cross wins with one group (either colour) touching all four edges.
// Parallel wins by joining the same pair of opposite edges with a white chain AND a black chain.
import { h } from './core.js';
import { hexXY, hexVerts, pts, boundsOf, DIRS } from './hexgeom.js';

const cache = new Map();
function topo(W, H) {
  const key = W + 'x' + H;
  if (cache.has(key)) return cache.get(key);
  const nb = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const l = [];
    for (const [dq, dr] of DIRS) {
      const cc = c + dq, rr = r + dr;
      if (cc >= 0 && cc < W && rr >= 0 && rr < H) l.push(rr * W + cc);
    }
    nb.push(l);
  }
  cache.set(key, nb);
  return nb;
}

// Edge flags per group of colour v: 1 top, 2 bottom, 4 left, 8 right.
function groupEdges(b, W, H, v) {
  const nb = topo(W, H), seen = new Uint8Array(b.length), res = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== v || seen[i]) continue;
    let m = 0;
    const st = [i], cells = [i];
    seen[i] = 1;
    while (st.length) {
      const k = st.pop(), x = k % W, y = (k / W) | 0;
      if (y === 0) m |= 1;
      if (y === H - 1) m |= 2;
      if (x === 0) m |= 4;
      if (x === W - 1) m |= 8;
      for (const j of nb[k]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); cells.push(j); }
    }
    res.push({ m, cells });
  }
  return res;
}

// Returns {cross, parallel} booleans for the position.
export function judge(b, W, H, wantCells) {
  const white = groupEdges(b, W, H, 1), black = groupEdges(b, W, H, 2);
  const cross = white.some((g) => g.m === 15) || black.some((g) => g.m === 15);
  const joins = (list, bits) => list.some((g) => (g.m & bits) === bits);
  const parallel = (joins(white, 3) && joins(black, 3)) || (joins(white, 12) && joins(black, 12));
  if (wantCells) return { cross, parallel, white, black };
  return { cross, parallel };
}

export default {
  name: 'jade',
  players: [{ name: 'Cross' }, { name: 'Parallel' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'size', label: 'Board', def: '9x7', choices: [{ v: '7x5', label: 'Small 7 × 5' }, { v: '9x7', label: 'Medium 9 × 7' }, { v: '11x9', label: 'Standard 11 × 9' }] },
  ],

  init({ size }) {
    const [W, H] = size.split('x').map(Number);
    return { W, H, b: new Uint8Array(W * H), turn: 0, last: -1, won: -1 };
  },
  // A move is [cell, colour] with colour 1 = white, 2 = black.
  moves(s) {
    const m = [];
    for (let i = 0; i < s.b.length; i++) if (!s.b[i]) { m.push([i, 1]); m.push([i, 2]); }
    return m;
  },
  apply(s, [i, col]) {
    const b = s.b.slice();
    b[i] = col;
    const { cross, parallel } = judge(b, s.W, s.H);
    // Either goal can be completed by either player's stone; if both at once, the mover wins.
    let won = -1;
    if (cross && parallel) won = s.turn;
    else if (cross) won = 0;
    else if (parallel) won = 1;
    return { ...s, b, turn: 1 - s.turn, last: i, won };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    if (!s.b.includes(0)) return { winner: -1 };
    return null;
  },

  winInfo(s, res) {
    const j = judge(s.b, s.W, s.H, true), cells = [];
    const pick = (list, bits) => list.filter((g) => (g.m & bits) === bits).forEach((g) => cells.push(...g.cells));
    // Cross's group, or Parallel's two chains; if both goals are met show the mover's.
    const crossFirst = j.cross && (!j.parallel || res.winner === 0);
    if (crossFirst) { pick(j.white, 15); pick(j.black, 15); }
    else { pick(j.white, 3); pick(j.black, 3); pick(j.white, 12); pick(j.black, 12); }
    return cells.length ? { cells: [...new Set(cells)] } : null;
  },

  newUi() { return { cell: -1, col: 1 }; },
  partial(ui) { return ui.cell >= 0; },
  pendingMove(s, ui) { return ui.cell >= 0 ? [ui.cell, ui.col] : null; },
  status(s, ui) {
    const who = this.players[s.turn].name;
    if (ui.cell < 0) return `${who}: pick a square, then a stone colour`;
    return `${who}: ${ui.col === 1 ? 'white' : 'black'} stone — tap it again to switch colour`;
  },
  tap(s, ui, c) {
    const i = +c;
    if (s.b[i]) return null;
    if (ui.cell === i) ui.col = 3 - ui.col;
    else ui.cell = i;
    return { redraw: true };
  },

  render({ svg, s, ui }) {
    const { W, H } = s;
    svg.replaceChildren();
    const pos = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) pos.push(hexXY(c, r));
    const [x, y, w, hh] = boundsOf(pos, 1.5);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    // All four edges matter to both players, so they share one neutral colour.
    for (let k = 0; k < W; k++) {
      const top = hexVerts(...pos[k]), bot = hexVerts(...pos[(H - 1) * W + k]);
      h('polyline', { points: pts([top[4], top[5], top[0]].map((p) => [p[0], p[1] - 0.12])), class: 'bd-edge neutral', fill: 'none' }, svg);
      h('polyline', { points: pts([bot[3], bot[2], bot[1]].map((p) => [p[0], p[1] + 0.12])), class: 'bd-edge neutral', fill: 'none' }, svg);
    }
    for (let k = 0; k < H; k++) {
      const left = hexVerts(...pos[k * W]), right = hexVerts(...pos[k * W + W - 1]);
      h('polyline', { points: pts([left[3], left[4]].map((p) => [p[0] - 0.12, p[1]])), class: 'bd-edge neutral', fill: 'none' }, svg);
      h('polyline', { points: pts([right[0], right[1]].map((p) => [p[0] + 0.12, p[1]])), class: 'bd-edge neutral', fill: 'none' }, svg);
    }
    for (let i = 0; i < W * H; i++) {
      const [cx, cy] = pos[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('polygon', { points: pts(hexVerts(cx, cy, 0.97)), class: 'hexcell' }, g);
      if (s.b[i]) {
        h('circle', { cx, cy, r: 0.62, class: `stone ${s.b[i] === 1 ? 'gs1' : 'gs0'}` }, g);
        if (i === s.last) h('circle', { cx, cy, r: 0.17, class: 'last-dot' }, g);
      } else if (i === ui.cell) {
        h('circle', { cx, cy, r: 0.62, class: `stone ${ui.col === 1 ? 'gs1' : 'gs0'} preview` }, g);
      }
    }
  },
};
