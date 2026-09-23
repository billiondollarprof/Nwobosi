/* PUTTING A FINISHED DOCUMENT IN GOOGLE DRIVE.

   Anthony, 2026-09-23: "Google drive since I already collected the
   credentials." The result card offers Drive by name when it is connected,
   says plainly when it is not, and sends the SAME file the Download button
   gives. fake-driveApi.js stands in for Google.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then: node scripts/__harness/drive.cjs
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const DOC = '# Pricing FAQ\n\nEverything you need to know.\n\n## Plans\n\n| Plan | Monthly |\n| --- | --- |\n| Essential | ₦52,200 |';

async function built(browser, drive) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(({ doc, drive }) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__DRIVE = drive;
    window.__SCRIPT = { orient: ['Found it.\nOFFER_INTERVIEW'], analyse: ['FAQ.\nFORMAT: pdf\nREADBACK_COMPLETE'], brief: ['Write.'], generate: [doc] };
  }, { doc: DOC, drive });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('textarea').first().fill('Make me a pricing FAQ');
  await page.keyboard.press('Enter'); await page.waitForTimeout(1300);
  await page.locator('button', { hasText: 'Just get on with it' }).first().click(); await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click(); await page.waitForTimeout(2800);
  return { page, errs };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* 1. CONNECTED: offered by name, and it sends the real file. */
  {
    const { page, errs } = await built(b, { connected: true });
    check('CONNECTED: the card offers "Put it in Google Drive"',
      (await page.locator('button', { hasText: 'Put it in Google Drive' }).count()) === 1);
    check('and does not say nothing is connected',
      (await page.locator('text=No storage is connected here yet').count()) === 0);
    await page.locator('button', { hasText: 'Put it in Google Drive' }).click();
    await page.waitForTimeout(3000);
    const filed = await page.evaluate(() => window.__FILED || []);
    check(`IT SENDS THE PDF THE READ BACK CHOSE (${filed.map((f) => f.filename).join(', ')})`,
      filed.length === 1 && filed[0].filename === 'pricing-faq.pdf' && filed[0].mimeType === 'application/pdf');
    check(`and it is a real file, not an empty one (${filed[0]?.size} bytes)`, (filed[0]?.size ?? 0) > 5000);
    check('it says where it went', (await page.locator('text=Saved to Google Drive, in the folder "Amara documents".').count()) === 1);
    check('with a way to open it there', (await page.locator('a', { hasText: 'Open in Drive' }).count()) === 1);
    await page.screenshot({ path: '/tmp/claude-0/drive-filed.png' });
    check('no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  /* 2. NOT CONNECTED: no button that cannot work, and one plain line. */
  {
    const { page } = await built(b, { connected: false });
    check('NOT CONNECTED: no Drive button', (await page.locator('button', { hasText: 'Put it in' }).count()) === 0);
    check('and it says so', (await page.locator('text=No storage is connected here yet').count()) === 1);
    await page.close();
  }

  /* 3. GOOGLE REFUSES: said plainly, nothing claimed. */
  {
    const { page } = await built(b, { connected: true, fails: 'Google Drive needs connecting again. Open the tools menu and connect it, then try once more.' });
    await page.locator('button', { hasText: 'Put it in Google Drive' }).click();
    /* The reason is a toast, which goes away by itself, so this waits for
       it to appear rather than looking after a fixed pause. */
    const said = await page.locator('text=needs connecting again').first()
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    check('REFUSED: it says to connect again', said);
    check('and never claims it was saved', (await page.locator('text=Saved to Google Drive').count()) === 0);
    await page.close();
  }

  /* 4. THE TOOLS MENU shows Drive as connectable, not "Coming soon". */
  {
    const { page } = await built(b, { connected: true });
    await page.locator('button[aria-label]').filter({ has: page.locator('svg') }).first();
    const menuDrive = await page.evaluate(() => {
      const tools = [...document.querySelectorAll('button')].filter((x) => x.textContent.includes('Google Drive'));
      return tools.map((t) => t.textContent);
    });
    check(`Drive is not marked "Coming soon" anywhere (${menuDrive.length} places)`,
      !menuDrive.some((t) => t.includes('Coming soon')));
    await page.close();
  }

  await b.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
