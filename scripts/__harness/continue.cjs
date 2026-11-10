/* PICKING UP WHERE IT LEFT OFF.

   Anthony, 2026-09-23, with a screenshot: a read back ending "I'm thinking
   PDF... Say if you'd rather have Word", then his message "Continue", then
   an empty reply, then "Nothing came back that time."

   "asking it to continue couldn't do anything... So the agent can't read
   its last message and pick up from where it left... I open an old chat.
   It can still read the old chat and still know where to begin from."

   Each walk below is one way that went wrong, done the way he did it.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then, from the project root:
     node scripts/__harness/continue.cjs
*/

const { chromium } = require('playwright');
const fs = require('fs');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const READ_BACK = "A one page pricing FAQ for customers. This is going out, so I'm thinking PDF. Say if you'd rather have Word.";
const DOCUMENT = '# Pricing FAQ\n\n## What do the plans cost?\n\n| Plan | Monthly |\n| --- | --- |\n| Essential | 25000 |';
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const isZip = (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;

/* A fresh chat, skipped straight to the read back. */
async function toReadBack(browser, analyse) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(({ analyse, doc }) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__TURNS = [];
    window.__SCRIPT = {
      orient: ['I can see your pricing file.\nOFFER_INTERVIEW'],
      analyse,
      brief: ['Write a one page pricing FAQ.'],
      generate: [doc],
    };
  }, { analyse, doc: DOCUMENT });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('textarea').first().fill('Make me a one page pricing FAQ');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(2200);
  return { page, errs };
}

/* An old conversation, opened again. */
async function reopen(browser, { stage, messages, analyse }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(({ set, analyse, doc }) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__TURNS = [];
    window.__RESUME = set;
    window.__SCRIPT = {
      orient: ['Hello.'],
      interview: ['Got it.\nINTERVIEW_COMPLETE'],
      analyse: analyse || ['On it.\nBUILD_NOW'],
      research: ['Found it.'],
      brief: ['Write a one page pricing FAQ.'],
      generate: [doc],
    };
  }, { set: { updatedAt: minutesAgo(10), stage, messages, state: { v: 1 } }, analyse, doc: DOCUMENT });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  return { page, errs };
}

async function say(page, text, wait = 3000) {
  await page.locator('textarea').first().fill(text);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);
}

const buildButtons = (page) => page.locator('button', { hasText: 'Go ahead with' }).count();
const nothingCame = (page) => page.locator('text=Nothing came back').count();

async function download(page, label) {
  try {
    const [d] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('button', { hasText: label }).first().click(),
    ]);
    const p = await d.path();
    return { name: d.suggestedFilename(), bytes: p ? fs.readFileSync(p) : Buffer.alloc(0) };
  } catch (e) {
    return { name: null, bytes: Buffer.alloc(0) };
  }
}

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());

  /* ---- 1. TONIGHT, EXACTLY. "Continue", and a reply made only of markers */
  {
    const { page, errs } = await toReadBack(b, [
      READ_BACK + '\nFORMAT: pdf\nREADBACK_COMPLETE',
      'FORMAT: pdf\nREADBACK_COMPLETE',
    ]);
    await say(page, 'Continue');
    check('TONIGHT: no "Nothing came back"', (await nothingCame(page)) === 0);
    check('TONIGHT: the build button is there to press', (await buildButtons(page)) === 1);
    check('TONIGHT: and it still says PDF',
      (await page.locator('button', { hasText: 'Go ahead with PDF' }).count()) === 1);
    /* The empty bubble had thumbs and copy under nothing. Every reply has
       exactly one row of those, so count copy buttons against replies. */
    const empties = await page.evaluate(() =>
      [...document.querySelectorAll('p')].filter((p) => p.textContent === '' && p.className.includes('whitespace-pre-wrap')).length);
    check('TONIGHT: no empty reply bubble left behind', empties === 0);
    check('TONIGHT: no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.screenshot({ path: '/tmp/claude-0/continue-tonight.png', fullPage: true });
    await page.close();
  }

  /* ---- 2. SAYING GO IN WORDS BUILDS, exactly like pressing -------------- */
  {
    const { page, errs } = await toReadBack(b, [
      READ_BACK + '\nFORMAT: pdf\nREADBACK_COMPLETE',
      'Building it now.\nBUILD_NOW',
    ]);
    await say(page, 'Continue', 4500);
    const turns = await page.evaluate(() => window.__TURNS);
    check(`IN WORDS: "Continue" runs the brief and the document (${turns.join(' > ')})`,
      turns.includes('brief') && turns.includes('generate'));
    check('IN WORDS: no button words are put in his mouth',
      (await page.getByText('Go ahead, build it as a PDF.', { exact: true }).count()) === 0);
    const sent = await page.evaluate(() => (window.__SENT || []).find((x) => x.stage === 'brief'));
    /* The real sendTurn drops trailing assistant turns before sending (see
       assistantApi.js), so the "Building it now." line never reaches the
       model. The fake records before that drop, so it is done here too. */
    const kept = sent ? [...sent.messages] : [];
    while (kept.length && kept[kept.length - 1].role === 'assistant') kept.pop();
    const lastSaid = kept[kept.length - 1];
    check('IN WORDS: the brief is sent his own "Continue" as the last thing he said',
      !!lastSaid && lastSaid.role === 'user' && lastSaid.content === 'Continue');
    check('IN WORDS: and the read back is in what the brief reads',
      !!sent && sent.messages.some((m) => m.role === 'assistant' && m.content.startsWith('A one page pricing FAQ')));
    check('IN WORDS: the file is a PDF, as the read back said',
      (await page.locator('text=Ready as a PDF').count()) > 0);
    const pdf = await download(page, 'PDF');
    check('IN WORDS: and a real PDF downloads', pdf.bytes.slice(0, 4).toString() === '%PDF');

    /* ---- THE FINISHED DOCUMENT IS SAVED, not only on download ---------- */
    const saves = await page.evaluate(() => window.__SAVES || []);
    const afterBuild = saves.find((s) => (s.messages || []).some((m) => m.type === 'result'));
    check('SAVED: the finished document is in the saved conversation', !!afterBuild);
    check('SAVED: saved on the read back step, so a follow up is agreed before it is built',
      !!afterBuild && afterBuild.stage === 'analyse');
    check('SAVED: with its file type',
      !!afterBuild && afterBuild.messages.find((m) => m.type === 'result').format === 'pdf');
    check('IN WORDS: no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  /* ---- 3. GO WITH NO READ BACK ON THE TABLE NEVER BUILDS ---------------- */
  {
    const { page } = await toReadBack(b, ['Building it now.\nBUILD_NOW']);
    const turns = await page.evaluate(() => window.__TURNS);
    check(`GUARD: a go with no read back seen does not build (${turns.join(' > ')})`,
      !turns.includes('brief') && !turns.includes('generate'));
    check('GUARD: the build button goes up instead, for him to press', (await buildButtons(page)) === 1);
    await page.close();
  }

  /* ---- 4. THE CHAT HE OPENED: a read back saved without its button ------ */
  {
    const { page, errs } = await reopen(b, {
      stage: 'analyse',
      messages: [
        { role: 'user', type: 'text', content: 'Make me a one page pricing FAQ' },
        { role: 'assistant', type: 'text', content: READ_BACK },
      ],
    });
    check('REOPENED: the read back is there', (await page.getByText(READ_BACK).count()) > 0);
    check('REOPENED: AND SO IS THE BUILD BUTTON', (await buildButtons(page)) === 1);
    await page.screenshot({ path: '/tmp/claude-0/continue-reopened.png', fullPage: true });
    await say(page, 'Continue', 4500);
    const turns = await page.evaluate(() => window.__TURNS);
    check(`REOPENED: "Continue" builds it (${turns.join(' > ')})`,
      turns[0] === 'analyse' && turns.includes('generate'));
    check('REOPENED: no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  /* ---- 5. REOPENED WITH ITS SAVED BUTTON: the file type comes back ------ */
  {
    const { page } = await reopen(b, {
      stage: 'analyse',
      messages: [
        { role: 'user', type: 'text', content: 'Make me a one page pricing FAQ' },
        { role: 'assistant', type: 'text', content: READ_BACK },
        { role: 'assistant', type: 'build', format: 'pdf' },
      ],
    });
    check('FILE TYPE: one button, not two', (await buildButtons(page)) === 1);
    check('FILE TYPE: it still says PDF after reopening',
      (await page.locator('button', { hasText: 'Go ahead with PDF' }).count()) === 1);
    await page.close();
  }

  /* ---- 6. A BUILD CUT SHORT: typing never writes the document in chat --- */
  {
    const { page } = await reopen(b, {
      stage: 'generate',
      messages: [
        { role: 'user', type: 'text', content: 'Make me a one page pricing FAQ' },
        { role: 'assistant', type: 'text', content: READ_BACK },
        { role: 'user', type: 'text', content: 'Go ahead, build it as a PDF.' },
      ],
    });
    check('CUT SHORT: the build button is back', (await buildButtons(page)) === 1);
    await say(page, 'what happened?', 2500);
    const turns = await page.evaluate(() => window.__TURNS);
    check(`CUT SHORT: typing goes to the read back step, not the writing step (${turns.join(' > ')})`,
      turns[0] === 'analyse');
    await page.close();
  }

  /* ---- 7. SAVED MID SEARCH: typing never searches unasked ---------------- */
  {
    const { page } = await reopen(b, {
      stage: 'research',
      analyse: [READ_BACK + '\nREADBACK_COMPLETE'],
      messages: [
        { role: 'user', type: 'text', content: 'Make me a one page pricing FAQ' },
        { role: 'user', type: 'text', content: 'Yes, go and look.' },
      ],
    });
    await say(page, 'did you find it?', 2500);
    const turns = await page.evaluate(() => window.__TURNS);
    check(`SEARCH: typing after a reopen does not search (${turns.join(' > ')})`,
      !turns.includes('research'));
    await page.close();
  }

  /* ---- 8. ONE SAVE PER TURN, so the first turn cannot make two rows ---- */
  {
    const { page } = await toReadBack(b, [READ_BACK + '\nFORMAT: pdf\nREADBACK_COMPLETE']);
    const saves = await page.evaluate(() => window.__SAVES || []);
    const offered = saves.filter((s) => s.stage === 'offered');
    const orientSaves = saves.filter((s) => s.stage === 'orient');
    check(`ONE SAVE: the opening turn saved once, on "offered" (${saves.map((s) => s.stage).join(', ')})`,
      offered.length === 1 && orientSaves.length === 0);
    const withBuild = saves.find((s) => (s.messages || []).some((m) => m.type === 'build'));
    check('ONE SAVE: the read back is saved WITH its build button', !!withBuild);
    check('ONE SAVE: and the button carries the file type',
      !!withBuild && withBuild.messages.find((m) => m.type === 'build').format === 'pdf');
    await page.close();
  }

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
