// Game of the Amazons: move a queen like a chess queen, then shoot an arrow from where
// it lands; arrows burn their square for the rest of the game. If you can't move, you lose.
import { h } from './core.js';

const N = 10;
const DIRS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const ARROW = 3;

// Squares a queen on `i` can reach (ignoring `skip`, a square treated as empty).
function reach(b, i, skip = -1) {
  const x = i % N, y = (i / N) | 0, out = [];
  for (const [dx, dy] of DIRS8) {
    let xx = x + dx, yy = y + dy;
    while (xx >= 0 && yy >= 0 && xx < N && yy < N) {
      const j = yy * N + xx;
      if (b[j] && j !== skip) break;
      out.push(j);
      xx += dx; yy += dy;
    }
  }
  return out;
}
const queens = (b, v) => { const q = []; for (let i = 0; i < b.length; i++) if (b[i] === v) q.push(i); return q; };
const canMove = (b, v) => queens(b, v).some((q) => reach(b, q).length);

export default {
  name: 'amazons',
  players: [{ name: 'White' }, { name: 'Black' }],
  colors: { light: ['#f6f3ea', '#1b1f2a'], dark: ['#f6f3ea', '#1b1f2a'] },
  options: [],

  init() {
    const b = new Uint8Array(N * N);
    // Row 0 is the bottom edge. White starts low, Black high.
    for (const [c, r] of [[0, 3], [3, 0], [6, 0], [9, 3]]) b[r * N + c] = 1;
    for (const [c, r] of [[0, 6], [3, 9], [6, 9], [9, 6]]) b[r * N + c] = 2;
    return { b, turn: 0, last: null };
  },
  // A full move is [from, to, arrow].
  moves(s) {
    const m = [], v = s.turn + 1;
    for (const q of queens(s.b, v)) {
      for (const t of reach(s.b, q)) {
        for (const a of reach(s.b, t, q)) m.push([q, t, a]);
      }
    }
    return m;
  },
  apply(s, [from, to, arrow]) {
    const b = s.b.slice();
    b[to] = b[from]; b[from] = 0; b[arrow] = ARROW;
    return { ...s, b, turn: 1 - s.turn, last: { from, to, arrow } };
  },
  result(s) {
    return canMove(s.b, s.turn + 1) ? null : { winner: 1 - s.turn };
  },

  newUi() { return { from: -1, to: -1 }; },
  partial(ui) { return ui.from >= 0; },
  status(s, ui) {
    const who = this.players[s.turn].name;
    if (ui.from < 0) return `${who}: pick a queen`;
    if (ui.to < 0) return `${who}: move the queen`;
    return `${who}: shoot an arrow`;
  },
  tap(s, ui, c) {
    const i = +c, v = s.turn + 1;
    if (ui.to >= 0) {
      if (i === ui.to) { ui.to = -1; return { redraw: true }; }              // take the queen move back
      const b = s.b.slice(); b[ui.to] = b[ui.from]; b[ui.from] = 0;
      return reach(b, ui.to).includes(i) ? { move: [ui.from, ui.to, i] } : null;
    }
    if (ui.from >= 0) {
      if (i === ui.from) { ui.from = -1; return { redraw: true }; }
      if (s.b[i] === v && reach(s.b, i).length) { ui.from = i; return { redraw: true }; }
      if (reach(s.b, ui.from).includes(i)) { ui.to = i; return { redraw: true }; }
      return null;
    }
    if (s.b[i] === v && reach(s.b, i).length) { ui.from = i; return { redraw: true }; }
    return null;
  },

  render({ svg, s, ui, res }) {
    svg.replaceChildren();
    svg.setAttribute('viewBox', '-0.3 -0.3 10.6 10.6');
    h('rect', { x: -0.3, y: -0.3, width: 10.6, height: 10.6, rx: 0.3, class: 'bd-back' }, svg);
    let targets = [];
    if (!res && ui.from >= 0) {
      if (ui.to < 0) targets = reach(s.b, ui.from);
      else { const b = s.b.slice(); b[ui.to] = b[ui.from]; b[ui.from] = 0; targets = reach(b, ui.to); }
    }
    const last = s.last;
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = N - 1 - ((i / N) | 0);
      const g = h('g', { 'data-c': i, class: 'cell' }, svg);
      h('rect', { x, y, width: 1, height: 1, class: 'sq ' + (((x + y) & 1) ? 'dk' : 'lt') + (last && (i === last.from || i === last.to || i === last.arrow) ? ' lastsq' : '') }, g);
      const v = ui.to >= 0 && i === ui.from ? 0 : s.b[i];    // the queen being moved is drawn at its target
      if (v === ARROW) {
        h('rect', { x: x + 0.18, y: y + 0.18, width: 0.64, height: 0.64, rx: 0.12, class: 'arrow-sq' }, g);
        h('path', { d: `M${x + 0.36} ${y + 0.36}L${x + 0.64} ${y + 0.64}M${x + 0.64} ${y + 0.36}L${x + 0.36} ${y + 0.64}`, class: 'arrow-x' }, g);
      } else if (v) {
        const sel = i === ui.from && ui.to < 0;
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.36, class: `stone ${v === 1 ? "aw" : "ab"}` + (sel ? ' sel' : '') }, g);
        h('text', { x: x + 0.5, y: y + 0.66, class: `queen ${v === 1 ? "qw" : "qb"}`, 'text-anchor': 'middle' }, g).textContent = '♛';
      }
      if (targets.includes(i) && !v) {
        h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.11, class: ui.to >= 0 ? 'qhint arrowhint' : 'qhint' }, g);
      }
    }
    if (ui.to >= 0) {
      const x = ui.to % N, y = N - 1 - ((ui.to / N) | 0), v = s.turn + 1;
      const g = svg.querySelector(`[data-c="${ui.to}"]`);
      h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.36, class: `stone ${v === 1 ? "aw" : "ab"} sel` }, g);
      h('text', { x: x + 0.5, y: y + 0.66, class: `queen ${v === 1 ? "qw" : "qb"}`, 'text-anchor': 'middle' }, g).textContent = '♛';
    }
  },
};
