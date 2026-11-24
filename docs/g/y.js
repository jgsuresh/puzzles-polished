// Y: a triangular Hex board. Whoever links all three sides with one chain wins.
// No draws are possible, and the board is symmetric, so the swap rule just recolours.
import { h } from './core.js?v=fece9af1';
import { hexXY, hexVerts, pts, boundsOf } from './hexgeom.js?v=0ac8f1ce';

const cache = new Map();
function topo(n) {
  if (cache.has(n)) return cache.get(n);
  const idx = (r, c) => (r * (r + 1)) / 2 + c;
  const total = (n * (n + 1)) / 2, nb = [], side = new Uint8Array(total), rc = [];
  for (let r = 0; r < n; r++) for (let c = 0; c <= r; c++) {
    const l = [];
    for (const [rr, cc] of [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c], [r + 1, c + 1]]) {
      if (rr >= 0 && rr < n && cc >= 0 && cc <= rr) l.push(idx(rr, cc));
    }
    nb[idx(r, c)] = l;
    rc[idx(r, c)] = [r, c];
    side[idx(r, c)] = (c === 0 ? 1 : 0) | (c === r ? 2 : 0) | (r === n - 1 ? 4 : 0);
  }
  const t = { total, nb, side, rc, idx };
  cache.set(n, t);
  return t;
}

// Does player v (1 or 2) have a chain touching all three sides?
function hasY(b, n, v) {
  const { nb, side, total } = topo(n);
  const seen = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (b[i] !== v || seen[i]) continue;
    let mask = 0;
    const st = [i];
    seen[i] = 1;
    while (st.length) {
      const k = st.pop();
      mask |= side[k];
      if (mask === 7) return true;
      for (const j of nb[k]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); }
    }
  }
  return false;
}

export default {
  name: 'y',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [7, 9, 11, 13].map((v) => ({ v, label: `${v} rows` })) },
    { id: 'swap', label: 'Swap rule (pie rule)', def: 0, choices: [{ v: 0, label: 'Off' }, { v: 1, label: 'On — second player may swap after the first move' }] },
  ],

  init({ n, swap }) {
    return { n: +n, b: new Uint8Array(topo(+n).total), turn: 0, swapRule: !!+swap, swapAvail: false, moveCount: 0, last: -1 };
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
    return { ...s, b, turn: 1 - s.turn, swapAvail: s.swapRule && s.moveCount === 0, moveCount: s.moveCount + 1, last: m, note: '' };
  },
  result(s) {
    if (!s.moveCount) return null;
    const mover = 1 - s.turn;
    return hasY(s.b, s.n, mover + 1) ? { winner: mover } : null;
  },
  tap(s, ui, c) { return s.b[+c] ? null : { move: +c }; },
  render({ svg, s }) {
    const n = s.n, { total, rc } = topo(n);
    svg.replaceChildren();
    const pos = [];
    // hexXY(q, r) = (√3(q + r/2), 1.5r); we want x = √3(c - r/2), so q = c - r.
    for (let i = 0; i < total; i++) { const [r, c] = rc[i]; pos.push(hexXY(c - r, r)); }
    const [x, y, w, hh] = boundsOf(pos, 1.5);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    // Side markers: a soft line along each of the three sides.
    const sideLine = (cells, dx, dy, which) => {
      const p = [];
      for (const i of cells) p.push(...which(hexVerts(...pos[i])).map((q) => [q[0] + dx, q[1] + dy]));
      h('polyline', { points: pts(p), class: 'bd-edge neutral', fill: 'none' }, svg);
    };
    const { idx } = topo(n);
    const left = [], right = [], bottom = [];
    for (let r = 0; r < n; r++) { left.push(idx(r, 0)); right.push(idx(r, r)); }
    for (let c = 0; c < n; c++) bottom.push(idx(n - 1, c));
    sideLine(left, -0.12, 0, (v) => [v[5], v[4], v[3]]);
    sideLine(right, 0.12, 0, (v) => [v[5], v[0], v[1]]);
    sideLine(bottom, 0, 0.12, (v) => [v[3], v[2], v[1]]);
    for (let i = 0; i < total; i++) {
      const [cx, cy] = pos[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('polygon', { points: pts(hexVerts(cx, cy, 0.97)), class: 'hexcell' }, g);
      if (s.b[i]) {
        h('circle', { cx, cy, r: 0.62, class: `stone p${s.b[i] - 1}` }, g);
        if (i === s.last) h('circle', { cx, cy, r: 0.17, class: 'last-dot' }, g);
      }
    }
  },
};
