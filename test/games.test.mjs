// Rule tests for the two-player games (run with: npm run test:games).
import test from 'node:test';
import assert from 'node:assert/strict';
import hex from '../web/games/hex.js';
import y from '../web/games/y.js';
import havannah, { winKind } from '../web/games/havannah.js';
import gomoku from '../web/games/gomoku.js';
import reversi from '../web/games/reversi.js';
import amazons from '../web/games/amazons.js';

const ALL = { hex, y, havannah, gomoku, reversi, amazons };
const play = (def, s, ...moves) => moves.reduce((st, m) => def.apply(st, m), s);

test('every game finishes from random play and never offers an illegal state', () => {
  for (const [name, def] of Object.entries(ALL)) {
    for (let g = 0; g < 8; g++) {
      let s = def.init(Object.fromEntries((def.options || []).map((o) => [o.id, o.def])));
      let guard = 0;
      while (!def.result(s)) {
        const ms = def.moves(s);
        assert.ok(ms.length > 0, `${name}: no moves but game not over`);
        s = def.apply(s, ms[Math.floor(Math.random() * ms.length)]);
        assert.ok(++guard < 2000, `${name}: did not terminate`);
      }
      const r = def.result(s);
      assert.ok([-1, 0, 1].includes(r.winner), `${name}: bad winner`);
    }
  }
});

test('hex: red wins top to bottom, blue needs left to right', () => {
  const n = 7;
  let s = hex.init({ n, swap: 0 });
  // Red goes down column 3; Blue plays elsewhere on row 0..
  for (let r = 0; r < n; r++) {
    s = hex.apply(s, r * n + 3);                      // red
    assert.equal(hex.result(s) === null, r < n - 1);
    if (r < n - 1) s = hex.apply(s, r * n + 0);       // blue, column 0 (never completes)
  }
  assert.equal(hex.result(s).winner, 0);

  let t = hex.init({ n, swap: 0 });
  for (let c = 0; c < n; c++) {
    t = hex.apply(t, 0 * n + c === 0 ? 1 : n + c);    // red scatter on row 1..: keep it from connecting
    if (c < n - 1) t = hex.apply(t, 3 * n + c);       // blue along row 3
    else t = hex.apply(t, 3 * n + c);
  }
  assert.equal(hex.result(t)?.winner, 1);
});

test('hex: swap rule transposes the first stone and hands the move back', () => {
  let s = hex.init({ n: 9, swap: 1 });
  s = hex.apply(s, 2 * 9 + 5);
  assert.ok(s.swapAvail && hex.moves(s).includes('swap'));
  s = hex.apply(s, 'swap');
  assert.equal(s.b[5 * 9 + 2], 2);
  assert.equal(s.b[2 * 9 + 5], 0);
  assert.equal(s.turn, 0);
  assert.ok(!s.swapAvail);
});

test('y: a chain touching all three sides wins', () => {
  const n = 6, idx = (r, c) => (r * (r + 1)) / 2 + c;
  let s = y.init({ n, swap: 0 });
  // Red: left edge down to the bottom-left corner... plus the bottom row and the right edge.
  const chain = [idx(0, 0), idx(1, 0), idx(2, 0), idx(3, 0), idx(4, 0), idx(5, 0), idx(5, 1), idx(5, 2), idx(5, 3), idx(5, 4), idx(5, 5)];
  const blue = [idx(2, 1), idx(3, 1), idx(3, 2), idx(4, 1), idx(4, 2), idx(4, 3), idx(2, 2)];
  let bi = 0;
  for (let i = 0; i < chain.length; i++) {
    s = y.apply(s, chain[i]);
    if (i < chain.length - 1) s = y.apply(s, blue[bi++ % blue.length] === chain[i] ? idx(1, 1) : blue[bi - 1]);
  }
  assert.equal(y.result(s)?.winner, 0);
});

test('havannah: bridge, fork and ring are detected; a lone line is not', () => {
  const side = 5, R = 4;
  // Build a board from axial coords.
  const cells = [];
  for (let r = -R; r <= R; r++) for (let q = -R; q <= R; q++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= R) cells.push([q, r]);
  const at = (q, r) => cells.findIndex(([a, b]) => a === q && b === r);
  const board = (list, v = 1) => { const b = new Uint8Array(cells.length); for (const [q, r] of list) b[at(q, r)] = v; return b; };

  // Bridge: along the row r=0 from corner (-4,0) to corner (4,0).
  const row = []; for (let q = -4; q <= 4; q++) row.push([q, 0]);
  assert.equal(winKind(board(row), side, 1), 'bridge');
  assert.equal(winKind(board(row.slice(0, 8)), side, 1), null);

  // Ring: the six neighbours of the centre.
  const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  assert.equal(winKind(board(ring), side, 1), 'ring');
  assert.equal(winKind(board(ring.slice(0, 5)), side, 1), null);

  // Fork: three spokes from the centre to three non-corner sides (sides x=+4 / y=+4 / z=-4 etc.).
  const fork = [[0, 0], [1, 0], [2, 0], [3, 0], [4, -1],    // towards the side q+r = 3.. (edge cell (4,-1))
    [-1, 1], [-2, 2], [-3, 3], [-4, 3],                      // towards the opposite side
    [0, -1], [0, -2], [1, -3], [2, -4]];                     // up and out
  const k = winKind(board(fork), side, 1);
  assert.ok(k === 'fork' || k === 'bridge', `expected a win, got ${k}`);
});

test('gomoku: five in a row wins in every direction; four does not', () => {
  const n = 15;
  const line = (dx, dy, len) => Array.from({ length: len }, (_, k) => (3 + dy * k) * n + 3 + dx * k);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const start = dy === -1 ? 8 : 3;
    const cellsOf = (len) => Array.from({ length: len }, (_, k) => (start + dy * k) * n + 3 + dx * k);
    for (const len of [4, 5]) {
      let s = gomoku.init({ n });
      const mine = cellsOf(len);
      mine.forEach((m, i) => { s = gomoku.apply(s, m); if (i < len - 1 || len === 4) s = gomoku.apply(s, 14 * n + i); });
      assert.equal(gomoku.result(s)?.winner ?? null, len === 5 ? 0 : null, `dir ${dx},${dy} len ${len}`);
    }
  }
  assert.ok(line(1, 0, 3).length === 3);
});

test('reversi: opening moves, flips, scoring', () => {
  const s = reversi.init();
  assert.deepEqual(reversi.moves(s).sort((a, b) => a - b), [19, 26, 37, 44]);
  const s2 = reversi.apply(s, 19);                // black plays d3 and flips d4
  assert.equal(s2.b[27], 1);
  assert.equal(s2.turn, 1);
  assert.equal(s2.b.filter((v) => v === 1).length, 4);
  assert.equal(s2.b.filter((v) => v === 2).length, 1);
  assert.equal(reversi.result(s2), null);
});

test('reversi: a player with no move passes', () => {
  // Only white discs a1..: black has no flips, white has none either -> game over; give white a move to test pass.
  const b = new Uint8Array(64);
  b[0] = 1; b[1] = 2;                // black at a1, white at b1: black can't move; white can play... c1? needs black on far side: no.
  b[2] = 0;
  const s = { b, turn: 0, last: -1, flipped: [] };
  // Black to move: black flips? black needs to trap white (b1) between black stones: play c1 -> a1 black, b1 white, c1 black -> legal.
  assert.deepEqual(reversi.moves(s), [2]);
  const stuck = { b: Uint8Array.from({ length: 64 }, (_, i) => (i === 0 ? 2 : i === 1 ? 1 : 0)), turn: 0, last: -1, flipped: [] };
  // Black b1, White a1: black can't flip anything; white can play c1 (trapping b1).
  assert.deepEqual(reversi.moves(stuck), ['pass']);
  assert.equal(reversi.apply(stuck, 'pass').turn, 1);
});

test('amazons: opening move count, a full move, and being trapped loses', () => {
  const s = amazons.init();
  const ms = amazons.moves(s);
  assert.ok(ms.length > 1000);
  const [from, to, arrow] = ms[0];
  const s2 = amazons.apply(s, [from, to, arrow]);
  assert.equal(s2.b[to], 1);
  assert.equal(s2.b[from], 0);
  assert.equal(s2.b[arrow], 3);
  assert.equal(s2.turn, 1);
  // Trap: put Black's queens in a corner with every neighbour burned.
  const b = new Uint8Array(100);
  b[0] = 2; b[1] = 3; b[10] = 3; b[11] = 3;
  b[99] = 1;
  assert.equal(amazons.result({ b, turn: 1, last: null }).winner, 0);
  assert.equal(amazons.result({ b, turn: 0, last: null }), null);
});
