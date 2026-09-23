/* A FAILED SEARCH MUST NOT TAKE THE SKIP AWAY WITH IT.

   Anthony, 2026-09-23: "the assistant couldn't search the Internet and
   couldn't skip the search."

   One sentence, two faults. This walk is about the second one, the one the
   code caused.

   Pressing "Yes, go and look" takes the permission card away before the
   research turn runs, and that is right: a live Yes button during a search
   would start a second search. The fault was that a turn which FAILED did
   not put the card back. The person was left with an error message and
   nothing else, so there was no way to say no any more, and no way to say
   yes again either. He typed "skip" into the chat instead, and that failed
   too, because by then every failing turn was failing the same way.

   The rule this enforces: after a failed search a person is holding the
   same two answers they had before it, yes once more or no thanks. Anything
   less traps them in a search they cannot finish.

   WHY THIS WALK COULD NOT HAVE EXISTED BEFORE TODAY. The harness stub could
   only ever end a turn in onDone, so no walk could produce a failed turn.
   window.__ERRORS was added to the stub for exactly this, and the first
   version of the fix passed a hand check and still did nothing on screen,
   because it handed the card to the save and never to the screen. That is
   the sort of thing only a walk catches.

   Walks, each in a fresh page:
     1. The search ends with no words at all (end_without_done).
     2. The search throws, which is the way it failed for him most often.
     3. After 2, the skip is pressed and must actually be sent.

   Run from the project root with the harness up, or via npm run flow. */

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const CARD = 'text=May I look this up online?';
const YES = 'button:has-text("Yes, go and look")';
const NO = 'button:has-text("No, work with what you have")';

async function openChat(browser, { stopReasons, errors } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([stops, errsIn]) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    /* The orient reply raises the permission card. The research reply is
       empty, so the turn produces nothing a person can read. */
    window.__SCRIPT = {
      orient: ['I would need to look that up.\nNEED_LOOKUP'],
      research: [''],
    };
    if (stops) window.__STOP_REASONS = stops;
    if (errsIn) window.__ERRORS = errsIn;
  }, [stopReasons || null, errors || null]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { page, errs };
}

/* Get to the point where the card is up and the search has failed. */
async function failASearch(browser, label, opts) {
  const { page, errs } = await openChat(browser, opts);

  await page.locator('textarea').first().fill('Make me an investor deck');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  check(`${label}: the permission card is offered`, (await page.locator(CARD).count()) === 1);

  await page.locator(YES).first().click();
  await page.waitForTimeout(2600);

  const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
  check(`${label}: the search actually ran`, turns === 'orient,research');
  check(`${label}: the card comes BACK after the failure`, (await page.locator(CARD).count()) === 1);
  check(`${label}: yes is offered again`, (await page.locator(YES).count()) === 1);
  check(`${label}: and so is the skip`, (await page.locator(NO).count()) === 1);
  check(`${label}: the person is told what happened`,
    /stopped before it finished|stopped partway|could not finish/.test(await page.innerText('body')));
  check(`${label}: no page errors` + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);

  return { page, errs };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* 1. The search ends with no words: the shape that produced "That stopped
        before it finished" in his chat. */
  {
    const { page } = await failASearch(browser, 'SEARCH ENDS WITH NO WORDS', {
      stopReasons: { research: 'end_without_done' },
    });
    await page.close();
  }

  /* 2. The search throws, which is the way it failed most often, four times
        in a row, and each time it took the skip with it. */
  const { page } = await failASearch(browser, 'SEARCH THROWS', {
    errors: { research: { reason: 'stream', message: 'The assistant could not finish that. Try again.' } },
  });

  /* 3. The skip works. Before the fix there was no button left to press. */
  const before = await page.evaluate(() => (window.__TURNS || []).length);
  await page.locator(NO).first().click();
  await page.waitForTimeout(2200);
  const turnsAfter = await page.evaluate(() => (window.__TURNS || []).join(','));
  check('SKIP: pressing it runs a turn', (await page.evaluate(() => (window.__TURNS || []).length)) > before);
  check('SKIP: it goes back to where the search was asked from', turnsAfter.endsWith('orient'));
  check('SKIP: what they said is in the conversation', (await page.locator('text=No, work with what you have.').count()) === 1);
  check('SKIP: the card is gone once it is answered', (await page.locator(CARD).count()) === 0);
  await page.close();

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
