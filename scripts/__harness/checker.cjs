/* THE CHECKER, USED THE WAY A STAFF MEMBER MEETS IT.

   DOCUMENT-HARNESS.md, section 5. Code reads every finished document before
   the staff does. This walks a build whose writing has three faults in it,
   the kind a model makes on a bad day, and checks each one is caught:

     1. The brief said "Pictures: none" and a picture block slipped in.
        It must not reach the file.
     2. The Total row does not add up. Code puts the right total in, in the
        document itself, and says so.
     3. One number ("12%") is in no source, not in the brief, and nobody
        said it. It must be listed in "Worth checking". Numbers that ARE in
        the sources, the brief or the chat must not be.

   Run from the project root with the harness up, or via npm run flow.
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const DOC = [
  '# Amara room costs',
  '',
  'What a stay costs this quarter.',
  '',
  '## Rates',
  '',
  'A standard room is ₦85,000 a night. Occupancy is up 12% on last year.',
  '',
  ':::image lobby.jpg | The lobby',
  '',
  '| Item | Cost |',
  '| --- | --- |',
  '| Rooms | ₦120,000 |',
  '| Food | ₦45,500 |',
  '| Total | ₦170,000 |',
].join('\n');

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());
  const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((doc) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SOURCES = 'Rate card: standard room ₦85,000 per night.';
    window.__SCRIPT = {
      orient: ['Room costs.\nOFFER_INTERVIEW'],
      analyse: ['Room costs for the quarter.\nFORMAT: pdf\nREADBACK_COMPLETE'],
      brief: ['Rooms ₦120,000. Pictures: none'],
      generate: [doc],
    };
  }, DOC);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.locator('textarea').first().fill('Room costs for this quarter. Food was ₦45,500.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Just get on with it' }).first().click();
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await page.waitForTimeout(3500);

  const card = page.locator('text=Worth checking before it goes out').locator('..');
  const cardText = (await card.count()) ? await card.innerText() : '';

  check('THE WRONG TOTAL IS CAUGHT AND SAID', /total for Cost was written as ₦170,000/.test(cardText) && /₦165,500/.test(cardText));
  check('THE INVENTED NUMBER IS LISTED', /12% is not in your sources/.test(cardText));
  check('a number from the sources is not listed', !/₦85,000 is not/.test(cardText));
  check('a number from the brief is not listed', !/₦120,000 is not/.test(cardText));
  check('a number said in the chat is not listed', !/₦45,500 is not/.test(cardText));

  await page.locator('button', { hasText: 'Show it here' }).first().click();
  await page.waitForTimeout(600);
  const preview = await page.locator('table').last().innerText();
  check('THE DOCUMENT ITSELF CARRIES THE RIGHT TOTAL', /165,500/.test(preview) && !/170,000/.test(preview));
  check('SKIP MEANS SKIP: no picture and no empty box', (await page.locator('text=Picture: lobby.jpg').count()) === 0 && (await page.locator('figure').count()) === 0);
  await page.screenshot({ path: '/tmp/claude-0/checker-card.png', fullPage: false });
  check('no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);

  await b.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
