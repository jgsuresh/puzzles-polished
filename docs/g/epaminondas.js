// Epaminondas (Robert Abbott): move phalanxes (lines of your stones) along their own line,
// capture smaller enemy phalanxes, and get more stones onto the enemy back row than they have on yours.
import { h } from './core.js?v=fece9af1';

// Eight directions as [dx, dy]; index i and i^1 are opposites. Row 0 is White's back row (bottom).
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]];
const SIZES = { std: [14, 12], small: [10, 8] };

// Every legal move as [endA, endB, dirIndex, steps]: the group between endA and endB (inclusive,
// contiguous friendly stones on one line) slides `steps` squares along dirIndex.
export function genMoves(s, player) {
  const [W, H] = s.dims, b = s.b, p = player, q = 3 - p, out = [];
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const slide = (a, e, dirIdx, lead, k) => {
    const [dx, dy] = DIRS[dirIdx];
    let x = lead % W, y = (lead / W) | 0;
    for (let m = 1; m <= k; m++) {
      x += dx; y += dy;
      if (!inb(x, y)) return;
      const v = b[y * W + x];
      if (v === 0) { out.push([a, e, dirIdx, m]); continue; }
      if (v === p) return;
      // Enemy stone: capture the contiguous enemy phalanx ahead, if it is smaller than the group.
      let cnt = 0, cx = x, cy = y;
      while (inb(cx, cy) && b[cy * W + cx] === q) { cnt++; cx += dx; cy += dy; }
      if (cnt < k) out.push([a, e, dirIdx, m]);
      return;
    }
  };
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== p) continue;
    const x0 = i % W, y0 = (i / W) | 0;
    for (const fwd of [0, 2, 4, 6]) {           // E, N, NE, NW; reverse directions are handled by sliding backwards
      const [dx, dy] = DIRS[fwd];
      for (let k = 1; ; k++) {
        const x = x0 + dx * (k - 1), y = y0 + dy * (k - 1);
        if (!inb(x, y) || b[y * W + x] !== p) break;
        const end = y * W + x;
        slide(i, end, fwd, end, k);             // forward from the far end
        slide(i, end, fwd ^ 1, i, k);           // backward from the near end
      }
    }
  }
  return out;
}

// The square the leading stone of a move lands on.
export function landing(s, [a, e, dirIdx, m]) {
  const W = s.dims[0], [dx, dy] = DIRS[dirIdx];
  const ax = a % W, ay = (a / W) | 0, ex = e % W, ey = (e / W) | 0;
  // The lead is whichever end sits further along the movement direction.
  const aLead = (ax - ex) * dx + (ay - ey) * dy >= 0;
  const lead = aLead ? a : e;
  return (((lead / W) | 0) + dy * m) * W + (lead % W) + dx * m;
}

function backRowCounts(s) {
  const [W, H] = s.dims;
  let whiteOnBlackRow = 0, blackOnWhiteRow = 0;
  for (let x = 0; x < W; x++) {
    if (s.b[(H - 1) * W + x] === 1) whiteOnBlackRow++;
    if (s.b[x] === 2) blackOnWhiteRow++;
  }
  return [whiteOnBlackRow, blackOnWhiteRow];
}

export default {
  name: 'epaminondas',
  players: [{ name: 'White' }, { name: 'Black' }],
  colors: { light: ['#f6f3ea', '#1b1f2a'], dark: ['#f6f3ea', '#1b1f2a'] },
  options: [
    { id: 'size', label: 'Board', def: 'std', choices: [{ v: 'std', label: 'Standard 14 × 12' }, { v: 'small', label: 'Small 10 × 8 (easier on a phone)' }] },
  ],

  init({ size }) {
    const [W, H] = SIZES[size] || SIZES.std;
    const b = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) { b[x] = 1; b[W + x] = 1; b[(H - 1) * W + x] = 2; b[(H - 2) * W + x] = 2; }
    return { dims: [W, H], b, turn: 0, last: null };
  },
  moves(s) { return genMoves(s, s.turn + 1); },
  apply(s, mv) {
    const [W] = s.dims, [a, e, dirIdx, m] = mv, [dx, dy] = DIRS[dirIdx], b = s.b.slice(), p = s.turn + 1;
    // Collect the group's squares.
    const ax = a % W, ay = (a / W) | 0, ex = e % W, ey = (e / W) | 0;
    const k = Math.max(Math.abs(ex - ax), Math.abs(ey - ay)) + 1;
    const sx = Math.sign(ex - ax), sy = Math.sign(ey - ay);
    const grp = [];
    for (let i = 0; i < k; i++) grp.push((ay + sy * i) * W + ax + sx * i);
    const land = landing(s, mv);
    // Capture the enemy phalanx at the landing square, if any.
    if (b[land] === 3 - p) {
      let cx = land % W, cy = (land / W) | 0;
      while (cx >= 0 && cy >= 0 && cx < W && cy < s.dims[1] && b[cy * W + cx] === 3 - p) { b[cy * W + cx] = 0; cx += dx; cy += dy; }
    }
    for (const i of grp) b[i] = 0;
    for (const i of grp) b[i + dy * m * W + dx * m] = p;
    return { ...s, b, turn: 1 - s.turn, last: { from: grp, to: land } };
  },
  result(s) {
    // At the start of your turn: more of your stones on their back row than theirs on yours wins.
    const [wOnB, bOnW] = backRowCounts(s);
    const mine = s.turn === 0 ? wOnB : bOnW, theirs = s.turn === 0 ? bOnW : wOnB;
    if (mine > theirs) return { winner: s.turn };
    if (!genMoves(s, s.turn + 1).length) return { winner: 1 - s.turn };
    return null;
  },
  status(s, ui) {
    const who = this.players[s.turn].name, [w, bl] = backRowCounts(s);
    const base = ui && ui.grp && ui.grp.length ? `${who}: choose where to move` : `${who}: pick a stone`;
    return `${base} · back row ${w}–${bl}`;
  },

  // The taps that produce a move (used by the smoke test): group ends, then the landing square.
  tapSequence(s, m) { return [...new Set([m[0], m[1]]), landing(s, m)]; },

  newUi() { return { anchor: -1, grp: [] }; },
  partial(ui) { return ui.anchor >= 0; },
  tap(s, ui, c) {
    const i = +c, [W, H] = s.dims, p = s.turn + 1;
    // Choose a destination for the selected group.
    if (ui.anchor >= 0) {
      const ends = [ui.grp[0], ui.grp[ui.grp.length - 1]];
      const mv = genMoves(s, p).find((m) => ((m[0] === ends[0] && m[1] === ends[1]) || (m[0] === ends[1] && m[1] === ends[0])) && landing(s, m) === i);
      if (mv) return { move: mv };
    }
    if (s.b[i] !== p) return null;
    if (ui.anchor >= 0 && i !== ui.anchor) {
      // Extend the selection to a straight run of your stones from the anchor to here.
      const ax = ui.anchor % W, ay = (ui.anchor / W) | 0, x = i % W, y = (i / W) | 0;
      const dx = x - ax, dy = y - ay;
      if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
        const k = Math.max(Math.abs(dx), Math.abs(dy)) + 1, sx = Math.sign(dx), sy = Math.sign(dy);
        const grp = [];
        for (let t = 0; t < k; t++) grp.push((ay + sy * t) * W + ax + sx * t);
        if (grp.every((g) => s.b[g] === p)) { ui.grp = grp; return { redraw: true }; }
      }
    }
    if (ui.anchor === i && ui.grp.length === 1) { ui.anchor = -1; ui.grp = []; return { redraw: true }; }
    ui.anchor = i; ui.grp = [i];
    return { redraw: true };
  },

  render({ svg, s, ui, res }) {
    const [W, H] = s.dims;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `-0.3 -0.3 ${W + 0.6} ${H + 0.6}`);
    h('rect', { x: -0.3, y: -0.3, width: W + 0.6, height: H + 0.6, rx: 0.3, class: 'bd-back' }, svg);
    // Back rows are tinted for the side that wants to reach them.
    h('rect', { x: 0, y: 0, width: W, height: 1, class: 'goalrow p0' }, svg);
    h('rect', { x: 0, y: H - 1, width: W, height: 1, class: 'goalrow p1' }, svg);
    const p = s.turn + 1;
    const ends = ui.grp && ui.grp.length ? [ui.grp[0], ui.grp[ui.grp.length - 1]] : null;
    const dests = new Map();
    if (!res && ends) {
      for (const m of genMoves(s, p)) {
        if ((m[0] === ends[0] && m[1] === ends[1]) || (m[0] === ends[1] && m[1] === ends[0])) dests.set(landing(s, m), s.b[landing(s, m)] === 3 - p);
      }
    }
    const sel = new Set(ui.grp || []);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = H - 1 - ((i / W) | 0);
      const g = h('g', { 'data-c': i, class: 'cell' }, svg);
      h('rect', { x, y, width: 1, height: 1, class: 'sq ' + (((x + y) & 1) ? 'dk' : 'lt') }, g);
      const v = s.b[i];
      if (v) h('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.38, class: `stone ${v === 1 ? 'aw' : 'ab'}` + (sel.has(i) ? ' sel' : '') + (s.last && s.last.to === i ? ' landed' : '') }, g);
      if (dests.has(i)) h('circle', { cx: x + 0.5, cy: y + 0.5, r: dests.get(i) ? 0.46 : 0.12, class: dests.get(i) ? 'qhint cap' : 'qhint' }, g);
    }
  },
};
