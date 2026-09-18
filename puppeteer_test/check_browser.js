const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  const targetUrl = process.env.TEST_URL || 'http://localhost:5173/directory';
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.error("Navigation error:", e.message));
  
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'NO ROOT ELEMENT';
  });
  
  console.log("=== ROOT HTML ===");
  console.log(rootHtml);
  console.log("=================");
  
  await browser.close();
})();
