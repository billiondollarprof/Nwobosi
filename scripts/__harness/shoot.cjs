/* Screenshots the harness at a phone width and a desktop width, in both
   themes, and writes them to /tmp. Start the harness first:

     npx vite --config vite.harness.config.js

   Run from the project root, because it needs the project's own playwright.
   It also prints scrollWidth against the viewport at each width, since a
   screenshot cannot see content clipped off the right edge. For the public
   routes use scripts/overflow-audit.cjs instead, which measures real
   element edges rather than the document. */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errs = [];
  for (const [w, h, name] of [[390, 900, 'phone'], [1280, 900, 'desktop']]) {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: theme });
      page.on('pageerror', e => errs.push(`${name}/${theme}: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error') errs.push(`${name}/${theme} console: ${m.text()}`); });
      await page.addInitScript((t) => {
        try { window.localStorage.setItem('stellaxafe.theme', t); } catch {}
      }, theme);
      await page.goto('http://localhost:5301/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      // open the first thread so the flagged question shows
      const row = page.locator('button', { hasText: 'Amara Okeke' }).first();
      if (await row.count()) { await row.click(); await page.waitForTimeout(700); }
      await page.screenshot({ path: `/tmp/claude-0/${name}-${theme}.png`, fullPage: true });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(`${name}/${theme} scrollWidth=${sw} viewport=${w}`);
      await page.close();
    }
  }
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n')); else console.log('no page errors');
  await browser.close();
})();
