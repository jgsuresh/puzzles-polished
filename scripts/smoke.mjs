#!/usr/bin/env node
// Smoke test: load every puzzle, poke it with clicks/keys, toggle dark mode live,
// start a new game, and fail on any page error. Needs Chrome (see thumbs.mjs).
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .filter(Boolean).find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');

const names = readdirSync(join(root, 'docs', 'p')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const only = process.argv.slice(2);
const server = await serve(8097);
const browser = await puppeteer.launch({ executablePath, headless: true });
let failures = 0;
try {
  for (const name of names.filter((n) => !only.length || only.includes(n))) {
    const page = await browser.newPage();
    await page.setViewport({ width: 560, height: 700 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://localhost:8097/p/${name}.html`);
    try {
      await page.waitForFunction(() => document.getElementById('puzzle')?.style.visibility === 'visible', { timeout: 15000 });
      const box = await (await page.$('#puzzlecanvas')).boundingBox();
      const pts = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.4], [0.4, 0.7], [0.6, 0.6], [0.2, 0.8], [0.8, 0.2]];
      for (const [fx, fy] of pts) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy, { button: 'right' });
      }
      for (const k of ['ArrowRight', 'ArrowDown', '1', 'Enter', ' ']) await page.keyboard.press(k);
      await page.click('#theme-btn');                    // live dark mode
      await new Promise((r) => setTimeout(r, 150));
      await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45);
      await page.click('#theme-btn');                    // and back
      await page.click('#new');                          // new game under the other theme
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) { errors.push(`did not run: ${e.message.split('\n')[0]}`); }
    if (errors.length) { failures++; console.log(`FAIL ${name}:\n  ` + [...new Set(errors)].slice(0, 3).join('\n  ')); }
    else console.log(`ok   ${name}`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} puzzle(s) failed` : 'all puzzles passed');
process.exit(failures ? 1 : 0);
