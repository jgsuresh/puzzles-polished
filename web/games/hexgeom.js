// Pointy-top hexagon geometry shared by Hex, Y and Havannah. Hex size S = 1.
export const SQ3 = Math.sqrt(3);

// Pixel centre of axial cell (q = column-ish, r = row).
export const hexXY = (q, r) => [SQ3 * (q + r / 2), 1.5 * r];

// Vertices, clockwise from upper-right: 0 UR, 1 LR, 2 bottom, 3 LL, 4 UL, 5 top.
export function hexVerts(cx, cy, s = 1) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 30) * Math.PI) / 180;
    v.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]);
  }
  return v;
}
export const pts = (v) => v.map((p) => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');

export function boundsOf(cells, margin = 1.2) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of cells) {
    x0 = Math.min(x0, x - SQ3 / 2); x1 = Math.max(x1, x + SQ3 / 2);
    y0 = Math.min(y0, y - 1); y1 = Math.max(y1, y + 1);
  }
  return [x0 - margin, y0 - margin, x1 - x0 + 2 * margin, y1 - y0 + 2 * margin];
}

// Neighbour offsets in axial (dq, dr) terms for the layout above.
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
