const puppeteer = require('puppeteer');
const URL = process.env.TEST_APP_URL || 'http://localhost:5180/';

async function measure(label, opts) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(opts.viewport);
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // Count rAF callbacks over 3s => effective animation frame rate
  const frames = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else resolve(n); };
    requestAnimationFrame(tick);
  }));

  const m1 = await page.metrics();
  await new Promise((r) => setTimeout(r, 3000));
  const m2 = await page.metrics();
  const cpuSec = (m2.TaskDuration - m1.TaskDuration);

  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { exists: false };
    const r = c.getBoundingClientRect();
    return {
      exists: true,
      visible: r.width > 0 && r.height > 0,
      cssW: Math.round(r.width), cssH: Math.round(r.height),
      bufW: c.width, bufH: c.height,
    };
  });

  console.log(`${label.padEnd(34)} rAF/3s=${String(frames).padStart(4)}  cpu/3s=${cpuSec.toFixed(3)}s  canvas=${JSON.stringify(canvas)}`);
  await browser.close();
  return { frames, cpuSec, canvas };
}

(async () => {
  await measure('laptop 1440x900', { viewport: { width: 1440, height: 900 } });
  await measure('laptop + reduced-motion', { viewport: { width: 1440, height: 900 }, reducedMotion: true });
  await measure('tablet 834x1112', { viewport: { width: 834, height: 1112 } });
  await measure('mobile 390x844', { viewport: { width: 390, height: 844 } });
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
