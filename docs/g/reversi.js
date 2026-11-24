// Reversi (Othello): sandwich the other colour's discs to flip them; most discs wins.
import { h } from './core.js?v=fece9af1';

const N = 8;
const DIRS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Discs that would flip if `v` played at i (empty list = illegal).
function flipsFor(b, i, v) {
  if (b[i]) return [];
  const x = i % N, y = (i / N) | 0, out = [];
  for (const [dx, dy] of DIRS8) {
    const line = [];
    let xx = x + dx, yy = y + dy;
    while (xx >= 0 && yy >= 0 && xx < N && yy < N && b[yy * N + xx] === 3 - v) { line.push(yy * N + xx); xx += dx; yy += dy; }
    if (line.length && xx >= 0 && yy >= 0 && xx < N && yy < N && b[yy * N + xx] === v) out.push(...line);
  }
  return out;
}
const legal = (b, v) => { const m = []; for (let i = 0; i < N * N; i++) if (flipsFor(b, i, v).length) m.push(i); return m; };
const count = (b, v) => { let c = 0; for (const x of b) if (x === v) c++; return c; };

export default {
  name: 'reversi',
  players: [{ name: 'Black' }, { name: 'White' }],
  colors: { light: ['#1b1f2a', '#f6f3ea'], dark: ['#1b1f2a', '#f6f3ea'] },
  options: [],

  init() {
    const b = new Uint8Array(N * N);
    b[3 * N + 3] = 2; b[4 * N + 4] = 2; b[3 * N + 4] = 1; b[4 * N + 3] = 1;
    return { b, turn: 0, last: -1, flipped: [] };
  },
  moves(s) {
    const m = legal(s.b, s.turn + 1);
    if (m.length) return m;
    return legal(s.b, 2 - s.turn).length ? ['pass'] : [];
  },
  apply(s, m) {
    if (m === 'pass') return { ...s, turn: 1 - s.turn, last: -1, flipped: [] };
    const b = s.b.slice(), f = flipsFor(b, m, s.turn + 1);
    b[m] = s.turn + 1;
    for (const i of f) b[i] = s.turn + 1;
    return { ...s, b, turn: 1 - s.turn, last: m, flipped: f, note: '' };
  },
  result(s) {
    if (legal(s.b, 1).length || legal(s.b, 2).length) return null;
    const a = count(s.b, 1), c = count(s.b, 2);
    return { winner: a === c ? -1 : a > c ? 0 : 1 };
  },
  status(s) {
    return `${this.players[s.turn].name} to move · ${count(s.b, 1)}–${count(s.b, 2)}`;
  },

  tap(s, ui, c) { return flipsFor(s.b, +c, s.turn + 1).length ? { move: +c } : null; },
  render({ svg, s, res }) {
    svg.replaceChildren();
    svg.setAttribute('viewBox', '-0.3 -0.3 8.6 8.6');
    h('rect', { x: -0.3, y: -0.3, width: 8.6, height: 8.6, rx: 0.3, class: 'bd-felt' }, svg);
    for (let k = 0; k <= N; k++) {
      h('line', { x1: 0, y1: k, x2: N, y2: k, class: 'bd-line felt' }, svg);
      h('line', { x1: k, y1: 0, x2: k, y2: N, class: 'bd-line felt' }, svg);
    }
    const hints = res ? [] : legal(s.b, s.turn + 1);
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = (i / N) | 0;
      const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
      h('rect', { x, y, width: 1, height: 1, class: 'hit' }, g);
      if (s.b[i]) {
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.42, class: `stone gs${s.b[i] - 1}` + (s.flipped.includes(i) ? ' flipped' : '') }, g);
        if (i === s.last) h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.1, class: 'last-dot' + (s.b[i] === 1 ? ' on-dark' : '') }, g);
      } else if (hints.includes(i)) {
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.12, class: 'hint-dot' }, g);
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.42, class: 'ghost' }, g);
      }
    }
  },
};
