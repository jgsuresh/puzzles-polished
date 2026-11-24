// Lines of Action: slide pieces by the number of pieces on their line; join all of yours into one group.
import { h } from './core.js?v=fece9af1';

const N = 8;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

// Row 0 is the bottom. Black (first) holds the top and bottom rows, White the left and right columns.
function setup() {
  const b = new Uint8Array(N * N);
  for (let k = 1; k <= 6; k++) { b[k] = 1; b[7 * N + k] = 1; b[k * N] = 2; b[k * N + 7] = 2; }
  return b;
}

// Pieces on the whole line through i in direction d (both ways, including i itself).
function lineCount(b, i, [dx, dy]) {
  const x = i % N, y = (i / N) | 0;
  let c = 1;
  for (const sg of [1, -1]) {
    let xx = x + sg * dx, yy = y + sg * dy;
    while (xx >= 0 && yy >= 0 && xx < N && yy < N) { if (b[yy * N + xx]) c++; xx += sg * dx; yy += sg * dy; }
  }
  return c;
}

export function movesFrom(b, i) {
  const v = b[i], out = [];
  const x = i % N, y = (i / N) | 0;
  for (const d of DIRS) {
    const dist = lineCount(b, i, d);
    let ok = true;
    for (let k = 1; k <= dist; k++) {
      const xx = x + d[0] * k, yy = y + d[1] * k;
      if (xx < 0 || yy < 0 || xx >= N || yy >= N) { ok = false; break; }
      const c = b[yy * N + xx];
      if (k < dist && c && c !== v) { ok = false; break; }   // can't jump enemies
      if (k === dist && c === v) ok = false;                 // can't land on your own
    }
    if (ok) out.push((y + d[1] * dist) * N + x + d[0] * dist);
  }
  return out;
}

function connected(b, v) {
  const all = [];
  for (let i = 0; i < b.length; i++) if (b[i] === v) all.push(i);
  if (all.length <= 1) return true;
  const seen = new Set([all[0]]), st = [all[0]];
  while (st.length) {
    const k = st.pop(), x = k % N, y = (k / N) | 0;
    for (const [dx, dy] of DIRS) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
      const j = yy * N + xx;
      if (b[j] === v && !seen.has(j)) { seen.add(j); st.push(j); }
    }
  }
  return seen.size === all.length;
}

export default {
  name: 'loa',
  players: [{ name: 'Black' }, { name: 'White' }],
  colors: { light: ['#1b1f2a', '#f6f3ea'], dark: ['#1b1f2a', '#f6f3ea'] },
  options: [],

  init() { return { b: setup(), turn: 0, last: null, won: -1 }; },
  moves(s) {
    const m = [];
    for (let i = 0; i < s.b.length; i++) if (s.b[i] === s.turn + 1) for (const t of movesFrom(s.b, i)) m.push([i, t]);
    return m;
  },
  apply(s, [from, to]) {
    const b = s.b.slice(), v = s.turn + 1;
    b[to] = v; b[from] = 0;
    // The mover wins if connected (even if the opponent is too); otherwise the opponent may have been connected by the capture.
    const won = connected(b, v) ? s.turn : connected(b, 3 - v) ? 1 - s.turn : -1;
    return { ...s, b, turn: 1 - s.turn, last: { from, to }, won };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    return null;
  },

  newUi() { return { sel: -1 }; },
  partial(ui) { return ui.sel >= 0; },
  status(s, ui) {
    const who = this.players[s.turn].name;
    return ui.sel >= 0 ? `${who}: pick a square` : `${who}: pick a piece`;
  },
  tap(s, ui, c) {
    const i = +c, v = s.turn + 1;
    if (ui.sel >= 0) {
      if (i === ui.sel) { ui.sel = -1; return { redraw: true }; }
      if (movesFrom(s.b, ui.sel).includes(i)) return { move: [ui.sel, i] };
    }
    if (s.b[i] === v && movesFrom(s.b, i).length) { ui.sel = i; return { redraw: true }; }
    return null;
  },

  render({ svg, s, ui, res }) {
    svg.replaceChildren();
    svg.setAttribute('viewBox', '-0.3 -0.3 8.6 8.6');
    h('rect', { x: -0.3, y: -0.3, width: 8.6, height: 8.6, rx: 0.3, class: 'bd-back' }, svg);
    const targets = !res && ui.sel >= 0 ? movesFrom(s.b, ui.sel) : [];
    const last = s.last;
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = N - 1 - ((i / N) | 0);
      const g = h('g', { 'data-c': i, class: 'cell' }, svg);
      h('rect', { x, y, width: 1, height: 1, class: 'sq ' + (((x + y) & 1) ? 'dk' : 'lt') + (last && (i === last.from || i === last.to) ? ' lastsq' : '') }, g);
      const v = s.b[i];
      if (v) h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.38, class: `stone gs${v - 1}` + (i === ui.sel ? ' sel' : '') }, g);
      if (targets.includes(i)) h('circle', { cx: x + 0.5, cy: y + 0.5, r: v ? 0.46 : 0.12, class: v ? 'qhint cap' : 'qhint' }, g);
    }
  },
};
