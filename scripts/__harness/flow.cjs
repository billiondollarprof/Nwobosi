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

  /* ------------------------------------------------------------------
     A SEARCH RIDING ALONGSIDE A HANDSHAKE, asked for 2026-09-21.

     Anthony wants to be able to send it looking at any point, including
     off the back of a read back. The rule that makes that safe is that a
     marker moving the work forward is never swallowed, so both cards have
     to be able to sit on screen together.
     ------------------------------------------------------------------ */
  /* A FRESH PAGE, not a Start something new button. That button only
     exists once a document has been made, so clicking past it left the
     second walk running on the first walk's stage and the test timed out
     waiting for a card that was never coming. */
  await page.addInitScript(() => {
    window.__TURNS = [];
    window.__SCRIPT = {
      orient: ["I can see your brand guide.\nNEED_LOOKUP\nOFFER_INTERVIEW"],
      interview: ["Who is it for?\nINTERVIEW_COMPLETE"],
      analyse: [
        "You want a one page report for the board.\nNEED_LOOKUP\nREADBACK_COMPLETE",
        "Updated with the figure you approved.\nREADBACK_COMPLETE",
      ],
      research: ["[FINDING] The figure is 12 per cent.\n[LINK] https://example.org/figure"],
    };
  });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.locator('textarea').first().fill('Write a short board update');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);

  check('the offer and the search card can be on screen together',
    (await page.locator('text=Want me to ask you a few questions?').count()) > 0 &&
    (await page.locator('text=May I look this up online?').count()) > 0);

  /* Take the interview, which lands on a read back that also suggests a
     search. Both cards again, and this is the case he described. */
  await page.locator('button', { hasText: 'Ask me a few questions' }).first().click();
  await page.waitForTimeout(2400);

  const bothAfterReadback =
    (await page.locator('text=Did I get that right?').count()) > 0 &&
    (await page.locator('text=May I look this up online?').count()) > 0;
  check('the read back can suggest a search and still offer the Build card', bothAfterReadback);

  /* Exactly one, not two. Answering the offer has to take its own search
     card down with it, or the stale one from the first turn is still live
     and is the one that gets pressed. */
  check('the stale search card from the first turn is gone',
    (await page.locator('text=May I look this up online?').count()) === 1);
  await page.screenshot({ path: '/tmp/claude-0/flow-both.png', fullPage: true });

  /* Sending it looking has to take the Build button down. Left up, it is a
     live button that would write the document off the old read back in the
     middle of the check meant to improve it. */
  if (bothAfterReadback) {
    await page.locator('button', { hasText: 'Yes, go and look' }).first().click();
    await page.waitForTimeout(600);
    check('starting the search takes the stale Build card down',
      (await page.locator('text=Did I get that right?').count()) === 0);

    await page.waitForTimeout(1600);
    const picker = page.locator('button', { hasText: 'Use' }).first();
    if (await picker.count()) { await picker.click(); await page.waitForTimeout(2000); }
    check('and the work comes back to a Build card afterwards',
      (await page.locator('text=Did I get that right?').count()) > 0);
  }

  /* Read before the next walk clears it, or the search assertion below
     would be looking at a walk that never searched. */
  const searchTurns = await page.evaluate(() => window.__TURNS || []);

  /* ------------------------------------------------------------------
     ASKING FOR THE FINISHED DOCUMENT IN ANOTHER FORMAT.

     Anthony, 2026-09-21: "even as it gave me this output, I can decide and
     say make it a word document or PDF file."

     It used to push that back through the analysis as a new piece of work.
     Now it reaches the download the result card has always had, and no
     model is asked anything.
     ------------------------------------------------------------------ */
  await page.addInitScript(() => {
    window.__TURNS = [];
    window.__SCRIPT = {
      orient: ["I can see your site.\nOFFER_INTERVIEW"],
      interview: ["Who reads it?\nINTERVIEW_COMPLETE"],
      analyse: ["A one page FAQ for the team.\nREADBACK_COMPLETE"],
      brief: ["Write a one page FAQ."],
      generate: ["# FAQ\n\n## What do you do?\nWe do the thing."],
    };
    /* The file builders reach for the DOM and a download; stubbed so the
       walk can assert the ROUTING without a real .docx being written. */
    window.__DOWNLOADS = [];
  });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.locator('textarea').first().fill('Make me a one page FAQ');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  await page.locator('button', { hasText: 'Just get on with it' }).first().click();
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await page.waitForTimeout(2600);

  const built = (await page.locator('text=What do you do?').count()) > 0;
  check('the document actually got built', built);

  if (built) {
    const before = await page.evaluate(() => (window.__TURNS || []).length);
    await page.locator('textarea').first().fill('make it a word document');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);

    check('asking for Word does NOT start the pipeline again',
      (await page.evaluate(() => (window.__TURNS || []).length)) === before);
    check('and it says so in plain words',
      (await page.locator('text=as a Word document').count()) > 0);
    await page.screenshot({ path: '/tmp/claude-0/flow-format.png', fullPage: true });
  }

  /* ------------------------------------------------------------------
     THE READ BACK THAT WROTE THE DOCUMENT INSTEAD OF HANDING OFF.

     Anthony, 2026-09-21: "after the recap, he started building... he just
     wrote the text there. He did not build it into a document."

     The analyse stage was the only one that never forbade writing the
     work, so it wrote the FAQ into a chat bubble. A chat bubble is not a
     file and never can be, and with no marker on the end there was no
     button to make one either.

     The prompt forbids it now, but a rule is something a model can talk
     itself out of, so this checks the app does not depend on the rule.
     ------------------------------------------------------------------ */
  await page.addInitScript(() => {
    window.__TURNS = [];
    window.__SCRIPT = {
      orient: ["I can see your site.\nOFFER_INTERVIEW"],
      interview: ["Who reads it?\nINTERVIEW_COMPLETE"],
      /* The whole document, and not one marker anywhere. */
      analyse: ["# Frequently asked questions\n\n## What do you do?\nWe do the thing.\n\n## What does it cost?\nIt depends."],
    };
  });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.locator('textarea').first().fill('Make me a one page FAQ as a document');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  await page.locator('button', { hasText: 'Ask me a few questions' }).first().click();
  await page.waitForTimeout(2400);

  check('THE GUARD: a read back with no marker still offers the Build card',
    (await page.locator('text=Did I get that right?').count()) > 0);

  const turns = await page.evaluate(() => window.__TURNS || []);
  console.log('stages, search walk:   ', searchTurns.join(' -> '));
  console.log('stages, no marker walk:', turns.join(' -> '));
  check('the work reached the analysis', turns.includes('analyse'));
  check('and the search walk did go out and search', searchTurns.includes('research'));

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
