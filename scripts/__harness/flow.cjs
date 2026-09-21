/* WALKS THE WHOLE FLOW, with a scripted assistant behind it.

   This exists because a state machine that returns early in the wrong
   place looks completely fine in a screenshot. Between 2026-09-16 and
   2026-09-21 the first turn could end by asking to search instead of
   offering the interview, the lookup check ran above every stage and
   returned, and the work could never leave "orient". Nothing caught it.
   Lint was clean, the build was clean, and the product could not make a
   document.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then, from the project root:
     node scripts/__harness/flow.cjs
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', e => BAD.push('page error: ' + e.message));

  /* The whole conversation, written out. Each stage hands back the next
     entry in its list, so orient can answer differently the second time. */
  await page.addInitScript(() => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SCRIPT = {
      /* THE CASE THAT BROKE IT. The first turn asks to go and look and
         never offers the interview. Twice in a row, which is the worst
         case, because the second one is what used to leave somebody stuck
         on the first screen with no way to a document. */
      orient: [
        "I can see your brand guide and your tone of voice file. Before I go further I would like to check the current figure.\nNEED_LOOKUP",
        "Still worth checking that figure.\nNEED_LOOKUP",
      ],
      interview: ["Who is the report for?\nINTERVIEW_COMPLETE"],
      analyse: ["You want a one page report for the board, drawing on the brand guide.\nREADBACK_COMPLETE"],
      research: ["[FINDING] The figure is 12 per cent.\n[LINK] https://example.org/figure"],
    };
  });

  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /* 1. Ask for the document, the way he would. */
  await page.locator('textarea').first().fill('Write me a one page report for the board as a Word document');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);

  check('the first turn raises the search card', await page.locator('text=May I look this up online?').count() > 0);
  check('it has NOT offered the interview yet', await page.locator('text=Want me to ask you a few questions?').count() === 0);

  /* 2. Turn the search down. This is where it used to die: orient runs
        again, asks to search again, and there is no way onward. */
  await page.locator('button', { hasText: 'No, work with what you have' }).first().click();
  await page.waitForTimeout(1400);

  const offered = await page.locator('text=Want me to ask you a few questions?').count() > 0;
  check('THE FIX: the offer goes up even though it asked to search again', offered);
  check('and it does not raise a second search card', await page.locator('text=May I look this up online?').count() === 0);

  if (!offered) {
    await page.screenshot({ path: '/tmp/claude-0/flow-stuck.png', fullPage: true });
    console.log('stuck at the offer. screenshot written to /tmp/claude-0/flow-stuck.png');
  }

  /* 3. Take the interview, which should hand off to the analysis on its
        own and land on the Build card with nobody pressing anything. */
  if (offered) {
    await page.locator('button', { hasText: 'Ask me a few questions' }).first().click();
    await page.waitForTimeout(2200);
    check('the read back arrived and the Build card is up', await page.locator('text=Did I get that right?').count() > 0);
    await page.screenshot({ path: '/tmp/claude-0/flow-build.png', fullPage: true });
  }

  const turns = await page.evaluate(() => window.__TURNS || []);
  console.log('stages that ran, in order:', turns.join(' -> '));
  check('the work reached the analysis', turns.includes('analyse'));
  check('it did not go round in circles on the first turn', turns.filter(t => t === 'orient').length <= 2);

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
