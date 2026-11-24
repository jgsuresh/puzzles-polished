// Havannah: win with a ring, a bridge (two corners) or a fork (three sides).
import { h } from './core.js?v=fece9af1';
import { hexXY, hexVerts, pts, boundsOf, DIRS } from './hexgeom.js?v=0ac8f1ce';

const cache = new Map();
function topo(side) {
  if (cache.has(side)) return cache.get(side);
  const R = side - 1, q = [], r = [], index = new Map();
  for (let rr = -R; rr <= R; rr++) for (let qq = -R; qq <= R; qq++) {
    if (Math.max(Math.abs(qq), Math.abs(rr), Math.abs(qq + rr)) <= R) { index.set(qq + ',' + rr, q.length); q.push(qq); r.push(rr); }
  }
  const total = q.length, nb = [], border = new Uint8Array(total), cornerId = new Int8Array(total).fill(-1), sideBit = new Uint8Array(total);
  const corners = [];
  for (let i = 0; i < total; i++) {
    nb[i] = DIRS.map(([dq, dr]) => index.get(q[i] + dq + ',' + (r[i] + dr))).filter((v) => v !== undefined);
    const x = q[i], z = r[i], y = -x - z;
    const conds = [x === R, x === -R, y === R, y === -R, z === R, z === -R];
    const cnt = conds.filter(Boolean).length;
    if (cnt >= 1) border[i] = 1;
    if (cnt >= 2) { cornerId[i] = corners.length; corners.push(i); }
    else if (cnt === 1) sideBit[i] = 1 << conds.indexOf(true);
  }
  const t = { R, total, q, r, nb, border, cornerId, sideBit, corners };
  cache.set(side, t);
  return t;
}

const popcount = (v) => { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; };

// Which win (if any) does player v (1/2) have on b? Returns 'ring' | 'bridge' | 'fork' | null.
export function winKind(b, side, v) {
  const { total, nb, border, cornerId, sideBit } = topo(side);
  const seen = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (b[i] !== v || seen[i]) continue;
    let corners = 0, sides = 0;
    const st = [i];
    seen[i] = 1;
    while (st.length) {
      const k = st.pop();
      if (cornerId[k] >= 0) corners |= 1 << cornerId[k];
      sides |= sideBit[k];
      for (const j of nb[k]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); }
    }
    if (popcount(corners) >= 2) return 'bridge';
    if (popcount(sides) >= 3) return 'fork';
  }
  // Ring: some region of non-v cells that cannot reach the board's edge is enclosed.
  const seen2 = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (b[i] === v || seen2[i]) continue;
    let open = false;
    const st = [i];
    seen2[i] = 1;
    while (st.length) {
      const k = st.pop();
      if (border[k]) open = true;
      for (const j of nb[k]) if (!seen2[j] && b[j] !== v) { seen2[j] = 1; st.push(j); }
    }
    if (!open) return 'ring';
  }
  return null;
}

export default {
  name: 'havannah',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 6, choices: [{ v: 5, label: 'Small (5 per side)' }, { v: 6, label: 'Medium (6 per side)' }, { v: 8, label: 'Large (8 per side)' }] },
    { id: 'swap', label: 'Swap rule (pie rule)', def: 0, choices: [{ v: 0, label: 'Off' }, { v: 1, label: 'On — second player may swap after the first move' }] },
  ],

  init({ n, swap }) {
    return { n: +n, b: new Uint8Array(topo(+n).total), turn: 0, swapRule: !!+swap, swapAvail: false, moveCount: 0, last: -1, kind: null };
  },
  moves(s) {
    const m = [];
    for (let i = 0; i < s.b.length; i++) if (!s.b[i]) m.push(i);
    if (s.swapAvail) m.push('swap');
    return m;
  },
  apply(s, m) {
    const b = s.b.slice();
    if (m === 'swap') {
      const i = b.indexOf(1);
      b[i] = 2;
      return { ...s, b, turn: 0, swapAvail: false, last: i, moveCount: s.moveCount + 1, note: 'Swapped!' };
    }
    b[m] = s.turn + 1;
    const ns = { ...s, b, turn: 1 - s.turn, swapAvail: s.swapRule && s.moveCount === 0, moveCount: s.moveCount + 1, last: m, note: '' };
    ns.kind = winKind(b, s.n, s.turn + 1);
    return ns;
  },
  result(s) {
    if (s.kind) return { winner: 1 - s.turn, how: s.kind };
    if (s.moveCount && !s.b.includes(0)) return { winner: -1 };
    return null;
  },
  status(s) {
    return s.note || '';
  },

  tap(s, ui, c) { return s.b[+c] ? null : { move: +c }; },
  render({ svg, s, res }) {
    const T = topo(s.n);
    svg.replaceChildren();
    const pos = T.q.map((q, i) => hexXY(q, T.r[i]));
    const [x, y, w, hh] = boundsOf(pos, 1.4);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    for (let i = 0; i < T.total; i++) {
      const [cx, cy] = pos[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('polygon', { points: pts(hexVerts(cx, cy, 0.97)), class: 'hexcell' + (T.cornerId[i] >= 0 ? ' corner' : T.sideBit[i] ? ' side' : '') }, g);
      if (T.cornerId[i] >= 0 && !s.b[i]) h('circle', { cx, cy, r: 0.22, class: 'corner-dot' }, g);
      if (s.b[i]) {
        h('circle', { cx, cy, r: 0.62, class: `stone p${s.b[i] - 1}` }, g);
        if (i === s.last) h('circle', { cx, cy, r: 0.17, class: 'last-dot' }, g);
      }
    }
  },
};
