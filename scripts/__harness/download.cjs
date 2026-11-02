/* THE LAST MILE: FROM A BUILT DOCUMENT TO A FILE ON THE DISK.

   Anthony, 2026-09-23: "check out assistant flow to ensure it is solid and
   can finally take me from interview to build and download."

   WHY THIS EXISTS. flow.cjs walks all the way to "Ready as a Word document"
   and stops there. It checks the WORDS on the card. It never presses
   Download, so it never proved a file actually arrives. That is the one
   step a person cares about most and it was the one step nothing tested.

   On production the flow has never once reached a downloaded file. Every
   saved conversation died earlier: one wrote the document into the chat,
   one stuck on the first step for 21 messages, one ran out of budget. So
   this walks the whole thing, interview to file, and then opens each file
   that lands and checks it is really that kind of file.

   HOW A FILE IS CHECKED. By its first bytes, not its name, because a name
   is a label and the bytes are the fact. A Word, Slides or Spreadsheet file
   is a zip underneath and opens with "PK". A PDF opens with "%PDF".

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then, from the project root:
     node scripts/__harness/download.cjs
*/

const { chromium } = require('playwright');
const fs = require('fs');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

/* A real document, with a table in it, so every format has something to
   hold. A spreadsheet of a document with no table is refused on purpose,
   and that refusal is checked separately below. */
const DOCUMENT = [
  '# Pricing FAQ',
  '',
  '## What do the plans cost?',
  '',
  'There are three plans.',
  '',
  '| Plan | Monthly | Seats |',
  '| --- | --- | --- |',
  '| Essential | 25000 | 3 |',
  '| Premier | 60000 | 10 |',
  '| Signature | 150000 | 30 |',
  '',
  '## Can I change plan later?',
  '',
  'Yes, at any time, from the admin screen.',
].join('\n');

/* TWO WAYS TO THE BUILD CARD, AND BOTH HAVE TO END IN A FILE.

     interview  "Ask me a few questions", answer one, and it hands off.
                This is the path Anthony asked for by name and the one a
                demo will show, so it is the main walk.
     skip       "Just get on with it", straight to the read back. */
async function walkToBuilt(browser, generate, path = 'interview', stops = null, brief = 'Write a one page pricing FAQ with the plan table.', stopAtCard = false) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.addInitScript(({ doc, stops, brief }) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__TURNS = [];
    window.__STOP_REASONS = stops;
    window.__SCRIPT = {
      orient: ['I can see your pricing file.\nOFFER_INTERVIEW'],
      /* A real interview is two turns: it asks, the person answers, and
         then it hands off. One turn that asks and completes at once would
         never wait for an answer, which is not what anybody sees. */
      interview: ['Who is this FAQ for?', 'Got it, customers deciding whether to buy.\nINTERVIEW_COMPLETE'],
      analyse: ['A one page pricing FAQ for customers.\nFORMAT: docx\nREADBACK_COMPLETE'],
      brief: [brief],
      generate: [doc],
    };
  }, { doc: generate, stops, brief });

  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('textarea').first().fill('Make me a one page pricing FAQ');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  if (path === 'interview') {
    await page.locator('button', { hasText: 'Ask me a few questions' }).first().click();
    await page.waitForTimeout(1600);
    await page.locator('textarea').first().fill('Customers who are deciding whether to buy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2600);
  } else {
    await page.locator('button', { hasText: 'Just get on with it' }).first().click();
    await page.waitForTimeout(2200);
  }
  if (stopAtCard) return { page, errs };
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await page.waitForTimeout(2800);

  return { page, errs };
}

/* Presses a button and catches the file that lands, or reports that none
   did. A button that does nothing must fail here rather than time out
   quietly, because "nothing happened" is exactly the fault being hunted. */
async function pressAndCatch(page, label) {
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('button', { hasText: label }).first().click(),
    ]);
    const path = await download.path();
    const bytes = path ? fs.readFileSync(path) : Buffer.alloc(0);
    return { name: download.suggestedFilename(), bytes };
  } catch (e) {
    return { name: null, bytes: Buffer.alloc(0), error: String(e).slice(0, 160) };
  }
}

const isZip = (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;       // "PK"
const isPdf = (b) => b.length > 4 && b.slice(0, 4).toString() === '%PDF';

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());

  /* ---- 1. THE WHOLE FLOW, TO A BUILT DOCUMENT ------------------------- */
  const { page, errs } = await walkToBuilt(b, DOCUMENT);
  const turns = await page.evaluate(() => window.__TURNS || []);

  const inOrder = (want) => want.every((s, i) => turns.indexOf(s) >= 0 &&
    (i === 0 || turns.indexOf(s) > turns.indexOf(want[i - 1])));
  check(`THROUGH THE INTERVIEW: orient, interview, analyse, brief, generate (${turns.join(' > ')})`,
    inOrder(['orient', 'interview', 'analyse', 'brief', 'generate']));
  check('the interview really waited for an answer, it asked twice',
    turns.filter((s) => s === 'interview').length === 2);
  check('the file is ready and says it is a Word document',
    (await page.locator('text=Ready as a Word document').count()) > 0);
  /* The card shows the same name the file is saved under, the document's
     own heading, not what was typed to ask for it. */
  check('the card is titled after the document, "Pricing FAQ"',
    (await page.getByText('Pricing FAQ', { exact: true }).count()) > 0);
  /* The request is still on the page once, as the person's own message.
     Before the fix it was there twice: their message, and the card header
     repeating it. Once means the card no longer says it. */
  check('and the request appears only once, as their own message, not on the card',
    (await page.getByText('Make me a one page pricing FAQ', { exact: true }).count()) === 1);
  await page.screenshot({ path: '/tmp/claude-0/download-ready.png', fullPage: true });

  /* ---- 2. EVERY DOWNLOAD BUTTON ACTUALLY PRODUCES THAT FILE ----------- */
  const word = await pressAndCatch(page, 'Word');
  check(`Word: a file arrives${word.error ? ' -> ' + word.error : ''}`, word.bytes.length > 0);
  check(`Word: it is called .docx (${word.name})`, /\.docx$/i.test(word.name || ''));
  /* NAMED AFTER THE DOCUMENT, NOT THE REQUEST. It used to land as
     make-me-a-one-page-pricing-faq.docx, because the card is created before
     the document arrives and the only name to hand was what was typed. */
  check(`Word: named after the document's own heading, pricing-faq (${word.name})`,
    word.name === 'pricing-faq.docx');
  check('and not after what was typed', !/make-me/.test(word.name || ''));
  check('Word: it is really a Word file, not just named like one', isZip(word.bytes));
  check(`Word: it has real content in it (${word.bytes.length} bytes)`, word.bytes.length > 2000);

  const pdf = await pressAndCatch(page, 'PDF');
  check(`PDF: a file arrives${pdf.error ? ' -> ' + pdf.error : ''}`, pdf.bytes.length > 0);
  check(`PDF: it is called .pdf (${pdf.name})`, /\.pdf$/i.test(pdf.name || ''));
  check('PDF: it is really a PDF', isPdf(pdf.bytes));

  const deck = await pressAndCatch(page, 'Slides');
  check(`Slides: a file arrives${deck.error ? ' -> ' + deck.error : ''}`, deck.bytes.length > 0);
  check(`Slides: it is called .pptx (${deck.name})`, /\.pptx$/i.test(deck.name || ''));
  check('Slides: it is really a PowerPoint file', isZip(deck.bytes));

  const sheet = await pressAndCatch(page, 'Spreadsheet');
  check(`Spreadsheet: a file arrives${sheet.error ? ' -> ' + sheet.error : ''}`, sheet.bytes.length > 0);
  check(`Spreadsheet: it is called .xlsx (${sheet.name})`, /\.xlsx$/i.test(sheet.name || ''));
  check('Spreadsheet: it is really an Excel file', isZip(sheet.bytes));

  check('no page errors anywhere along the way' + (errs.length ? ' -> ' + errs.join(' | ') : ''),
    errs.length === 0);
  await page.close();

  /* ---- 3. SKIPPING THE INTERVIEW ALSO ENDS IN A FILE ------------------ */
  const skip = await walkToBuilt(b, DOCUMENT, 'skip');
  const skipTurns = await skip.page.evaluate(() => window.__TURNS || []);
  check(`SKIPPING: orient, analyse, brief, generate, with no interview (${skipTurns.join(' > ')})`,
    !skipTurns.includes('interview') &&
    ['orient', 'analyse', 'brief', 'generate'].every((s) => skipTurns.includes(s)));
  const skipWord = await pressAndCatch(skip.page, 'Word');
  check('and it still ends in a real Word file', isZip(skipWord.bytes));
  await skip.page.close();

  /* ---- 4. NO TABLE, NO SPREADSHEET BUTTON ------------------------------

     A spreadsheet of a document with no table in it would be an empty file.
     So the button is not offered at all, which is better than offering it
     and then apologising: a person cannot press the wrong thing if it is
     not there. */
  const plain = await walkToBuilt(b, '# Notes\n\nJust words, no table at all.', 'skip');
  check('with no table, the Spreadsheet button is not offered',
    (await plain.page.locator('button', { hasText: 'Spreadsheet' }).count()) === 0);
  check('but Word and PDF still are',
    (await plain.page.locator('button', { hasText: 'PDF' }).count()) > 0);
  await plain.page.close();

  /* ---- 5. THE DOCUMENT RUNS OUT OF ROOM HALFWAY ------------------------

     Before 2026-09-23 a document that stopped mid sentence was saved and
     offered as finished, and nothing said so. Now it has to say so, put
     the build card back, and the second press has to end in a real file. */
  const cut = await walkToBuilt(b, DOCUMENT, 'skip', { generate: 'max_tokens' });
  check('CUT OFF: it says the file is not complete',
    (await cut.page.locator('text=ran out of room before the end').count()) > 0);
  check('CUT OFF: the build card comes back, so there is something to press',
    (await cut.page.locator('button', { hasText: 'Go ahead, build it' }).count()) > 0);
  await cut.page.screenshot({ path: '/tmp/claude-0/download-cutoff.png', fullPage: true });
  await cut.page.evaluate(() => { window.__STOP_REASONS = null; });
  await cut.page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await cut.page.waitForTimeout(2800);
  const cutTurns = await cut.page.evaluate(() => window.__TURNS || []);
  check(`CUT OFF: pressing build again runs brief and generate again (${cutTurns.join(' > ')})`,
    cutTurns.filter((s) => s === 'generate').length === 2);
  check('CUT OFF: and the build card is gone once it finishes',
    (await cut.page.locator('button', { hasText: 'Go ahead, build it' }).count()) === 0);
  const cutWord = await pressAndCatch(cut.page, 'Word');
  check('CUT OFF: the second press ends in a real Word file', isZip(cutWord.bytes));
  check('CUT OFF: no page errors' + (cut.errs.length ? ' -> ' + cut.errs.join(' | ') : ''),
    cut.errs.length === 0);
  await cut.page.close();

  /* ---- 6. THE BRIEF COMES BACK EMPTY, THE BUG ANTHONY HIT ---------------

     The server now asks again without thinking, so this should be rare.
     If it still happens, the chat must not be a dead end: it says so and
     the build card comes back. */
  const empty = await walkToBuilt(b, DOCUMENT, 'skip', { brief: 'max_tokens' }, '');
  check('EMPTY BRIEF: it says nothing was built',
    (await empty.page.locator('text=ran out of room, so nothing was built').count()) > 0);
  check('EMPTY BRIEF: generate never ran on an empty brief',
    !(await empty.page.evaluate(() => window.__TURNS || [])).includes('generate'));
  check('EMPTY BRIEF: the build card comes back',
    (await empty.page.locator('button', { hasText: 'Go ahead, build it' }).count()) > 0);
  await empty.page.close();

  /* ---- 7. CHOOSING A DIFFERENT FILE ON THE BUILD CARD -----------------

     Anthony, 2026-09-23: "I wasn't even offered the choice to choose file
     type. It just saying it producing pdf." The read back picks one; the
     card now offers the others, one press each. */
  const pick = await walkToBuilt(b, DOCUMENT, 'skip', null, 'Write it.', true);
  check('CHOICE: the card offers the other file types',
    (await pick.page.locator('text=Or make it').count()) > 0 &&
    (await pick.page.locator('button', { hasText: 'Slides' }).count()) > 0 &&
    (await pick.page.locator('button', { hasText: 'Spreadsheet' }).count()) > 0);
  check('CHOICE: the one already picked is not offered twice',
    (await pick.page.locator('button', { hasText: /^Word$/ }).count()) === 0);
  await pick.page.screenshot({ path: '/tmp/claude-0/build-choice.png', fullPage: true });
  await pick.page.locator('button', { hasText: 'Slides' }).first().click();
  await pick.page.waitForTimeout(2800);
  check('CHOICE: what they pressed shows as their message',
    (await pick.page.getByText('Go ahead, build it as slides.', { exact: true }).count()) === 1);
  const sent = await pick.page.evaluate(() => window.__SENT || []);
  const briefSent = sent.find((x) => x.stage === 'brief');
  const lastSaid = briefSent && briefSent.messages[briefSent.messages.length - 1];
  check('CHOICE: the brief is TOLD it is slides, not just the screen',
    !!lastSaid && lastSaid.role === 'user' && /slides/.test(String(lastSaid.content)));
  check('CHOICE: and the brief still sees the read back before it',
    !!briefSent && briefSent.messages.some((m) => m.role === 'assistant' && /pricing FAQ/i.test(String(m.content))));
  check('CHOICE: the card says slides', (await pick.page.locator('text=Ready as slides').count()) > 0);
  const pickDeck = await pressAndCatch(pick.page, 'Slides');
  check(`CHOICE: the main download is a .pptx (${pickDeck.name})`, /\.pptx$/i.test(pickDeck.name || ''));
  check('CHOICE: and it is a real PowerPoint file', isZip(pickDeck.bytes));
  check('CHOICE: no page errors' + (pick.errs.length ? ' -> ' + pick.errs.join(' | ') : ''),
    pick.errs.length === 0);
  await pick.page.close();

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
