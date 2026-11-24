// Go with Tromp–Taylor style area scoring: stones plus surrounded empty regions, White gets komi.
// There is no dead-stone marking: capture anything you believe is dead before both players pass.
import { place, keyOf, legalPoints, territory, drawGoBoard } from './goengine.js';

function score(b, n) {
  const own = territory(b, n);
  const t = [0, 0];
  for (let i = 0; i < b.length; i++) {
    const c = b[i] || own[i];
    if (c) t[c - 1]++;
  }
  return t;
}

export default {
  name: 'go',
  canPass: true,
  players: [{ name: 'Black' }, { name: 'White' }],
  colors: { light: ['#1b1f2a', '#f6f3ea'], dark: ['#1b1f2a', '#f6f3ea'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [{ v: 9, label: '9 × 9 (quick)' }, { v: 13, label: '13 × 13' }, { v: 19, label: '19 × 19 (full board)' }] },
    { id: 'komi', label: 'Komi (points for White)', def: 6.5, choices: [{ v: 0.5, label: '0.5' }, { v: 5.5, label: '5.5' }, { v: 6.5, label: '6.5' }, { v: 7.5, label: '7.5' }] },
  ],

  init({ n, komi }) {
    const b = new Uint8Array(n * n);
    return { n: +n, komi: +komi, b, turn: 0, last: -1, passes: 0, hist: [keyOf(b)], caps: [0, 0] };
  },
  moves(s) {
    return [...legalPoints(s.b, s.n, s.turn + 1, s.hist), 'pass'];
  },
  apply(s, m) {
    if (m === 'pass') return { ...s, turn: 1 - s.turn, last: -1, passes: s.passes + 1 };
    const r = place(s.b, s.n, m, s.turn + 1);
    const caps = s.caps.slice();
    caps[s.turn] += r.caps;
    return { ...s, b: r.b, turn: 1 - s.turn, last: m, passes: 0, caps, hist: [...s.hist, keyOf(r.b)] };
  },
  result(s) {
    if (s.passes < 2) return null;
    const [a, w] = score(s.b, s.n);
    const white = w + s.komi, diff = Math.abs(a - white);
    return a > white ? { winner: 0, text: `Black wins by ${diff}`, } : { winner: 1, text: `White wins by ${diff}` };
  },
  status(s) {
    const who = this.players[s.turn].name;
    const [a, w] = score(s.b, s.n);
    const note = s.passes === 1 ? ' · opponent passed' : '';
    return `${who} to move${note} · ${a}–${w + s.komi}`;
  },

  tap(s, ui, c) {
    const i = +c;
    if (s.b[i]) return null;
    const r = place(s.b, s.n, i, s.turn + 1);
    return r && !s.hist.includes(keyOf(r.b)) ? { move: i } : null;
  },
  render({ svg, s, res }) {
    drawGoBoard(svg, s, { territoryOwner: res ? territory(s.b, s.n) : null });
  },
};
