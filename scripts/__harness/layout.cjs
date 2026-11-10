/* LAID OUT LIKE AN UPLOAD, AND ONLY WHEN ASKED.

   Anthony, 2026-09-23: "even during a new build, if the staff asks that the
   layout of an upload should be used, then the layout should not be thrown
   away. this only happens if they say it." (DOCUMENT-HARNESS.md, section 9.)

   1. A Word file is attached. Its shape reaches the model beside its words,
      marked "follow it only if they ask".
   2. They asked, so the agreed brief says "Layout: like engagement.docx".
      The Word file that downloads uses that file's own font, heading colour
      and margins.
   3. The same build where the brief has no Layout line: the house style,
      untouched.

   Run from the project root with the harness up, or via npm run flow.
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const WORD = path.resolve(__dirname, 'fixtures/engagement.docx');
const DOC = [
  '# Letter of engagement',
  '',
  'Dear Mr Bello, thank you for choosing Amara for the sales conference.',
  '',
  '## What is included',
  '',
  '- Twenty rooms for two nights',
  '- Breakfast each day',
  '',
  '## The cost',
  '',
  '| Item | Cost |',
  '| --- | --- |',
  '| Rooms | ₦6,200,000 |',
  '| Total | ₦6,200,000 |',
].join('\n');

async function build(browser, brief) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([doc, b]) => {
    try { localStorage.setItem('stellaxafe.theme', 'light'); } catch {}
    window.__SCRIPT = {
      orient: ['A letter for Mr Bello.\nOFFER_INTERVIEW'],
      analyse: ['Laid out like engagement.docx: the same sections in the same order.\nFORMAT: docx\nREADBACK_COMPLETE'],
      brief: [b],
      generate: [doc],
    };
  }, [DOC, brief]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('input[type="file"]').first().setInputFiles(WORD);
  await page.waitForTimeout(3000);
  await page.locator('textarea').first().fill('Write the same letter for Mr Bello, laid out like this one');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await page.waitForTimeout(3500);

  const sent = await page.evaluate(() => (window.__SENT || [])[0]);
  const first = sent?.messages?.[sent.messages.length - 1];
  const said = typeof first?.content === 'string' ? first.content : JSON.stringify(first?.content ?? '');

  const [d] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.locator('button', { hasText: /^\s*Word\s*$/ }).first().click(),
  ]);
  const bytes = fs.readFileSync(await d.path());
  fs.mkdirSync('/tmp/claude-0/layoutfiles', { recursive: true });
  fs.writeFileSync(`/tmp/claude-0/layoutfiles/${/Layout:/.test(brief) ? 'asked' : 'not-asked'}.docx`, bytes);
  const zip = await JSZip.loadAsync(bytes);
  const styles = await zip.file('word/styles.xml').async('string');
  const body = await zip.file('word/document.xml').async('string');
  await page.close();
  return { said, styles, body, errs };
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());

  const asked = await build(browser, 'The letter for Mr Bello.\nLayout: like engagement.docx\nPictures: none');
  check('THE SHAPE REACHES THE MODEL, BESIDE THE WORDS', asked.said.includes('--- LAYOUT OF engagement.docx (follow it only if they ask for this layout) ---'));
  check('the shape has its sections and its table', asked.said.includes('## What is included') && asked.said.includes('table, 2 columns (Item | Cost)'));
  check('ASKED: the Word file uses the upload\'s body font', /w:ascii="Cambria"/.test(asked.styles));
  check('ASKED: and its heading font', /w:ascii="Calibri"/.test(asked.styles));
  check('ASKED: and its heading colour', /365F91/i.test(asked.styles));
  check('ASKED: and its margins', /w:left="1800"/.test(asked.body) && /w:top="1440"/.test(asked.body));
  check('ASKED: no page errors' + (asked.errs.length ? ' -> ' + asked.errs.join(' | ') : ''), asked.errs.length === 0);

  const notAsked = await build(browser, 'The letter for Mr Bello.\nPictures: none');
  check('NOT ASKED: the house font', !/Cambria/.test(notAsked.styles) && /w:ascii="Calibri"/.test(notAsked.styles));
  check('NOT ASKED: the house margins', /w:left="1250"/.test(notAsked.body));
  check('NOT ASKED: not the upload\'s colour', !/365F91/i.test(notAsked.styles));
  check('NOT ASKED: no page errors' + (notAsked.errs.length ? ' -> ' + notAsked.errs.join(' | ') : ''), notAsked.errs.length === 0);

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
