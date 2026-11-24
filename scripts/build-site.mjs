#!/usr/bin/env node
// Assembles docs/ (the deployable static site) from:
//   .build/*.js|*.wasm     compiled puzzles
//   .upstream/             puzzle metadata + how-to-play text
//   web/                   our templates, CSS and JS
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CATEGORIES, META } from './puzzles-meta.mjs';
import { HINTS } from './hints.mjs';
import { GAMES } from './games-meta.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const up = join(root, '.upstream');
const buildDir = join(root, '.build');
const web = join(root, 'web');
const out = join(root, 'docs');

// ---- 1. Puzzle list from upstream's CMakeLists.txt ----
const cmake = readFileSync(join(up, 'CMakeLists.txt'), 'utf8')
  .split('\n').slice(0, 280).join('\n'); // main list only; unfinished/ comes later
const re = /^puzzle\((\w+)(?:\s+#[^\n]*|\s+WINDOWS_EXE_NAME\s+\w+)*\s+DISPLAYNAME "([^"]+)"\s+DESCRIPTION "([^"]+)"\s+OBJECTIVE "((?:[^"\\]|\\[\s\S])*)"/gm;
const puzzles = [];
for (const m of cmake.matchAll(re)) {
  const [, name, title, description, rawObjective] = m;
  const objective = rawObjective.replace(/\\\n/g, '').replace(/\s+/g, ' ').trim();
  const meta = META[name];
  if (!meta) { console.warn(`! no META for "${name}", skipping`); continue; }
  if (!existsSync(join(buildDir, `${name}.wasm`))) { console.warn(`! ${name}.wasm missing, skipping`); continue; }

  // How-to-play text: first line is the name, the rest is an HTML fragment.
  const htmlPath = join(up, 'html', `${name}.html`);
  let help = '';
  if (existsSync(htmlPath)) {
    help = readFileSync(htmlPath, 'utf8').split('\n').slice(1).join('\n')
      .replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '')   // upstream's links point at its own docs tree
      .replace(/<p>\s*\n/g, '<p>').trim();
    // The fragment uses unclosed <p> tags; close them so layout is predictable.
    help = help.split(/<p>/i).filter((s) => s.trim()).map((s) => `<p>${s.trim()}</p>`).join('\n');
  }
  puzzles.push({ name, title, description, objective, category: meta.category, help, meta });
}
puzzles.sort((a, b) => a.title.localeCompare(b.title));
if (puzzles.length < 30) throw new Error(`Only found ${puzzles.length} puzzles - did the WASM build succeed?`);

// ---- 2. Output tree ----
rmSync(join(out, 'p'), { recursive: true, force: true });
rmSync(join(out, 'g'), { recursive: true, force: true });
for (const d of ['p', 'g', 'css', 'js', 'thumbs']) mkdirSync(join(out, d), { recursive: true });

copyFileSync(join(web, 'icon.svg'), join(out, 'icon.svg'));
copyFileSync(join(web, 'css/app.css'), join(out, 'css/app.css'));
for (const f of ['puzzle-ui.js', 'skins.js', 'home.js']) copyFileSync(join(web, 'js', f), join(out, 'js', f));
if (existsSync(join(web, 'thumbs'))) {
  for (const f of readdirSync(join(web, 'thumbs'))) if (f.endsWith('.png')) copyFileSync(join(web, 'thumbs', f), join(out, 'thumbs', f));
}
writeFileSync(join(out, '.nojekyll'), '');

const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// Version our css/js URLs by content so browsers (and GitHub Pages' cache) never mix old and new files.
const stamp = (f) => createHash('md5').update(readFileSync(join(out, f))).digest('hex').slice(0, 8);
const bust = (html) => html.replace(/((?:css|js)\/[\w.-]+\.(?:css|js))"/g, (m, f) => `${f}?v=${stamp(f)}"`);

// ---- 3. Puzzle pages + wasm ----
const tpl = readFileSync(join(web, 'puzzle.html'), 'utf8');
for (const p of puzzles) {
  copyFileSync(join(buildDir, `${p.name}.js`), join(out, 'p', `${p.name}.js`));
  copyFileSync(join(buildDir, `${p.name}.wasm`), join(out, 'p', `${p.name}.wasm`));
  const config = { name: p.name, modes: p.meta.modes ?? ['left', 'right'], keypad: p.meta.keypad ?? null, pencil: !!p.meta.pencil, digitColours: !!p.meta.digitColours, hint: HINTS[p.name] ?? null };
  const html = tpl
    .replaceAll('{{TITLE}}', escText(p.title))
    .replaceAll('{{NAME}}', p.name)
    .replace('{{CONFIG}}', () => jsonForScript(config))
    .replace('{{OBJECTIVE}}', () => escAttr(p.objective))   // first occurrence is in a <meta> attribute
    .replace('{{OBJECTIVE}}', () => escText(p.objective))
    .replace('{{HELP}}', () => p.help);
  writeFileSync(join(out, 'p', `${p.name}.html`), bust(html));
}


// ---- 3b. Two-player games (plain ES modules, no WebAssembly) ----
const gdir = join(web, 'games');
const hashOf = (f) => createHash('md5').update(readFileSync(join(gdir, f))).digest('hex').slice(0, 8);
for (const f of readdirSync(gdir).filter((n) => n.endsWith('.js'))) {
  // Version the relative imports too, so a changed core.js can't pair with a cached game file.
  const src = readFileSync(join(gdir, f), 'utf8').replace(/from '\.\/(\w+)\.js'/g, (m, n) => `from './${n}.js?v=${hashOf(n + '.js')}'`);
  writeFileSync(join(out, 'g', f), src);
}
const gtpl = readFileSync(join(web, 'game.html'), 'utf8');
for (const g of GAMES) {
  const html = gtpl
    .replaceAll('{{TITLE}}', escText(g.title))
    .replaceAll('{{GAME_URL}}', `./${g.name}.js?v=${hashOf(g.name + '.js')}`)
    .replaceAll('{{CORE_URL}}', `./core.js?v=${hashOf('core.js')}`)
    .replace('{{OBJECTIVE}}', () => escAttr(g.objective))
    .replace('{{OBJECTIVE}}', () => escText(g.objective))
    .replace('{{RULES}}', () => g.rules);
  writeFileSync(join(out, 'g', `${g.name}.html`), bust(html));
}

// ---- 4. Home page ----
const data = [
  ...puzzles.map(({ name, title, description, objective, category }) => ({ name, title, description, objective, category })),
  ...GAMES.map(({ name, title, description, objective }) => ({ name, title, description, objective, category: 'twoplayer', href: `g/${name}.html` })),
];
writeFileSync(join(out, 'index.html'), bust(readFileSync(join(web, 'index.html'), 'utf8')
  .replace('{{COUNT}}', String(puzzles.length))
  .replace('{{GAMECOUNT}}', String(GAMES.length))
  .replace('{{DATA}}', () => jsonForScript(data))
  .replace('{{CATEGORIES}}', () => jsonForScript([...CATEGORIES, { id: 'twoplayer', label: 'Two-player' }]))));

console.log(`Built ${puzzles.length} puzzles and ${GAMES.length} two-player games into docs/`);
