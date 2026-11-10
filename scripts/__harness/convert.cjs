/* CONVERT A DOCUMENT, WITH NO INTERVIEW, AND PROVE NOTHING WENT MISSING.

   Anthony, 2026-09-23: "someone can actually upload any document and ask
   for PDF version or word version... it's a conversion, meaning nothing
   inside the original document is missing and no new thing is added."
   (DOCUMENT-HARNESS.md, section 8.)

   Walks, each in a fresh page:
     1. Word to PDF, the exact converter not set up: the browser does it.
     2. Word to PDF, the exact converter answering (with the file the real
        converter service made from the same fixture).
     3. PDF to Word, the browser way.
     4. PDF to Word, the exact way.
     5. The CONVERT line with no file attached: nothing converts.
     6. "Arrange it for me" goes down the normal path, with no interview
        skipped and no build without a read back.

   For each conversion: the card says what it made, the word by word check
   runs and is said as a fact, the file downloads and really is the format
   asked for, and there was no interview.

   Converted files are kept in /tmp/claude-0/convertfiles to look at.
   Run from the project root with the harness up, or via npm run flow.
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const WORD = path.resolve(__dirname, 'fixtures/engagement.docx');
const PDF = path.resolve(__dirname, 'fixtures/engagement.pdf');
fs.mkdirSync('/tmp/claude-0/convertfiles', { recursive: true });

async function open(browser, { converter, orient }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([c, o]) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    if (c) window.__CONVERTER = c;
    window.__SCRIPT = { orient: o, analyse: ['Laid out properly.\nFORMAT: pdf\nREADBACK_COMPLETE'] };
  }, [converter, orient]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { page, errs };
}

async function ask(page, file, words) {
  if (file) {
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await page.waitForTimeout(2500);
  }
  await page.locator('textarea').first().fill(words);
  await page.keyboard.press('Enter');
}

async function convertWalk(browser, label, { file, words, to, converter }) {
  const { page, errs } = await open(browser, { converter, orient: [`Converting it now.\nCONVERT: ${to}`] });
  await ask(page, file, words);
  await page.locator('text=Ready as a').first().waitFor({ timeout: 30000 }).catch(() => {});
  const card = page.locator('div.rounded-\\[18px\\]', { hasText: 'Ready as a' }).last();
  const text = (await card.count()) ? await card.innerText() : '';
  const expected = `engagement.${to}`;

  check(`${label}: the card says what it made`, text.includes(expected) && text.includes(to === 'pdf' ? 'Ready as a PDF' : 'Ready as a Word file'));
  check(`${label}: the word check ran and is said`, /Every word came across|did not come across/.test(text));
  check(`${label}: no interview, no read back`, (await page.locator('text=Is that right?').count()) === 0
    && (await page.evaluate(() => (window.__TURNS || []).join(','))) === 'orient');
  check(`${label}: the CONVERT line never shows`, !(await page.locator('text=CONVERT:').count()));

  const [d] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.locator('button', { hasText: 'Download the' }).first().click(),
  ]);
  const bytes = fs.readFileSync(await d.path());
  const isPdf = bytes.slice(0, 4).toString() === '%PDF';
  const isZip = bytes.slice(0, 2).toString() === 'PK';
  check(`${label}: the download really is a ${to === 'pdf' ? 'PDF' : 'Word file'}, named after the original`,
    (to === 'pdf' ? isPdf : isZip) && d.suggestedFilename() === expected);
  fs.writeFileSync(`/tmp/claude-0/convertfiles/${label.replace(/\W+/g, '-')}.${to}`, bytes);
  await page.screenshot({ path: `/tmp/claude-0/convertfiles/${label.replace(/\W+/g, '-')}.png` });
  check(`${label}: no page errors` + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
  await page.close();
  return text;
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());

  const t1 = await convertWalk(browser, 'WORD TO PDF, BROWSER', { file: WORD, words: 'Make this a PDF', to: 'pdf' });
  check('WORD TO PDF, BROWSER: every word came across', t1.includes('Every word came across'));
  check('WORD TO PDF, BROWSER: it says the look is not the original', /not the original look/.test(t1));
  check('WORD TO PDF, BROWSER: the picture came across', !/pictures? did not come across/.test(t1));

  const t2 = await convertWalk(browser, 'WORD TO PDF, EXACT', { file: WORD, words: 'Make this a PDF', to: 'pdf', converter: 'exact' });
  check('WORD TO PDF, EXACT: every word came across', t2.includes('Every word came across'));
  check('WORD TO PDF, EXACT: no note about the look', !/not the original look/.test(t2));

  const t3 = await convertWalk(browser, 'PDF TO WORD, BROWSER', { file: PDF, words: 'I need this in Word', to: 'docx' });
  check('PDF TO WORD, BROWSER: every word came across', t3.includes('Every word came across'));
  check('PDF TO WORD, BROWSER: the lost picture is said, not hidden', /picture did not come across|pictures came across|pictures did not come across/.test(t3));

  const t4 = await convertWalk(browser, 'PDF TO WORD, EXACT', { file: PDF, words: 'I need this in Word', to: 'docx', converter: 'exact' });
  check('PDF TO WORD, EXACT: every word came across', t4.includes('Every word came across'));
  check('PDF TO WORD, EXACT: the picture came across', !/pictures? did not come across/.test(t4));

  /* 5. The line alone does nothing. */
  {
    const { page, errs } = await open(browser, { orient: ['Attach the file you want converted.\nCONVERT: pdf'] });
    await ask(page, null, 'Convert it to PDF');
    await page.waitForTimeout(1500);
    check('NO FILE: nothing is converted', (await page.locator('text=Ready as a').count()) === 0 && (await page.locator('text=Converting').count()) === 0);
    check('NO FILE: the words show, the marker does not', (await page.locator('text=Attach the file you want converted.').count()) === 1 && (await page.locator('text=CONVERT:').count()) === 0);
    check('NO FILE: no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  /* 6. Arrange it for me. */
  {
    const { page, errs } = await open(browser, { orient: ['Converting it now.\nCONVERT: pdf', 'Here is what I understood.\nOFFER_INTERVIEW'] });
    await ask(page, WORD, 'Make this a PDF');
    await page.locator('button', { hasText: 'Arrange it for me' }).first().waitFor({ timeout: 30000 });
    await page.locator('button', { hasText: 'Arrange it for me' }).first().click();
    await page.waitForTimeout(1800);
    check('ARRANGE: it is asked for in words the person can see', (await page.locator('text=Lay out engagement.docx properly').count()) === 1);
    check('ARRANGE: it goes the normal way, starting with the offer', (await page.locator('text=Is that right?').count()) === 1);
    check('ARRANGE: nothing is built without a read back', (await page.evaluate(() => (window.__TURNS || []).filter((s) => s === 'generate').length)) === 0);
    check('ARRANGE: no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
