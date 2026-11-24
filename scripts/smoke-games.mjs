#!/usr/bin/env node
// Plays every two-player game on an emulated phone using real taps: random legal moves
// (preview + Confirm), undo, theme switch, new game. Fails on JS errors or broken layout.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .filter(Boolean).find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');

const names = readdirSync(join(root, 'docs', 'g')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const only = process.argv.slice(2);
const server = await serve(8096);
const browser = await puppeteer.launch({ executablePath, headless: true });
let failures = 0;
try {
  for (const name of names.filter((n) => !only.length || only.includes(n))) {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://localhost:8096/g/${name}.html`);
    try {
      await page.waitForSelector('#boardsvg [data-c]', { timeout: 8000 });
      const box = await (await page.$('#boardsvg')).boundingBox();
      if (box.width < 250 || box.x < -1 || box.x + box.width > 376) errors.push(`board size/position off: ${JSON.stringify(box)}`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push('horizontal overflow');
      let played = 0;
      for (let i = 0; i < 60; i++) {
        const m = await page.evaluate(() => {
          const g = window.stgGame, s = g.state;
          if (g.def.result(s)) return null;
          const ms = g.def.moves(s).filter((x) => x !== 'swap' && x !== 'pass');
          if (!ms.length) return null;
          const m = ms[Math.floor(Math.random() * ms.length)];
          return { taps: g.def.tapSequence ? g.def.tapSequence(s, m) : Array.isArray(m) ? m : [m] };
        });
        if (m === null) break;
        for (const c of m.taps) await (await page.$(`#boardsvg [data-c="${c}"]`)).tap();
        if (!(await page.$eval('#confirm', (e) => e.hidden))) await page.tap('#confirm');
        played++;
      }
      const hist = await page.evaluate(() => !document.getElementById('undo').disabled);
      if (played && !hist) errors.push('moves were not recorded');
      if (played) await page.tap('#undo');
      await page.tap('#theme-btn');
      await page.tap('#theme-btn');
      await page.tap('#new');
      await page.waitForSelector('#newgame[open]');
      await page.tap('#newgame-form button[type=submit]');
      await new Promise((r) => setTimeout(r, 150));
      if (!(await page.evaluate(() => !!window.stgGame.state))) errors.push('no state after new game');
    } catch (e) { errors.push(`did not run: ${e.message.split('\n')[0]}`); }
    if (errors.length) { failures++; console.log(`FAIL ${name}:\n  ` + [...new Set(errors)].slice(0, 4).join('\n  ')); }
    else console.log(`ok   ${name}`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} game(s) failed` : 'all games passed');
process.exit(failures ? 1 : 0);
