// Capture rules and drawing shared by Go and Gonnect.
import { h } from './core.js';

const nbCache = new Map();
export function nbrs(n) {
  if (nbCache.has(n)) return nbCache.get(n);
  const nb = [];
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i / n) | 0, l = [];
    if (x > 0) l.push(i - 1);
    if (x < n - 1) l.push(i + 1);
    if (y > 0) l.push(i - n);
    if (y < n - 1) l.push(i + n);
    nb.push(l);
  }
  nbCache.set(n, nb);
  return nb;
}

// Connected group of colour b[start], and how many distinct liberties it has.
function flood(b, n, start, seen) {
  const nb = nbrs(n), v = b[start], grp = [start], libs = new Set();
  seen[start] = 1;
  for (let k = 0; k < grp.length; k++) {
    for (const j of nb[grp[k]]) {
      if (b[j] === 0) libs.add(j);
      else if (b[j] === v && !seen[j]) { seen[j] = 1; grp.push(j); }
    }
  }
  return { grp, libs: libs.size };
}

// Place colour v (1/2) on i. Returns {b, caps} or null when occupied or suicidal.
export function place(b, n, i, v) {
  if (b[i]) return null;
  const nb = nbrs(n), b2 = b.slice();
  b2[i] = v;
  let caps = 0;
  const seen = new Uint8Array(n * n);
  for (const j of nb[i]) {
    if (b2[j] === 3 - v && !seen[j]) {
      const { grp, libs } = flood(b2, n, j, seen);
      if (libs === 0) { for (const k of grp) b2[k] = 0; caps += grp.length; }
    }
  }
  if (flood(b2, n, i, new Uint8Array(n * n)).libs === 0) return null;   // suicide
  return { b: b2, caps };
}

export const keyOf = (b) => Array.prototype.join.call(b, '');

// Legal points for v: not occupied, not suicide, and no repeat of an earlier whole-board position.
export function legalPoints(b, n, v, hist) {
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i]) continue;
    const r = place(b, n, i, v);
    if (r && !hist.includes(keyOf(r.b))) out.push(i);
  }
  return out;
}

// Empty regions and who they border: returns {owner: Int8Array (0 none, 1/2 one colour only)}.
export function territory(b, n) {
  const nb = nbrs(n), owner = new Int8Array(b.length), seen = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    if (b[i] || seen[i]) continue;
    const reg = [i], touch = new Set();
    seen[i] = 1;
    for (let k = 0; k < reg.length; k++) {
      for (const j of nb[reg[k]]) {
        if (b[j]) touch.add(b[j]);
        else if (!seen[j]) { seen[j] = 1; reg.push(j); }
      }
    }
    if (touch.size === 1) { const c = [...touch][0]; for (const k of reg) owner[k] = c; }
  }
  return owner;
}

// Does colour v have a chain joining two opposite sides?
export function spans(b, n, v) {
  const nb = nbrs(n), seen = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== v || seen[i]) continue;
    const st = [i];
    seen[i] = 1;
    let l = false, r = false, t = false, bt = false;
    while (st.length) {
      const k = st.pop(), x = k % n, y = (k / n) | 0;
      if (x === 0) l = true;
      if (x === n - 1) r = true;
      if (y === 0) t = true;
      if (y === n - 1) bt = true;
      for (const j of nb[k]) if (!seen[j] && b[j] === v) { seen[j] = 1; st.push(j); }
    }
    if ((l && r) || (t && bt)) return true;
  }
  return false;
}

export function drawGoBoard(svg, s, { territoryOwner } = {}) {
  const n = s.n, pad = 0.9;
  svg.replaceChildren();
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${n - 1 + 2 * pad} ${n - 1 + 2 * pad}`);
  h('rect', { x: -pad, y: -pad, width: n - 1 + 2 * pad, height: n - 1 + 2 * pad, rx: 0.4, class: 'bd-wood' }, svg);
  for (let k = 0; k < n; k++) {
    h('line', { x1: 0, y1: k, x2: n - 1, y2: k, class: 'bd-line' }, svg);
    h('line', { x1: k, y1: 0, x2: k, y2: n - 1, class: 'bd-line' }, svg);
  }
  const stars = n >= 17 ? [3, 9, 15] : n >= 13 ? [3, n >> 1, n - 4] : n >= 11 ? [2, 5, 8] : n >= 9 ? [2, 4, 6] : [];
  for (const a of stars) for (const b of stars) h('circle', { cx: a, cy: b, r: 0.1, class: 'bd-star' }, svg);
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i / n) | 0;
    const g = h('g', { 'data-c': i, class: 'cell' + (s.b[i] ? ' taken' : '') }, svg);
    h('circle', { cx: x, cy: y, r: 0.5, class: 'hit' }, g);
    if (s.b[i]) {
      h('circle', { cx: x, cy: y, r: 0.46, class: `stone gs${s.b[i] - 1}` }, g);
      if (i === s.last) h('circle', { cx: x, cy: y, r: 0.12, class: 'last-dot' }, g);
    } else {
      h('circle', { cx: x, cy: y, r: 0.2, class: 'ghost' }, g);
      if (territoryOwner && territoryOwner[i]) h('rect', { x: x - 0.14, y: y - 0.14, width: 0.28, height: 0.28, class: `terr gs${territoryOwner[i] - 1}` }, g);
    }
  }
}
