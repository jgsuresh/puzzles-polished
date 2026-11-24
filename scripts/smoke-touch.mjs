#!/usr/bin/env node
// Touch smoke test: phone-sized, touch-emulated. Taps/drags the board and checks
// layout (no horizontal overflow, board not hidden behind the dock, controls on screen).
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .filter(Boolean).find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');
const shots = process.env.SHOTS; if (shots) mkdirSync(shots, { recursive: true });

const names = readdirSync(join(root, 'docs', 'p')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const only = process.argv.slice(2);
const server = await serve(8098);
const browser = await puppeteer.launch({ executablePath, headless: true });
let failures = 0;
try {
  for (const name of names.filter((n) => !only.length || only.includes(n))) {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://localhost:8098/p/${name}.html`);
    try {
      await page.waitForFunction(() => document.getElementById('puzzle')?.style.visibility === 'visible', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 250));
      const m = await page.evaluate(() => {
        const r = (s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom }; };
        return { sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight, canvas: r('#puzzlecanvas'), dock: r('.dock'), keypad: r('#keypad'), modes: r('#tapmodes'), status: r('#statusbar') };
      });
      const issues = [];
      if (m.sw > m.vw + 1) issues.push(`horizontal overflow ${m.sw}>${m.vw}`);
      if (!m.canvas) issues.push('no canvas');
      else {
        if (m.canvas.w < 200) issues.push(`canvas narrow ${Math.round(m.canvas.w)}`);
        if (m.dock && m.canvas.b > m.dock.y + 1) issues.push('canvas under dock');
        if (m.canvas.x < -1 || m.canvas.x + m.canvas.w > m.vw + 1) issues.push('canvas off-screen');
      }
      for (const k of ['keypad', 'modes']) if (m[k] && (m[k].x < -1 || m[k].x + m[k].w > m.vw + 1)) issues.push(`${k} off-screen`);
      // touch input: taps and a drag
      const box = await (await page.$('#puzzlecanvas')).boundingBox();
      for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.6]]) await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
      await page.touchscreen.touchStart(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await page.touchscreen.touchMove(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.touchscreen.touchEnd();
      const scrolled = await page.evaluate(() => scrollY);
      if (scrolled > 0) issues.push(`page scrolled by touch on board (${scrolled})`);
      if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
      if (issues.length) errors.push(...issues);
    } catch (e) { errors.push(`did not run: ${e.message.split('\n')[0]}`); }
    if (errors.length) { failures++; console.log(`FAIL ${name}:\n  ` + [...new Set(errors)].slice(0, 4).join('\n  ')); }
    else console.log(`ok   ${name}`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} puzzle(s) failed` : 'all puzzles passed');
process.exit(failures ? 1 : 0);
