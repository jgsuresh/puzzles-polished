// Campaign (Chris Huntoon): each player has one chess Knight. Each move the Knight jumps to an empty
// square and leaves a marker of your colour behind. First to line up five markers wins; a stranded Knight loses.
import { h } from './core.js?v=09554f26';

const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const LINES = [[1, 0], [0, 1], [1, 1], [1, -1]];

function knightMoves(s, p) {
  const n = s.n, at = s.knights[p], x = at % n, y = (at / n) | 0, out = [];
  for (const [dx, dy] of KN) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
    const j = yy * n + xx;
    if (!s.b[j] && j !== s.knights[0] && j !== s.knights[1]) out.push(j);
  }
  return out;
}

function fiveOf(b, n, v) {
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (b[y * n + x] !== v) continue;
    for (const [dx, dy] of LINES) {
      let k = 1;
      while (k < 5) {
        const xx = x + dx * k, yy = y + dy * k;
        if (xx < 0 || yy < 0 || xx >= n || yy >= n || b[yy * n + xx] !== v) break;
        k++;
      }
      if (k === 5) return true;
    }
  }
  return false;
}

export default {
  name: 'campaign',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 10, choices: [{ v: 8, label: '8 × 8 (shorter)' }, { v: 10, label: '10 × 10' }] },
  ],

  init({ n }) { return { n: +n, b: new Uint8Array(n * n), knights: [-1, -1], turn: 0, last: -1, moveCount: 0, won: -1 }; },
  // The first two moves drop each Knight on any empty square; after that a move is the Knight's destination.
  moves(s) {
    if (s.moveCount < 2) {
      const m = [];
      for (let i = 0; i < s.b.length; i++) if (i !== s.knights[0]) m.push(i);
      return m;
    }
    return knightMoves(s, s.turn);
  },
  apply(s, j) {
    const knights = s.knights.slice(), b = s.b.slice();
    if (s.moveCount >= 2) b[knights[s.turn]] = s.turn + 1;     // leave a marker where the Knight was
    knights[s.turn] = j;
    const won = s.moveCount >= 2 && fiveOf(b, s.n, s.turn + 1) ? s.turn : -1;
    return { ...s, b, knights, turn: 1 - s.turn, last: j, moveCount: s.moveCount + 1, won };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    if (s.moveCount >= 2 && knightMoves(s, s.turn).length === 0) return { winner: 1 - s.turn };   // stranded
    return null;
  },
  status(s) {
    const who = this.players[s.turn].name;
    return s.moveCount < 2 ? `${who}: place your Knight anywhere` : `${who}: move your Knight`;
  },

  winInfo(s, res) {
    const n = s.n, v = res.winner + 1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (s.b[y * n + x] !== v) continue;
      for (const [dx, dy] of LINES) {
        const cells = [];
        for (let k = 0; k < 5; k++) {
          const xx = x + dx * k, yy = y + dy * k;
          if (xx < 0 || yy < 0 || xx >= n || yy >= n || s.b[yy * n + xx] !== v) break;
          cells.push(yy * n + xx);
        }
        if (cells.length === 5) return { path: cells };
      }
    }
    return null;
  },

  tap(s, ui, c) {
    const i = +c;
    if (s.moveCount < 2) return i !== s.knights[0] ? { move: i } : null;
    return knightMoves(s, s.turn).includes(i) ? { move: i } : null;
  },
  render({ svg, s, res }) {
    const n = s.n;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `-0.3 -0.3 ${n + 0.6} ${n + 0.6}`);
    h('rect', { x: -0.3, y: -0.3, width: n + 0.6, height: n + 0.6, rx: 0.3, class: 'bd-back' }, svg);
    const hints = !res && s.moveCount >= 2 ? knightMoves(s, s.turn) : [];
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0;
      const g = h('g', { 'data-c': i, class: 'cell' }, svg);
      h('rect', { x, y, width: 1, height: 1, class: 'sq ' + (((x + y) & 1) ? 'dk' : 'lt') }, g);
      if (s.b[i]) h('rect', { x: x + 0.22, y: y + 0.22, width: 0.56, height: 0.56, rx: 0.12, class: `marker p${s.b[i] - 1}` }, g);
      const k = s.knights.indexOf(i);
      if (k >= 0) {
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.4, class: `stone p${k}` + (k === s.turn && !res ? ' sel' : '') }, g);
        h('text', { x: x + 0.5, y: y + 0.68, class: 'queen kn', 'text-anchor': 'middle' }, g).textContent = '♞';
      }
      if (hints.includes(i)) h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.13, class: 'qhint' }, g);
    }
  },
};
