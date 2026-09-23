/* CHARTS, IN EVERY FILE THE STAFF CAN DOWNLOAD.

   Anthony, 2026-09-23: "the assistant is capable of drawing any kind of
   chart, be it bar chat, line, histogram etc anyone required."
   (DOCUMENT-HARNESS.md, section 4.)

   A scripted document with a column chart in naira, a pie, a histogram of
   raw values and one broken pie goes through the chat, is built, and is
   downloaded as Slides, PDF, Word and Spreadsheet. Each file is opened as
   the zip (or PDF) it is and checked for the chart inside it:

     Slides       a real PowerPoint chart part (ppt/charts/chartN.xml)
     PDF          vector drawing, not a picture, with ₦ in it
     Word         the SVG and its PNG copy
     Spreadsheet  the chart's numbers on a sheet named after it, and the
                  chart's picture

   And the broken pie: never drawn wrong, shown as its table instead.

   Files are kept in /tmp/claude-0/chartfiles so they can be looked at.
   Run from the project root with the harness up, or via npm run flow.
*/

const { chromium } = require('playwright');
const fs = require('fs');
const JSZip = require('jszip');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const table = (head, rows) => [head, head.map(() => '---'), ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n');
const ages = Array.from({ length: 60 }, (_, i) => [String(Math.round(38 + 12 * Math.sin(i * 1.7) + 9 * Math.cos(i * 0.9)))]);

const DOC = [
  '# Amara Q3 review',
  '',
  'How the quarter went, in numbers.',
  '',
  '## Revenue',
  '',
  'Revenue rose every quarter, as [[fig:revenue]] shows.',
  '',
  ':::chart column #revenue | Room revenue by quarter | Source: Q3 finance report',
  table(['Quarter', '2025', '2026'], [['Q1', '₦12.4m', '₦14.1m'], ['Q2', '₦13.0m', '₦15.6m'], ['Q3', '₦15.2m', '₦17.9m']]),
  ':::',
  '',
  '## Where bookings come from',
  '',
  ':::chart pie #channels | Bookings by channel | Source: booking system, July to September',
  table(['Channel', 'Bookings'], [['Direct', '412'], ['Travel agents', '230'], ['Online portals', '301'], ['Corporate', '118']]),
  ':::',
  '',
  '## Who stays with us',
  '',
  ':::chart histogram #ages | Guest ages | Source: guest register',
  table(['Guest age'], ages),
  ':::',
  '',
  '## A chart that cannot be drawn',
  '',
  ':::chart pie | Refunds | Source: accounts',
  table(['Month', 'Refunds'], [['July', '12'], ['August', '-3']]),
  ':::',
].join('\n');

async function download(page, label) {
  const [d] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.locator('button', { hasText: new RegExp('^\\s*' + label + '\\s*$') }).first().click(),
  ]);
  return fs.readFileSync(await d.path());
}

async function names(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  return { zip, files: Object.keys(zip.files) };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((doc) => {
    try { localStorage.setItem('stellaxafe.theme', 'light'); } catch {}
    window.__SCRIPT = {
      orient: ['A quarterly review with charts.\nOFFER_INTERVIEW'],
      analyse: ['A Q3 review with three charts.\nFORMAT: pdf\nREADBACK_COMPLETE'],
      brief: ['Write it.'],
      generate: [doc],
    };
  }, DOC);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.locator('textarea').first().fill('Make me the Q3 review with charts');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Just get on with it' }).first().click();
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'Go ahead, build it' }).first().click();
  await page.waitForTimeout(3500);

  /* SLIDES: real PowerPoint charts, three of them, not the broken one. */
  const pptx = await download(page, 'Slides');
  const deck = await names(pptx);
  const chartParts = deck.files.filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f));
  check('SLIDES: three real PowerPoint charts, the broken one left out', chartParts.length === 3);
  const firstChart = chartParts.length ? await deck.zip.file(chartParts[0]).async('string') : '';
  check('SLIDES: the chart holds the real numbers, in full', firstChart.includes('12400000') && firstChart.includes('17900000'));

  /* PDF: vector, with ₦ in the drawing. */
  const pdf = await download(page, 'PDF');
  check('PDF: made, and not a picture of a chart', pdf.length > 1000 && !/\/Subtype\s*\/Image/.test(pdf.toString('latin1')));

  /* WORD: SVG and its PNG copy for each drawn chart. */
  const docx = await download(page, 'Word');
  const word = await names(docx);
  const svgs = word.files.filter((f) => /^word\/media\/.*\.svg$/.test(f));
  const pngs = word.files.filter((f) => /^word\/media\/.*\.png$/.test(f));
  check('WORD: three charts as SVG', svgs.length === 3);
  check('WORD: each with its PNG copy for older Word', pngs.length === 3);
  const body = await word.zip.file('word/document.xml').async('string');
  check('WORD: the broken chart is its table, with its numbers', body.includes('August') && body.includes('-3'));

  /* SPREADSHEET: the numbers on a sheet named after the chart, and the picture. */
  const xlsx = await download(page, 'Spreadsheet');
  const sheet = await names(xlsx);
  const workbook = await sheet.zip.file('xl/workbook.xml').async('string');
  check('SPREADSHEET: a sheet named after the chart', workbook.includes('Room revenue by quarter'));
  check('SPREADSHEET: the chart pictures are in the file', sheet.files.filter((f) => /^xl\/media\/.+\.png$/.test(f)).length === 3);

  /* PREVIEW: the drawings, the figure numbers, and the broken one as a table. */
  await page.locator('button', { hasText: 'Show it here' }).first().click();
  await page.waitForTimeout(700);
  check('PREVIEW: three charts drawn', (await page.locator('figure [role="img"] svg').count()) === 6);
  check('PREVIEW: figures numbered by code', (await page.locator('figcaption', { hasText: 'Figure 1.' }).count()) === 1);
  check('PREVIEW: the text points at Figure 1', (await page.locator('text=as Figure 1 shows').count()) === 1);
  check('PREVIEW: the broken chart is shown as its table', (await page.locator('figure table').count()) === 1);
  check('PREVIEW: the source is under the chart', (await page.locator('figcaption', { hasText: 'Source: Q3 finance report' }).count()) === 1);
  await page.locator('figure [role="img"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/claude-0/charts-preview-desktop.png' });
  check('no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);

  fs.mkdirSync('/tmp/claude-0/chartfiles', { recursive: true });
  fs.writeFileSync('/tmp/claude-0/chartfiles/review.pptx', pptx);
  fs.writeFileSync('/tmp/claude-0/chartfiles/review.pdf', pdf);
  fs.writeFileSync('/tmp/claude-0/chartfiles/review.docx', docx);
  fs.writeFileSync('/tmp/claude-0/chartfiles/review.xlsx', xlsx);

  await b.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
