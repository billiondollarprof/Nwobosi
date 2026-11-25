/* THE TIME ON SCREEN, AND THE LINE WHEN IT RUNS LONG.

   Anthony, 2026-11-22: "put an estimate completion time for each task...
   so the person can wait with time in mind." And 2026-11-25: when it says
   it is taking longer than usual, ask for a little patience.

   Walks:
     1. The working line shows the estimate as soon as a turn starts.
     2. A turn well past its estimate says it is taking longer than usual
        and asks the person to bear with it (an estimate of one second is
        seeded so the walk does not wait minutes).
     3. The build card shows how long a build usually takes.

   The working line's screenshot is kept in /tmp/claude-0/timing-line.png. */

const { chromium } = require('playwright');
const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

async function open(browser, { times = null, script = {} } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([t, s]) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    try { if (t) localStorage.setItem('stellaxafe.stageTimes', JSON.stringify(t)); } catch {}
    window.__SCRIPT = s;
  }, [times, script]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { page, errs };
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());

  /* 1. The estimate, from the first second. */
  {
    const { page, errs } = await open(browser);
    await page.evaluate(() => { window.__HANG = true; });
    await page.locator('textarea').first().fill('A one page plan for hotels');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    check('LINE: the estimate shows at once', (await page.locator('text=about 15s').count()) >= 1);
    await page.waitForTimeout(4500);
    check('LINE: then the time so far against it', (await page.locator('text=/\\d+s of about 15s/').count()) >= 1);
    await page.screenshot({ path: '/tmp/claude-0/timing-line.png' });
    check('LINE: no page errors', errs.length === 0);
    await page.close();
  }

  /* 2. Well past the estimate: say so, and ask for patience. */
  {
    const { page, errs } = await open(browser, { times: { orient: [1000, 1000, 1000] } });
    await page.evaluate(() => { window.__HANG = true; });
    await page.locator('textarea').first().fill('A one page plan for hotels');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(17500);
    check('OVERDUE: it says it is taking longer than usual', (await page.locator('text=This is taking longer than usual.').count()) >= 1);
    check('OVERDUE: and asks for a little patience', (await page.locator('text=Please bear with me a little longer.').count()) >= 1);
    check('OVERDUE: no page errors', errs.length === 0);
    await page.close();
  }

  /* 3. The build card's clock. */
  {
    const { page, errs } = await open(browser, { script: {
      orient: ['If I understand, you want pricing for hotels.\nOFFER_INTERVIEW'],
      analyse: ['**What:** pricing.\nFORMAT: pdf\nREADBACK_COMPLETE'],
    } });
    await page.locator('textarea').first().fill('Pricing for hotels');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await page.locator('button', { hasText: 'Yes, start now' }).first().click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__HANG = true; });
    await page.locator('button', { hasText: 'Go ahead with' }).first().click();
    await page.waitForTimeout(1500);
    check('BUILD: the card says it is building', (await page.locator('text=Building it now').count()) === 1);
    check('BUILD: with how long a build usually takes', (await page.locator('text=/about 2 min/').count()) >= 1);
    check('BUILD: no page errors', errs.length === 0);
    await page.close();
  }

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
