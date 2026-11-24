// Gomoku: first to get five (or more) in a row, horizontally, vertically or diagonally.
import { h } from './core.js?v=09554f26';

const D4 = [[1, 0], [0, 1], [1, 1], [1, -1]];

function fiveAt(b, n, i, v) {
  const x = i % n, y = Math.floor(i / n);
  for (const [dx, dy] of D4) {
    let c = 1;
    for (const sgn of [1, -1]) {
      let k = 1;
      while (true) {
        const xx = x + sgn * dx * k, yy = y + sgn * dy * k;
        if (xx < 0 || yy < 0 || xx >= n || yy >= n || b[yy * n + xx] !== v) break;
        c++; k++;
      }
    }
    if (c >= 5) return true;
  }
  return false;
}

export default {
  name: 'gomoku',
  players: [{ name: 'Black' }, { name: 'White' }],
  colors: { light: ['#1b1f2a', '#f6f3ea'], dark: ['#1b1f2a', '#f6f3ea'] },
  options: [
    { id: 'n', label: 'Board size', def: 15, choices: [13, 15, 19].map((v) => ({ v, label: `${v} × ${v}` })) },
  ],

  init({ n }) { return { n: +n, b: new Uint8Array(n * n), turn: 0, last: -1, count: 0, won: false }; },
  moves(s) {
    const m = [];
    for (let i = 0; i < s.b.length; i++) if (!s.b[i]) m.push(i);
    return m;
  },
  apply(s, m) {
    const b = s.b.slice();
    b[m] = s.turn + 1;
    return { ...s, b, turn: 1 - s.turn, last: m, count: s.count + 1, won: fiveAt(b, s.n, m, s.turn + 1) };
  },
  result(s) {
    if (s.won) return { winner: 1 - s.turn };
    return s.count === s.b.length ? { winner: -1 } : null;
  },
  winInfo(s, res) {
    if (!s.won) return null;
    const n = s.n, v = res.winner + 1, x0 = s.last % n, y0 = (s.last / n) | 0;
    for (const [dx, dy] of D4) {
      const cells = [s.last];
      for (let k = 1; ; k++) { const x = x0 - dx * k, y = y0 - dy * k; if (x < 0 || y < 0 || x >= n || y >= n || s.b[y * n + x] !== v) break; cells.unshift(y * n + x); }
      for (let k = 1; ; k++) { const x = x0 + dx * k, y = y0 + dy * k; if (x < 0 || y < 0 || x >= n || y >= n || s.b[y * n + x] !== v) break; cells.push(y * n + x); }
      if (cells.length >= 5) return { path: cells };
    }
    return null;
  },

  tap(s, ui, c) { return s.b[+c] ? null : { move: +c }; },
  render({ svg, s, res }) {
    const n = s.n, pad = 1.2;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${n - 1 + 2 * pad} ${n - 1 + 2 * pad}`);
    h('rect', { x: -pad, y: -pad, width: n - 1 + 2 * pad, height: n - 1 + 2 * pad, rx: 0.5, class: 'bd-wood' }, svg);
    for (let k = 0; k < n; k++) {
      h('line', { x1: 0, y1: k, x2: n - 1, y2: k, class: 'bd-line' }, svg);
      h('line', { x1: k, y1: 0, x2: k, y2: n - 1, class: 'bd-line' }, svg);
    }
    const stars = n === 19 ? [3, 9, 15] : n === 15 ? [3, 7, 11] : [3, 6, 9];
    for (const a of stars) for (const b of stars) h('circle', { cx: a, cy: b, r: 0.11, class: 'bd-star' }, svg);
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = Math.floor(i / n);
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('circle', { cx: x, cy: y, r: 0.5, class: 'hit' }, g);
      if (s.b[i]) {
        h('circle', { cx: x, cy: y, r: 0.45, class: `stone gs${s.b[i] - 1}` }, g);
        if (i === s.last) h('circle', { cx: x, cy: y, r: 0.12, class: 'last-dot' + (s.b[i] === 1 ? ' on-dark' : '') }, g);
      } else {
        h('circle', { cx: x, cy: y, r: 0.2, class: 'ghost' }, g);
      }
    }
  },
};
