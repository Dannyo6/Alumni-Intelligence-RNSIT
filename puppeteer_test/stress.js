const puppeteer = require('puppeteer');
const path = require('path');

const OUT = process.argv[2];
const BASE = process.env.TEST_BASE_URL || 'http://localhost:5212/preview.html';
const route = (r) => `${BASE}?p=${encodeURIComponent(r)}`;

const VIEWPORTS = {
  desktop: { width: 1920, height: 1400 },
  laptop: { width: 1440, height: 1000 },
  tablet: { width: 834, height: 1200 },
  mobile: { width: 390, height: 900 },
};

const PAGES = [
  ['dashboard', '/'],
  ['directory', '/directory'],
  ['dq-overview', '/data-quality'],
  ['dq-records', '/data-quality?filter=needs_verification'],
  ['admin-users', '/admin?tab=users'],
  ['admin-dupes', '/admin?tab=duplicates'],
  ['admin-verify', '/admin?tab=verification'],
  ['admin-audit', '/admin?tab=audit'],
  ['admin-imports', '/admin?tab=imports'],
  ['import', '/import'],
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const problems = [];
  let shots = 0;

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const theme of ['light', 'dark']) {
      for (const [name, r] of PAGES) {
        const page = await browser.newPage();
        await page.setViewport(vp);
        await page.evaluateOnNewDocument((t) => {
          try { localStorage.setItem('rnsit-alumni-theme', t); } catch (e) {}
        }, theme);
        const errs = [];
        page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 150)));
        page.on('console', (m) => {
          const t = m.text();
          if (m.type() === 'error' && !t.includes('404')) errs.push('console: ' + t.slice(0, 150));
        });

        await page.goto(route(r), { waitUntil: 'networkidle0' });
        await new Promise((x) => setTimeout(x, 1800));

        const a = await page.evaluate(() => {
          // Any element whose content spills outside its own box horizontally
          const clipped = [];
          for (const el of Array.from(document.querySelectorAll('td,th,button,span,p,h1,h2,h3,div')).slice(0, 2500)) {
            if (el.children.length) continue;
            if (!el.textContent || el.textContent.trim().length < 4) continue;
            const cs = getComputedStyle(el);
            if (cs.overflow === 'visible' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
              clipped.push(el.textContent.trim().slice(0, 34));
            }
          }
          return {
            pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
              ? `${document.documentElement.scrollWidth}>${window.innerWidth}` : null,
            clipped: clipped.slice(0, 3),
            chars: document.body.innerText.length,
          };
        });

        if (errs.length) problems.push(`${vpName}/${theme}/${name}: JS ${JSON.stringify(errs)}`);
        if (a.pageOverflow) problems.push(`${vpName}/${theme}/${name}: PAGE OVERFLOW ${a.pageOverflow}`);
        if (a.clipped.length) problems.push(`${vpName}/${theme}/${name}: text spills box ${JSON.stringify(a.clipped)}`);
        if (a.chars < 150) problems.push(`${vpName}/${theme}/${name}: nearly empty (${a.chars})`);

        // Keep one capture per page per theme at laptop + mobile only
        if (vpName === 'laptop' || vpName === 'mobile') {
          await page.screenshot({ path: path.join(OUT, `s-${name}-${theme}-${vpName}.png`) });
          shots++;
        }
        await page.close();
      }
    }
    console.log(`${vpName} (${vp.width}x${vp.height}) swept`);
  }

  // Resize-crossing: constellation must start when the panel becomes visible
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844 });
  await p.goto(process.env.TEST_APP_URL || 'http://localhost:5180/', { waitUntil: 'networkidle0' });
  await new Promise((x) => setTimeout(x, 1200));
  const hiddenBuf = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c.width, h: c.height };
  });
  await p.setViewport({ width: 1440, height: 900 });
  await new Promise((x) => setTimeout(x, 2500));
  const shownLit = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, Math.min(c.width, 800), Math.min(c.height, 800)).data;
    let lit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) lit++;
    return { w: c.width, h: c.height, lit };
  });
  const restarts = shownLit.lit > 200;
  console.log(`\nresize mobile->laptop: hidden=${JSON.stringify(hiddenBuf)} shown=${JSON.stringify(shownLit)} restarts=${restarts}`);
  if (!restarts) problems.push('constellation did NOT restart after resizing up past the lg breakpoint');
  await p.close();

  console.log(`\nscreenshots: ${shots}`);
  console.log('\n=== PROBLEMS ===');
  console.log(problems.length ? problems.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
