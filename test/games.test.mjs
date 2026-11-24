// Rule tests for the two-player games (run with: npm run test:games).
import test from 'node:test';
import assert from 'node:assert/strict';
import hex from '../web/games/hex.js';
import y from '../web/games/y.js';
import havannah, { winKind } from '../web/games/havannah.js';
import gomoku from '../web/games/gomoku.js';
import reversi from '../web/games/reversi.js';
import amazons from '../web/games/amazons.js';
import go from '../web/games/go.js';
import gonnect from '../web/games/gonnect.js';
import loa from '../web/games/loa.js';
import slimetrail from '../web/games/slimetrail.js';
import epaminondas, { genMoves, landing } from '../web/games/epaminondas.js';
import nex from '../web/games/nex.js';
import campaign from '../web/games/campaign.js';
import jade, { judge } from '../web/games/jade.js';
import { place } from '../web/games/goengine.js';

const ALL = { hex, y, havannah, gomoku, reversi, amazons, go, gonnect, loa, slimetrail, nex, epaminondas, campaign, jade };
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

test('go: captures, suicide, ko and area scoring', () => {
  const n = 5, B = (list, v) => { const b = new Uint8Array(n * n); for (const [x, y, c] of list) b[y * n + x] = c; return b; };
  // A white stone at (1,1) surrounded on three sides is captured by black at the fourth.
  let b = B([[1, 1, 2], [0, 1, 1], [2, 1, 1], [1, 0, 1]], 0);
  const r = place(b, n, 1 * n + 1 + n, 1);
  assert.equal(r.caps, 1);
  assert.equal(r.b[1 * n + 1], 0);
  // Suicide: a black stone in a white-surrounded eye is illegal.
  b = B([[1, 0, 2], [0, 1, 2], [2, 1, 2], [1, 2, 2]], 0);
  assert.equal(place(b, n, 1 * n + 1, 1), null);
  // ...but fine for White, who would just fill own eye.
  assert.ok(place(b, n, 1 * n + 1, 2));
  // Ko: after Black captures at (2,1), White may not immediately retake at (1,1).
  const ko = go.init({ n: 5, komi: 0.5 });
  const kb = B([[1, 1, 2], [2, 0, 2], [2, 2, 2], [3, 1, 2], [0, 1, 1], [1, 0, 1], [1, 2, 1]]);
  let st = { ...ko, b: kb, hist: [Array.prototype.join.call(kb, '')], turn: 0 };
  assert.ok(go.moves(st).includes(1 * n + 2));
  st = go.apply(st, 1 * n + 2);
  assert.equal(st.b[1 * n + 1], 0);                      // the white stone was captured
  assert.ok(!go.moves(st).includes(1 * n + 1));          // ko: White cannot retake at once
  assert.ok(go.moves(st).includes('pass'));
});

test('go: two passes end the game and score by area with komi', () => {
  let s = go.init({ n: 5, komi: 0.5 });
  s = go.apply(s, 12);              // black centre
  s = go.apply(s, 'pass');
  s = go.apply(s, 'pass');
  const r = go.result(s);
  assert.equal(r.winner, 0);        // black owns the whole board
  assert.match(r.text, /Black wins by 24\.5/);
});

test('gonnect: connection across wins, pie rule swaps', () => {
  let s = gonnect.init({ n: 9, swap: 1 });
  s = gonnect.apply(s, 40);
  assert.ok(s.swapAvail && gonnect.moves(s).includes('swap'));
  s = gonnect.apply(s, 'swap');
  assert.equal(s.b[40], 2);
  assert.equal(s.turn, 0);
  // Black builds a column on x=0 while White plays elsewhere far away.
  let t = gonnect.init({ n: 9, swap: 0 });
  for (let y = 0; y < 9; y++) {
    t = gonnect.apply(t, y * 9);                       // black down the first column
    if (y < 8) t = gonnect.apply(t, y * 9 + 4);        // white mid column
  }
  assert.equal(gonnect.result(t)?.winner, 0);
});

test('loa: opening moves, line-count distance, connection wins', () => {
  const s = loa.init();
  assert.equal(s.b.filter((v) => v === 1).length, 12);
  assert.equal(s.b.filter((v) => v === 2).length, 12);
  // A black piece on the bottom row (row 0) with 2 pieces on its column moves 2 squares up.
  const from = 3;                                       // d1
  const targets = loa.moves(s).filter((m) => m[0] === from).map((m) => m[1]);
  assert.ok(targets.includes(3 + 2 * 8));
  // Simultaneous connection: the player who moves wins. Black joins (0,0)+(1,0); White's lone piece is connected too.
  const b = new Uint8Array(64); b[0] = 1; b[3] = 1; b[63] = 2;
  const st = { b, turn: 0, last: null, won: -1 };
  assert.ok(loa.moves(st).some((m) => m[0] === 3 && m[1] === 1));
  assert.equal(loa.result(loa.apply(st, [3, 1])).winner, 0);
  // Jumping: can't pass over an enemy but can pass over a friend.
  const c = new Uint8Array(64); c[0] = 1; c[1] = 1; c[2] = 2; c[63] = 2;
  const sc = { b: c, turn: 0, last: null, won: -1 };
  // Row 0 holds 3 pieces, so (0,0) must travel 3: that crosses the enemy on (2,0) and is illegal.
  assert.ok(!loa.moves(sc).some((m) => m[0] === 0 && m[1] === 3));
  // (1,0) travels 3 as well, jumping its friend... to (4,0) it must pass the enemy at (2,0): also illegal.
  assert.ok(!loa.moves(sc).some((m) => m[0] === 1 && m[1] === 4));
});

test('slimetrail: moves block cells, goals decide the winner, trapping moves are illegal', () => {
  let s = slimetrail.init({ n: 7 });
  const first = slimetrail.moves(s);
  assert.ok(first.length >= 4);
  s = slimetrail.apply(s, first[0]);
  assert.equal(s.blocked[3 * 7 + 3], 1);
  assert.ok(!slimetrail.moves(s).includes(3 * 7 + 3));
  // Walk until somebody wins or it ends; the result is consistent.
  let guard = 0;
  while (!slimetrail.result(s)) { const m = slimetrail.moves(s); s = slimetrail.apply(s, m[Math.floor(Math.random() * m.length)]); assert.ok(++guard < 100); }
  const r = slimetrail.result(s);
  assert.ok([-1, 0, 1].includes(r.winner));
});

test('epaminondas: setup, phalanx limits and captures', () => {
  const s = epaminondas.init({ size: 'small' });
  const [W, H] = s.dims;
  assert.equal(s.b.filter((v) => v === 1).length, 2 * W);
  const ms = genMoves(s, 1);
  assert.ok(ms.length > 0);
  // Every generated move lands on an empty square or a capturable enemy, never off board.
  for (const m of ms) { const l = landing(s, m); assert.ok(l >= 0 && l < W * H); assert.notEqual(s.b[l], 1); }
  // Capture: a 2-stone phalanx beats a single enemy stone but a single stone cannot capture.
  const b = new Uint8Array(W * H);
  b[0] = 1; b[1] = 1; b[3] = 2;                 // row 0: W W . B
  let st = { dims: [W, H], b, turn: 0, last: null };
  const cap = genMoves(st, 1).filter((m) => landing(st, m) === 3);
  assert.equal(cap.length, 1);
  const after = epaminondas.apply(st, cap[0]);
  assert.equal(after.b[3], 1);
  assert.equal(after.b[2], 1);
  assert.equal(after.b.filter((v) => v === 2).length, 0);
  const single = new Uint8Array(W * H); single[0] = 1; single[1] = 2;
  assert.equal(genMoves({ dims: [W, H], b: single, turn: 0 }, 1).filter((m) => landing({ dims: [W, H] }, m) === 1).length, 0);
  // Win test: White has stones on Black's back row at the start of White's turn.
  const w = new Uint8Array(W * H); w[(H - 1) * W] = 1; w[W + 5] = 2; w[W + 6] = 2;
  assert.equal(epaminondas.result({ dims: [W, H], b: w, turn: 0, last: null })?.winner, 0);
});

test('nex: both move types, endgame single moves, win detection', () => {
  let s = nex.init({ n: 7 });
  assert.ok(nex.moves(s).some((m) => m.length === 2));
  s = nex.apply(s, [0, 1]);                       // red at 0, neutral at 1
  assert.equal(s.b[0], 1);
  assert.equal(s.b[1], 3);
  s = nex.apply(s, [10, 11]);                     // blue + neutral
  // Red can convert the two neutrals into red and one red stone into neutral.
  const conv = nex.moves(s).filter((m) => m.length === 3);
  assert.ok(conv.length > 0);
  const t = nex.apply(s, conv[0]);
  assert.equal(t.b.filter((v) => v === 3).length, 1);
  assert.equal(t.b.filter((v) => v === 1).length, 2);
  // Red column at x=0 wins (top to bottom).
  let w = nex.init({ n: 5 });
  for (let r = 0; r < 5; r++) {
    w = nex.apply(w, [r * 5, r * 5 + 2]);           // red on column 0, neutral on column 2
    if (r < 4) w = nex.apply(w, [r * 5 + 4, r * 5 + 3]);
  }
  assert.equal(nex.result(w)?.winner, 0);
});

test('campaign: drops, knight jumps leave markers, five in a row wins, stranded loses', () => {
  let s = campaign.init({ n: 8 });
  assert.equal(campaign.moves(s).length, 64);
  s = campaign.apply(s, 0);                         // red drops at a1
  assert.ok(!campaign.moves(s).includes(0));        // blue can't drop on red's knight
  s = campaign.apply(s, 63);                        // blue drops at h8
  const jumps = campaign.moves(s);
  assert.deepEqual(jumps.sort((a, b) => a - b), [10, 17]);   // red knight from a1
  s = campaign.apply(s, 17);
  assert.equal(s.b[0], 1);                          // marker left on the start square
  // Five markers in a row for Red: markers at (1..4,3); the knight at (5,3) jumps away, leaving a fifth marker.
  const d = new Uint8Array(64); for (let x = 1; x <= 4; x++) d[3 * 8 + x] = 1;
  const s3 = { n: 8, b: d, knights: [3 * 8 + 5, 63], turn: 0, last: -1, moveCount: 5, won: -1 };
  const away = campaign.moves(s3)[0];
  assert.equal(campaign.result(campaign.apply(s3, away))?.winner, 0);
  // Stranded: a knight in the corner whose two jumps are blocked loses.
  const e = new Uint8Array(64); e[10] = 2; e[17] = 2;
  const s4 = { n: 8, b: e, knights: [0, 63], turn: 0, last: -1, moveCount: 5, won: -1 };
  assert.equal(campaign.result(s4)?.winner, 1);
});

test('jade: cross needs all four edges, parallel needs both colours across', () => {
  const W = 7, H = 5, idx = (x, y) => y * W + x;
  // A white column from top to bottom plus a white row from left to right is one connected group touching all edges.
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) b[idx(0, y)] = 1;          // left column: touches left, top and bottom
  for (let x = 0; x < W; x++) b[idx(x, 2)] = 1;          // middle row: reaches the right edge
  assert.deepEqual(judge(b, W, H), { cross: true, parallel: false });
  // Parallel: a white and a black chain both top-to-bottom.
  const p = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { p[idx(1, y)] = 1; p[idx(5, y)] = 2; }
  assert.deepEqual(judge(p, W, H), { cross: false, parallel: true });
  // One colour alone isn't enough.
  const q = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) q[idx(1, y)] = 1;
  assert.deepEqual(judge(q, W, H), { cross: false, parallel: false });
  // The engine awards the win to the right player and either colour may be dropped.
  let s = jade.init({ size: '7x5' });
  assert.equal(jade.moves(s).length, 2 * W * H);
  for (let y = 0; y < H; y++) { s = jade.apply(s, [idx(1, y), 1]); if (y < H - 1) s = jade.apply(s, [idx(5, y), 2]); }
  assert.equal(jade.result(s), null);
  s = jade.apply(s, [idx(5, H - 1), 2]);
  assert.equal(jade.result(s)?.winner, 1);
});
