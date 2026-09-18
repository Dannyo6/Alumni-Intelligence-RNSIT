const puppeteer = require('puppeteer');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:5212/preview.html';
const route = (r) => `${BASE}?p=${encodeURIComponent(r)}`;
const results = [];
const check = (n, pass, d = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const errors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 150)));

  // ── DASHBOARD: drilldown from a chart bar ─────────────────────────────────
  await page.goto(route('/'), { waitUntil: 'networkidle0' });
  await wait(2600);
  const kpis = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      hero: /6,472/.test(t),
      reach: /89%|Directly reachable/.test(t),
      share: /% of the network/.test(t),
      bars: document.querySelectorAll('.recharts-bar-rectangle path').length,
    };
  });
  check('dashboard renders hero + signals + charts', kpis.hero && kpis.share && kpis.bars > 20, JSON.stringify(kpis));

  await page.evaluate(() => {
    const bar = document.querySelector('.recharts-bar-rectangle path');
    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await wait(1400);
  const drilled = page.url();
  check('chart bar click drills into Directory', /directory/.test(decodeURIComponent(drilled)), decodeURIComponent(drilled).slice(-60));

  // ── DIRECTORY: search -> chip -> profile -> back ──────────────────────────
  await page.goto(route('/directory'), { waitUntil: 'networkidle0' });
  await wait(2200);
  await page.type('input[aria-label="Search alumni"]', 'Venkatasubramanian');
  await wait(1500);
  const searched = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
  check('directory search runs against the service', searched > 0, `rows=${searched}`);

  // Long-value row opens and renders without breaking the panel
  await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('tbody tr'))
      .find((r) => r.innerText.includes('Venkatasubramanian')) || document.querySelector('tbody tr');
    row.click();
  });
  await wait(1200);
  const panel = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      rightAligned: Math.abs(r.right - window.innerWidth) < 4,
      withinViewport: r.left >= 0 && r.width <= window.innerWidth,
      spills: d.scrollWidth > d.clientWidth + 2,
      hasTrajectory: d.innerText.includes('→'),
      chars: d.innerText.length,
    };
  });
  check('long-name profile opens as a right panel', Boolean(panel?.rightAligned));
  check('profile panel does not spill horizontally', panel && !panel.spills, JSON.stringify(panel));

  await page.keyboard.press('Escape');
  await wait(600);
  check('Escape returns to the list', !(await page.$('[role="dialog"]')));

  // ── DATA QUALITY: triage -> records -> profile -> back to queue ───────────
  await page.goto(route('/data-quality'), { waitUntil: 'networkidle0' });
  await wait(2400);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /^\d\d/.test(x.innerText.trim()));
    b.click();
  });
  await wait(2000);
  const rec = await page.evaluate(() => ({
    rows: document.querySelectorAll('tbody tr').length,
    missingShown: /Missing (Email|Company|Mobile|Location|Batch)/.test(document.body.innerText),
    crumb: document.body.innerText.includes('Quality overview'),
  }));
  check('triage drills into affected records', rec.rows > 0, JSON.stringify(rec));
  check('missing fields render as explicit labels', rec.missingShown);

  // open a profile from the queue, then return
  await page.evaluate(() => {
    const b = document.querySelector('tbody button.text-accent-ink, tbody button');
    b.click();
  });
  await wait(1200);
  const openedFromQueue = Boolean(await page.$('[role="dialog"]'));
  await page.keyboard.press('Escape');
  await wait(600);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => x.innerText.trim() === 'Quality overview');
    if (b) b.click();
  });
  await wait(1400);
  const backAtQueue = await page.evaluate(() => /critical, .* warning/.test(document.body.innerText));
  check('record opens from the queue', openedFromQueue);
  check('breadcrumb returns to the triage queue', backAtQueue);

  // ── ADMIN: every tab loads, audit counts present on all of them ───────────
  for (const tab of ['users', 'imports', 'duplicates', 'verification', 'audit']) {
    await page.goto(route(`/admin?tab=${tab}`), { waitUntil: 'networkidle0' });
    await wait(1800);
    const st = await page.evaluate(() => ({
      chars: document.body.innerText.length,
      badge: /Duplicate Review\s*37|Verification Queue\s*517/.test(document.body.innerText.replace(/\n/g, ' ')),
    }));
    check(`admin/${tab} loads with pending counts`, st.chars > 400 && st.badge, JSON.stringify(st));
  }

  // ── IMPORT: staged walkthrough ───────────────────────────────────────────
  await page.goto(route('/import'), { waitUntil: 'networkidle0' });
  await wait(1500);
  let stages = 0;
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => x.innerText.includes('Next stage'));
      if (b && !b.disabled) b.click();
    });
    await wait(700);
    stages++;
  }
  const atLast = await page.evaluate(() => ({
    promo: document.body.innerText.includes('Canonical promotion'),
    nextDisabled: Array.from(document.querySelectorAll('button')).find((x) => x.innerText.includes('Next stage'))?.disabled,
    count: /3 \/ 3/.test(document.body.innerText),
  }));
  check('import stepper walks to the final stage', atLast.promo && atLast.count, JSON.stringify(atLast));
  check('import stepper stops at the last stage', atLast.nextDisabled === true);

  console.log(results.join('\n'));
  console.log('\nJS errors: ' + (errors.length ? JSON.stringify(errors) : 'none'));
  console.log(results.some((r) => r.startsWith('FAIL')) ? '\n>>> SOME CHECKS FAILED' : '\n>>> ALL CHECKS PASSED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
