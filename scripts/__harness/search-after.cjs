/* THE SEARCH RUNS AFTER THE ANSWERS.

   Anthony, 2026-11-10: the missing questions come in one go, with "should
   I look this up online?" inside them, and the search runs after the
   answers, then a short read back.

   So the interview's own search question gets a different card: "Look
   this up online too?" with "Yes, after my answers". Pressing it runs
   nothing. Answering the questions finishes the interview, and only then
   does the search run, with the person's yes as the last line (the
   server's search gate still refuses without it). What it finds goes
   under the tickboxes, and keeping it leads to the read back.

   Walks:
     1. Yes, after my answers: no search until they answer; then interview,
        research, and the read back after "Use that".
     2. No need: the card goes, nothing runs, and answering goes straight
        to the read back with no search at all.

   Run from the project root with the harness up, or via npm run flow. */

const { chromium } = require('playwright');
const { launchOptions } = require('./browser.cjs');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const LATER = 'text=Look this up online too?';

async function openChat(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(() => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SCRIPT = {
      orient: ['If I understand, you want a one page pricing summary for a new client.\nOFFER_INTERVIEW'],
      interview: [
        'A few things first:\n1. Who signs it?\n2. Shall I look up the current exchange rate online?\nNEED_LOOKUP',
        'Got it, that is everything.\nINTERVIEW_COMPLETE',
      ],
      research: ['[FINDING] The rate is 1,500 to the dollar. Source: example.com'],
      analyse: ['**What:** a one page summary.\nFORMAT: pdf\nREADBACK_COMPLETE'],
    };
  });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { page, errs };
}

async function toQuestions(page) {
  await page.locator('textarea').first().fill('A pricing summary for a new client');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Yes, ask what you need' }).first().click();
  await page.waitForTimeout(1500);
}

async function answer(page) {
  await page.locator('textarea').first().fill('Ada signs it. Yes, look it up.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  /* 1. Yes, after my answers. */
  {
    const { page, errs } = await openChat(browser);
    await toQuestions(page);
    check('YES: the questions come with the later search card', (await page.locator(LATER).count()) === 1);
    await page.locator('button', { hasText: 'Yes, after my answers' }).first().click();
    await page.waitForTimeout(800);
    let turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check('YES: pressing it runs nothing yet', turns === 'orient,interview');
    check('YES: the yes stays on screen as a note', (await page.locator('text=I will look it up once you have answered').count()) === 1);
    await answer(page);
    turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`YES: after the answers the search runs (${turns})`, turns === 'orient,interview,interview,research');
    const sent = await page.evaluate(() => window.__SENT[window.__SENT.length - 1].messages);
    const last = sent[sent.length - 1];
    check('YES: the search goes with the person\'s yes as the last line', last.role === 'user' && last.content === 'Yes, go and look.');
    check('YES: the note is gone once the search runs', (await page.locator('text=I will look it up once you have answered').count()) === 0);
    check('YES: what it found is offered to keep', (await page.locator('text=From outside your company').count()) === 1);
    await page.locator('button', { hasText: 'Yes, use it' }).first().click();
    await page.waitForTimeout(1800);
    turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`YES: keeping it leads to the read back (${turns})`, turns.endsWith('research,analyse'));
    check('YES: the build card offers the format', (await page.locator('button', { hasText: 'Go ahead with PDF' }).count()) === 1);
    check('YES: no page errors', errs.length === 0);
    await page.close();
  }

  /* 2. No need. */
  {
    const { page, errs } = await openChat(browser);
    await toQuestions(page);
    await page.locator('button', { hasText: 'No need' }).first().click();
    await page.waitForTimeout(800);
    check('NO: the card goes', (await page.locator(LATER).count()) === 0);
    check('NO: and nothing ran', (await page.evaluate(() => (window.__TURNS || []).join(','))) === 'orient,interview');
    await answer(page);
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`NO: answering goes straight to the read back (${turns})`, turns === 'orient,interview,interview,analyse');
    check('NO: no page errors', errs.length === 0);
    await page.close();
  }

  /* 3. "If I understand" with the marker forgotten still gets the card.
        Seen live 2026-11-10: the confirmation with no buttons under it. */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.addInitScript(() => {
      try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
      window.__SCRIPT = { orient: ['If I understand, you want a reply to an unhappy hotel manager.'] };
    });
    await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.locator('textarea').first().fill('Reply to an unhappy hotel');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    check('NO MARKER: "If I understand" still puts the card up', (await page.locator('text=Is that right?').count()) === 1);
    await page.close();
  }

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
