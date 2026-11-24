// Hand-curated presentation metadata layered over what upstream provides
// (display name / description / objective, parsed from its CMakeLists.txt).

export const CATEGORIES = [
  { id: 'numbers', label: 'Numbers' },
  { id: 'logic', label: 'Grid logic' },
  { id: 'loops', label: 'Loops & paths' },
  { id: 'regions', label: 'Regions' },
  { id: 'action', label: 'Action & sliding' },
];

// category: one of CATEGORIES.
// modes:    pointer buttons worth offering on touch screens (left/right/middle).
//           Omit for the default [left, right]; [] for games that need only taps.
// keypad:   'digits' | 'dpad' | 'undead' - on-screen keys for touch screens.
// pencil:   keypad gets a pencil-mark toggle (sends 'M').
export const META = {
  // modes pen/pencil/erase (digit games): pencil = right button, erase = tap a cell then clear it.
  // digitColours: offer a "colour each digit" toggle (drawn by skins.js).
  solo: { category: 'numbers', keypad: 'digits', pencil: true, modes: ['pen', 'pencil', 'erase'], digitColours: true },
  keen: { category: 'numbers', keypad: 'digits', pencil: true, modes: ['pen', 'pencil', 'erase'], digitColours: true },
  towers: { category: 'numbers', keypad: 'digits', pencil: true, modes: ['pen', 'pencil', 'erase'], digitColours: true },
  unequal: { category: 'numbers', keypad: 'digits', pencil: true, modes: ['pen', 'pencil', 'erase'], digitColours: true },
  filling: { category: 'numbers', keypad: 'digits', modes: ['pen', 'erase'], digitColours: true },
  range: { category: 'numbers' },
  singles: { category: 'numbers' },
  dominosa: { category: 'numbers' },

  lightup: { category: 'logic' },
  mines: { category: 'logic', modes: ['left', 'right', 'middle'] },
  tents: { category: 'logic' },
  undead: { category: 'logic', keypad: 'undead' },
  magnets: { category: 'logic', modes: ['left', 'right', 'middle'] },
  unruly: { category: 'logic' },
  pattern: { category: 'logic' },
  mosaic: { category: 'logic' },
  blackbox: { category: 'logic', modes: ['left', 'right'] },
  guess: { category: 'logic', modes: [] },

  loopy: { category: 'loops' },
  slant: { category: 'loops' },
  pearl: { category: 'loops' },
  tracks: { category: 'loops' },
  bridges: { category: 'loops' },
  net: { category: 'loops', modes: ['left', 'right', 'middle'] },
  signpost: { category: 'loops' },

  rect: { category: 'regions' },
  galaxies: { category: 'regions' },
  palisade: { category: 'regions' },
  map: { category: 'regions' },

  fifteen: { category: 'action', modes: [] },
  sixteen: { category: 'action', modes: [] },
  twiddle: { category: 'action', modes: [] },
  netslide: { category: 'action', modes: [] },
  cube: { category: 'action', modes: [], keypad: 'dpad' },
  inertia: { category: 'action', modes: [], keypad: 'dpad' },
  pegs: { category: 'action', modes: [] },
  samegame: { category: 'action', modes: [] },
  flood: { category: 'action', modes: [] },
  flip: { category: 'action', modes: [] },
  untangle: { category: 'action', modes: [] },
};
