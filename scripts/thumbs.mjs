#!/usr/bin/env node
// Generates web/thumbs/<puzzle>.png by loading each built puzzle in headless
// Chrome and screenshotting its canvas. Needs: npm i, and Chrome installed
// (set CHROME_PATH if it isn't in the default macOS/Linux location).
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'web', 'thumbs');
mkdirSync(outDir, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');

const gamesOnly = process.argv.includes('--games');   // only (re)make the two-player thumbnails
const names = gamesOnly ? [] : readdirSync(join(root, 'docs', 'p')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const gameNames = readdirSync(join(root, 'docs', 'g')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const server = await serve(8099);
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  for (const theme of ['light', 'dark']) {
    for (const name of names) {
      const page = await browser.newPage();
      await page.setViewport({ width: 560, height: 640, deviceScaleFactor: 2 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      await page.evaluateOnNewDocument((t) => localStorage.setItem('stg-theme', t), theme);
      page.on('pageerror', (e) => console.log(`  [${name}/${theme}] pageerror:`, e.message));
      await page.goto(`http://localhost:8099/p/${name}.html`);
      try {
        await page.waitForFunction(() => document.getElementById('puzzle')?.style.visibility === 'visible', { timeout: 15000 });
      } catch {
        console.log(`  [${name}/${theme}] did not start, skipping`);
        await page.close();
        continue;
      }
      await new Promise((r) => setTimeout(r, 400));
      const canvas = await page.$('#puzzlecanvas');
      await canvas.screenshot({ path: join(outDir, theme === 'dark' ? `${name}-dark.png` : `${name}.png`), type: 'png' });
      await page.close();
      console.log('thumb', theme, name);
    }
    // Two-player games: play a dozen random moves so the board isn't empty.
    for (const name of gameNames) {
      const page = await browser.newPage();
      await page.setViewport({ width: 560, height: 700, deviceScaleFactor: 2 });
      await page.evaluateOnNewDocument((t) => localStorage.setItem('stg-theme', t), theme);
      page.on('pageerror', (e) => console.log(`  [${name}/${theme}] pageerror:`, e.message));
      await page.goto(`http://localhost:8099/g/${name}.html`);
      await page.waitForSelector('#boardsvg [data-c]');
      await page.evaluate((n) => {
        const g = window.stgGame;
        for (let i = 0; i < n; i++) {
          if (g.def.result(g.state)) break;
          const ms = g.def.moves(g.state).filter((x) => x !== 'swap' && x !== 'pass');
          if (!ms.length) break;
          g.commit(ms[Math.floor(Math.random() * ms.length)]);
        }
      }, name === 'gomoku' ? 22 : name === 'reversi' ? 14 : name === 'amazons' ? 8 : 16);
      await new Promise((r) => setTimeout(r, 400));
      await (await page.$('#boardsvg')).screenshot({ path: join(outDir, theme === 'dark' ? `${name}-dark.png` : `${name}.png`), type: 'png' });
      await page.close();
      console.log('thumb', theme, name);
    }
  }
} finally {
  await browser.close();
  server.close();
}
