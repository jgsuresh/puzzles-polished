// Slimetrail (Bill Taylor): a single shared token crawls over a hex rhombus, blocking every cell it leaves.
// The player whose goal corner the token enters wins, whoever moved it there.
import { h } from './core.js?v=09554f26';
import { hexXY, hexVerts, pts, boundsOf, DIRS } from './hexgeom.js?v=ee2d6f74';

const cache = new Map();
function topo(n) {
  if (cache.has(n)) return cache.get(n);
  const nb = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const l = [];
    for (const [dq, dr] of DIRS) {
      const cc = c + dq, rr = r + dr;
      if (cc >= 0 && cc < n && rr >= 0 && rr < n) l.push(rr * n + cc);
    }
    nb.push(l);
  }
  // Goals sit in the two obtuse corners of the rhombus.
  const goals = [n - 1, (n - 1) * n];
  const t = { nb, goals };
  cache.set(n, t);
  return t;
}

// From `start`, can the token still reach a goal through unblocked cells?
function goalReachable(blocked, n, start) {
  const { nb, goals } = topo(n);
  const seen = new Uint8Array(n * n), st = [start];
  seen[start] = 1;
  while (st.length) {
    const k = st.pop();
    if (k === goals[0] || k === goals[1]) return true;
    for (const j of nb[k]) if (!seen[j] && !blocked[j]) { seen[j] = 1; st.push(j); }
  }
  return false;
}

function legal(s) {
  const { nb } = topo(s.n), blocked = s.blocked.slice();
  blocked[s.pos] = 1;
  const out = [];
  for (const j of nb[s.pos]) if (!blocked[j] && goalReachable(blocked, s.n, j)) out.push(j);
  return out;
}

export default {
  name: 'slimetrail',
  players: [{ name: 'Red' }, { name: 'Blue' }],
  colors: { light: ['#e0457b', '#2f6bff'], dark: ['#ff7aa5', '#6f9bff'] },
  options: [
    { id: 'n', label: 'Board size', def: 9, choices: [7, 9, 11].map((v) => ({ v, label: `${v} × ${v}` })) },
  ],

  init({ n }) {
    n = +n;
    const mid = (n - 1) / 2;
    return { n, blocked: new Uint8Array(n * n), pos: mid * n + mid, turn: 0, last: -1, won: -1, trail: [mid * n + mid] };
  },
  moves(s) { return legal(s); },
  apply(s, j) {
    const blocked = s.blocked.slice();
    blocked[s.pos] = 1;
    const { goals } = topo(s.n);
    const won = j === goals[0] ? 0 : j === goals[1] ? 1 : -1;
    return { ...s, blocked, pos: j, last: s.pos, turn: 1 - s.turn, won, trail: [...s.trail, j] };
  },
  result(s) {
    if (s.won >= 0) return { winner: s.won };
    if (!legal(s).length) return { winner: -1, text: 'Stuck — a draw' };
    return null;
  },
  status(s) {
    return `${this.players[s.turn].name} to move the slime`;
  },

  winInfo(s, res) {
    return s.won >= 0 ? { path: s.trail } : null;
  },

  tap(s, ui, c) { return legal(s).includes(+c) ? { move: +c } : null; },
  render({ svg, s, res }) {
    const n = s.n, { goals } = topo(n);
    svg.replaceChildren();
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(hexXY(c, r));
    const [x, y, w, hh] = boundsOf(cells, 1.5);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
    h('rect', { x, y, width: w, height: hh, rx: 1.2, class: 'bd-back' }, svg);
    const hints = res ? [] : legal(s);
    for (let i = 0; i < n * n; i++) {
      const [cx, cy] = cells[i];
      const g = h('g', { 'data-c': i, class: 'cell' + (s.blocked[i] ? ' taken' : '') }, svg);
      const goal = i === goals[0] ? 0 : i === goals[1] ? 1 : -1;
      h('polygon', { points: pts(hexVerts(cx, cy, 0.97)), class: 'hexcell' + (s.blocked[i] ? ' slimed' : '') + (goal >= 0 ? ` goal p${goal}` : '') }, g);
      if (goal >= 0) h('circle', { cx, cy, r: 0.4, class: `goal-ring p${goal}` }, g);
      if (hints.includes(i)) h('circle', { cx, cy, r: 0.2, class: 'qhint' }, g);
    }
    const [px, py] = cells[s.pos];
    const tok = h('g', { class: 'token', 'pointer-events': 'none' }, svg);
    h('circle', { cx: px, cy: py, r: 0.62, class: 'slime-token' }, tok);
    h('circle', { cx: px - 0.2, cy: py - 0.22, r: 0.16, class: 'slime-shine' }, tok);
  },
};
