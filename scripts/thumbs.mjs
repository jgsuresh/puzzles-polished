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

const names = readdirSync(join(root, 'docs', 'p')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const server = await serve(8099);
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  for (const name of names) {
    const page = await browser.newPage();
    await page.setViewport({ width: 560, height: 640, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(() => localStorage.setItem('stg-theme', 'light'));
    page.on('pageerror', (e) => console.log(`  [${name}] pageerror:`, e.message));
    await page.goto(`http://localhost:8099/p/${name}.html`);
    try {
      await page.waitForFunction(() => document.getElementById('puzzle')?.style.visibility === 'visible', { timeout: 15000 });
    } catch {
      console.log(`  [${name}] did not start, skipping`);
      await page.close();
      continue;
    }
    await new Promise((r) => setTimeout(r, 400));
    const canvas = await page.$('#puzzlecanvas');
    await canvas.screenshot({ path: join(outDir, `${name}.png`), type: 'png' });
    await page.close();
    console.log('thumb', name);
  }
} finally {
  await browser.close();
  server.close();
}
