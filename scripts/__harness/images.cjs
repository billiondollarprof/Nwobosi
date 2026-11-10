/* PICTURES, FROM THE CHAT INTO THE FILE.

   Anthony, 2026-09-23: "It should also have the capability to read image
   and know for sure which image goes into which slide. even if asked to
   include an image into a PDF or word intended document, it should take
   the image and asks or suggest where the image fits."

   A picture is attached in the chat. The walk checks it reaches the model
   with its file name, that the document can place it by that name, and
   that it is really inside the Slides, PDF and Word files that download.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then: node scripts/__harness/images.cjs
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const PHOTO = path.resolve(__dirname, 'fixtures/lobby.png');
const DOC = [
  '# Welcome to Amara',
  '',
  'A short tour for new guests.',
  '',
  '## Our lobby',
  ':::label Arrival',
  '',
  'Where every guest is greeted by name, as [[fig:lobby]] shows.',
  '',
  ':::image lobby.png | The front desk | Photo: Chidi Okafor',
  '',
  '## Still to come',
  '',
  ':::image rooftop.jpg | The rooftop bar',
].join('\n');

async function download(page, label) {
  const [d] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.locator('button', { hasText: new RegExp('^\\s*' + label + '\\s*$') }).first().click(),
  ]);
  return fs.readFileSync(await d.path());
}

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());
  const page = await b.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((doc) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SCRIPT = {
      orient: ['I can see the photo of your lobby.\nOFFER_INTERVIEW'],
      analyse: ['A short welcome deck. lobby.png goes on the arrival slide.\nFORMAT: pptx\nREADBACK_COMPLETE'],
      brief: ['Write it.'],
      generate: [doc],
    };
  }, DOC);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.locator('input[type="file"]').first().setInputFiles(PHOTO);
  await page.waitForTimeout(2500);
  await page.locator('textarea').first().fill('Make me a welcome deck with this photo');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1800);

  const sent = await page.evaluate(() => (window.__SENT || [])[0]);
  const last = sent?.messages?.[sent.messages.length - 1];
  const blocks = Array.isArray(last?.content) ? last.content : [];
  const labelAt = blocks.findIndex((x) => x.type === 'text' && x.text === 'IMAGE: lobby.png');
  check('THE PICTURE REACHES THE MODEL WITH ITS FILE NAME', labelAt >= 0);
  check('and the picture itself comes straight after its name', blocks[labelAt + 1]?.type === 'image');

  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'Go ahead with' }).first().click();
  await page.waitForTimeout(3500);

  const pptx = await download(page, 'Slides');
  const zipNames = pptx.toString('latin1');
  check('THE PICTURE IS INSIDE THE SLIDES FILE', /ppt\/media\/image[^"]*\.(png|jpe?g)/i.test(zipNames));
  const pdf = await download(page, 'PDF');
  check('THE PICTURE IS INSIDE THE PDF', /\/Subtype\s*\/Image/.test(pdf.toString('latin1')));
  const docx = await download(page, 'Word');
  check('THE PICTURE IS INSIDE THE WORD FILE', /word\/media\//.test(docx.toString('latin1')));

  await page.locator('button', { hasText: 'Show it here' }).first().click();
  await page.waitForTimeout(600);
  check('the preview shows the picture where it goes', (await page.locator('figure img[alt="The front desk"]').count()) === 1);
  check('and names the one nobody has given yet', (await page.locator('text=Picture: rooftop.jpg').count()) === 1);
  /* Added 2026-09-23, DOCUMENT-HARNESS sections 2 and 3. */
  check('THE CREDIT IS UNDER THE PICTURE', (await page.locator('figcaption', { hasText: 'Photo: Chidi Okafor' }).count()) === 1);
  check('the figure is numbered by code', (await page.locator('figcaption', { hasText: 'Figure 1.' }).count()) === 1);
  check('and the text points at it by number', (await page.locator('text=as Figure 1 shows').count()) === 1);
  await page.screenshot({ path: '/tmp/claude-0/images-preview.png', fullPage: false });
  check('no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);

  fs.mkdirSync('/tmp/claude-0/imgfiles', { recursive: true });
  fs.writeFileSync('/tmp/claude-0/imgfiles/welcome.pptx', pptx);
  fs.writeFileSync('/tmp/claude-0/imgfiles/welcome.pdf', pdf);
  fs.writeFileSync('/tmp/claude-0/imgfiles/welcome.docx', docx);

  await b.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
