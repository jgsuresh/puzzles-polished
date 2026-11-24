// Hex: Red joins top to bottom, Blue joins left to right. No draws are possible.
import { h } from './core.js?v=fece9af1';
import { hexXY, hexVerts, pts, boundsOf, DIRS } from './hexgeom.js?v=0ac8f1ce';

const nbCache = new Map();
function neighbours(n) {
  if (nbCache.has(n)) return nbCache.get(n);
  const nb = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const l = [];
    for (const [dq, dr] of DIRS) {
      const cc = c + dq, rr = r + dr;
      if (cc >= 0 && cc < n && rr >= 0 && rr < n) l.push(rr * n + cc);
    }
    nb.push(l);
  }
  nbCache.set(n, nb);
  return nb;
}

// Does `p` (0 = Red top/bottom, 1 = Blue left/right) have a connecting chain?
export function connected(b, n, p) {
  const nb = neighbours(n), v = p + 1;
  const seen = new Uint8Array(n * n), st = [];
  for (let k = 0; k < n; k++) {
    const i = p === 0 ? k : k * n;
    if (b[i] === v) { seen[i] = 1; st.push(i); }
  }
  while (st.length) {
    const i = st.pop();
    if (p === 0 ? i >= n * (n - 1) : i % n === n - 1) return true;
    for (const j of nb[i]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); }
  }
  return false;
}

export default {
  name: 'hex',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [7, 9, 11, 13].map((v) => ({ v, label: `${v} × ${v}` })) },
    { id: 'swap', label: 'Swap rule (pie rule)', def: 0, choices: [{ v: 0, label: 'Off' }, { v: 1, label: 'On — second player may swap after the first move' }] },
  ],

  init({ n, swap }) {
    return { n: +n, b: new Uint8Array(n * n), turn: 0, swapRule: !!+swap, swapAvail: false, moveCount: 0, last: -1 };
  },
  moves(s) {
    const m = [];
    for (let i = 0; i < s.b.length; i++) if (!s.b[i]) m.push(i);
    if (s.swapAvail) m.push('swap');
    return m;
  },
  apply(s, m) {
    const n = s.n, b = s.b.slice();
    if (m === 'swap') {
      const i = b.indexOf(1), r = Math.floor(i / n), c = i % n;
      b[i] = 0;
      const j = c * n + r;               // reflect across the long diagonal so the swap is fair
      b[j] = 2;
      return { ...s, b, turn: 0, swapAvail: false, last: j, moveCount: s.moveCount + 1, note: 'Swapped!' };
    }
    b[m] = s.turn + 1;
    return { ...s, b, turn: 1 - s.turn, swapAvail: s.swapRule && s.moveCount === 0, moveCount: s.moveCount + 1, last: m, note: '' };
  },
  result(s) {
    if (!s.moveCount) return null;
    const mover = 1 - s.turn;
    return connected(s.b, s.n, mover) ? { winner: mover } : null;
  },
  tap(s, ui, c) {
    const i = +c;
    return s.b[i] ? null : { move: i };
  },
  render({ svg, s, res }) {
    const n = s.n, S = 1;
    svg.replaceChildren();
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(hexXY(c, r));
    const [x, y, w, hh] = boundsOf(cells, 1.5);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    // Coloured goal edges.
    const edge = (p, list) => {
      h('polyline', { points: pts(list), class: `bd-edge p${p}`, fill: 'none' }, svg);
    };
    for (let k = 0; k < n; k++) {
      const top = hexVerts(...cells[k]), bot = hexVerts(...cells[(n - 1) * n + k]);
      const left = hexVerts(...cells[k * n]), right = hexVerts(...cells[k * n + n - 1]);
      edge(0, [top[4], top[5], top[0]].map((p) => [p[0], p[1] - 0.12]));
      edge(0, [bot[3], bot[2], bot[1]].map((p) => [p[0], p[1] + 0.12]));
      edge(1, [left[3], left[4]].map((p) => [p[0] - 0.12, p[1]]));
      edge(1, [right[0], right[1]].map((p) => [p[0] + 0.12, p[1]]));
    }
    for (let i = 0; i < n * n; i++) {
      const [cx, cy] = cells[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('polygon', { points: pts(hexVerts(cx, cy, S * 0.97)), class: 'hexcell' }, g);
      if (s.b[i]) {
        h('circle', { cx, cy, r: 0.62, class: `stone p${s.b[i] - 1}` }, g);
        if (i === s.last) h('circle', { cx, cy, r: 0.17, class: 'last-dot' }, g);
      }
    }
  },
};
