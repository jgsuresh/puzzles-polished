// Gonnect: the capture rules of Go, but no passing; connect two opposite sides to win.
import { place, keyOf, legalPoints, spans, drawGoBoard, nbrs } from './goengine.js?v=f455c952';
import { bfsPath } from './hexgeom.js?v=ee2d6f74';

export default {
  name: 'gonnect',
  players: [{ name: 'Black' }, { name: 'White' }],
  colors: { light: ['#1b1f2a', '#f6f3ea'], dark: ['#1b1f2a', '#f6f3ea'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [9, 11, 13, 15].map((v) => ({ v, label: `${v} × ${v}` })) },
    { id: 'swap', label: 'Pie rule', def: 1, choices: [{ v: 1, label: 'On — White may swap sides after Black\'s first move' }, { v: 0, label: 'Off' }] },
  ],

  init({ n, swap }) {
    const b = new Uint8Array(n * n);
    return { n: +n, b, turn: 0, last: -1, hist: [keyOf(b)], swapRule: !!+swap, swapAvail: false, moveCount: 0, won: -1 };
  },
  moves(s) {
    const m = legalPoints(s.b, s.n, s.turn + 1, s.hist);
    if (s.swapAvail) m.push('swap');
    return m;
  },
  apply(s, m) {
    if (m === 'swap') {
      const b = s.b.slice(), i = b.indexOf(1);
      b[i] = 2;
      return { ...s, b, turn: 0, swapAvail: false, last: i, moveCount: s.moveCount + 1, hist: [...s.hist, keyOf(b)], note: 'Swapped!' };
    }
    const r = place(s.b, s.n, m, s.turn + 1);
    return {
      ...s, b: r.b, turn: 1 - s.turn, last: m, moveCount: s.moveCount + 1, hist: [...s.hist, keyOf(r.b)],
      swapAvail: s.swapRule && s.moveCount === 0,
      won: spans(r.b, s.n, s.turn + 1) ? s.turn : -1, note: '',
    };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    if (s.moveCount && this.moves(s).length === 0) return { winner: 1 - s.turn };   // no legal move: you lose
    return null;
  },

  winInfo(s, res) {
    const n = s.n, v = res.winner + 1, nb = nbrs(n), ok = (i) => s.b[i] === v;
    const col = (x) => Array.from({ length: n }, (_, y) => y * n + x), row = (y) => Array.from({ length: n }, (_, x) => y * n + x);
    const path = bfsPath(nb, col(0), ok, (i) => i % n === n - 1) || bfsPath(nb, row(0), ok, (i) => i >= n * (n - 1));
    return path && { path };   // no chain: the win was by the opponent having no legal move
  },

  tap(s, ui, c) {
    const i = +c;
    if (s.b[i]) return null;
    const r = place(s.b, s.n, i, s.turn + 1);
    return r && !s.hist.includes(keyOf(r.b)) ? { move: i } : null;
  },
  render({ svg, s }) { drawGoBoard(svg, s); },
};
