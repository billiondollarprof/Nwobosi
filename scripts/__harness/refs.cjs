/* REFERENCES BEHIND A QR CODE.

   Anthony, 2026-11-22: a one pager stays one page; its references go to
   their own page and a QR code on the page leads to them.

   Walks:
     1. A one page PDF with references: the list is saved, and the document
        carries the QR card (its link) instead of the list.
     2. A two page PDF keeps its references as a list.
     3. The page a QR code opens shows the list, with its links.
     4. A wrong code says the list was not found, and nothing else.

   Screenshot of the page: /tmp/claude-0/refs-page.png */

const { chromium } = require('playwright');
const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const DOC = [
  '# Hotel plan', '', 'What it is.', '', '## Why', 'Because it helps.', '',
  ':::references',
  '- Rural Electrification Agency, Mini grid report, 2025. https://rea.example.org/report',
  '- Company price list, 2026.',
  ':::',
].join('\n');

async function build(browser, ask) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([doc]) => {
    window.__SCRIPT = {
      orient: ['If I understand, you want a hotel plan.\nOFFER_INTERVIEW'],
      analyse: ['**What:** a hotel plan.\nFORMAT: pdf\nREADBACK_COMPLETE'],
      brief: ['WHAT IS BEING MADE: a plan'],
      generate: [doc],
      look: ['ALL CLEAR'],
    };
  }, [DOC]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('textarea').first().fill(ask);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Go ahead with' }).first().click();
  await page.waitForTimeout(9000);
  await page.locator('button', { hasText: 'Show it here' }).first().click();
  await page.waitForTimeout(600);
  return { page, errs };
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());

  /* 1. One pager: behind a QR code. */
  {
    const { page, errs } = await build(browser, 'A one page plan for hotels');
    const saved = await page.evaluate(() => window.__rows('document_references'));
    check(`ONE PAGE: the list was saved (${saved.length})`, saved.length === 1 && saved[0].items.length === 2);
    check('ONE PAGE: the saved list keeps its web address', saved[0]?.items?.[0]?.url === 'https://rea.example.org/report');
    check('ONE PAGE: the document shows the link instead', (await page.locator('a[href^="https://stellaxafe.com/r/"]').count()) === 1);
    check('ONE PAGE: the list itself is off the page', (await page.locator('text=Mini grid report').count()) === 0);
    check('ONE PAGE: no page errors', errs.length === 0);
    await page.close();
  }

  /* 2. Longer document: the list stays a list. */
  {
    const { page, errs } = await build(browser, 'A three page plan for hotels');
    const saved = await page.evaluate(() => window.__rows('document_references'));
    check('LONGER: nothing saved', saved.length === 0);
    check('LONGER: the references print as a list', (await page.locator('text=Mini grid report').count()) === 1);
    check('LONGER: their years are not flagged as unchecked numbers', (await page.locator('text=2025 is not in your sources').count()) === 0);
    check('LONGER: no page errors', errs.length === 0);
    await page.close();
  }

  /* 3. The page a QR code opens. */
  for (const w of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://localhost:5301/?page=refs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    check(`PAGE ${w}: the title`, (await page.locator('text=Hotel pricing, one page').count()) === 1);
    check(`PAGE ${w}: who it is from`, (await page.locator('text=From Greenwich').count()) === 1);
    check(`PAGE ${w}: the reference with its link`, (await page.locator('a[href="https://rea.example.org/report"]').count()) === 1);
    check(`PAGE ${w}: the one without a link`, (await page.locator('text=Company price list, 2026.').count()) === 1);
    check(`PAGE ${w}: no sideways scroll`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    check(`PAGE ${w}: no page errors`, errs.length === 0);
    if (w === 390) await page.screenshot({ path: '/tmp/claude-0/refs-page.png', fullPage: true });
    await page.close();
  }

  /* 4. A wrong code. */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('http://localhost:5301/?page=refs&code=ffffffffffffffffffffffffffffffff', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    check('WRONG CODE: says it was not found', (await page.locator('text=These references were not found').count()) === 1);
    check('WRONG CODE: shows no list', (await page.locator('text=Hotel pricing').count()) === 0);
    await page.close();
  }

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
