/* THE LOOK, BEFORE THE FILE IS HANDED OVER.

   Anthony, 2026-11-10: "The system should look at what it made (screenshot)
   before handing it over, especially slides."

   Walks:
     1. Slides: the deck is drawn as pictures and sent to the look agent with
        what measuring found; the download waits; what the agent says shows
        on the card.
     2. PDF, all clear: the pages are drawn from the real file and the card
        says nothing is out of place.
     3. Word: not looked at, finishes as before.

   The first slide picture is kept in /tmp/claude-0/look-slide-1.jpg to look
   at by eye. Run from the project root with the harness up, or via npm run
   flow. */

const { chromium } = require('playwright');
const fs = require('fs');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const DOC = '# Pricing for hotels\n\nWhat each plan costs.\n\n## The plans\n:::cards\n### Essential | Small\nFor guest houses and small restaurants.\n### Premier | Growing\nFor growing restaurants and spas.\n### Signature | Hotels\nFor hotels and resorts.\n:::\n\n## Next step\nBook a call.';

async function walk(browser, format, lookReply) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([fmt, doc, look]) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SCRIPT = {
      orient: ['If I understand, you want pricing for hotels.\nOFFER_INTERVIEW'],
      analyse: [`**What:** pricing.\nFORMAT: ${fmt}\nREADBACK_COMPLETE`],
      brief: ['WHAT IS BEING MADE: pricing'],
      generate: [doc],
      look: [look],
    };
  }, [format, DOC, lookReply]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('textarea').first().fill('Pricing for hotels');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Go ahead with' }).first().click();
  await page.waitForTimeout(9000);
  return { page, errs };
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());

  /* 1. Slides with a problem. */
  {
    const { page, errs } = await walk(browser, 'pptx', 'Slide 2: the third card is cut off.');
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`SLIDES: the look agent ran (${turns})`, turns.endsWith('look'));
    const sent = await page.evaluate(() => {
      const s = (window.__SENT || []).filter((x) => x.stage === 'look').pop();
      const content = s?.messages?.[0]?.content || [];
      return { images: content.filter((b) => b.type === 'image').map((b) => b.source.data.slice(0, 200000)), text: content[0]?.text || '' };
    });
    check(`SLIDES: every slide went as a picture (${sent.images.length})`, sent.images.length >= 3);
    if (sent.images[1]) fs.writeFileSync('/tmp/claude-0/look-slide-2.jpg', Buffer.from(sent.images[1], 'base64'));
    if (sent.images[0]) fs.writeFileSync('/tmp/claude-0/look-slide-1.jpg', Buffer.from(sent.images[0], 'base64'));
    check('SLIDES: the card says what the look found', (await page.locator('text=Slide 2: the third card is cut off.').count()) === 1);
    check('SLIDES: and offers the change', (await page.locator('text=Tell me what to change').count()) === 1);
    check('SLIDES: the download is there once the look is done', (await page.locator('button', { hasText: 'Slides' }).count()) >= 1);
    check('SLIDES: no page errors', errs.length === 0);
    await page.screenshot({ path: '/tmp/claude-0/look-card.png', fullPage: true });
    await page.close();
  }

  /* 2. PDF, all clear. */
  {
    const { page, errs } = await walk(browser, 'pdf', 'ALL CLEAR');
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`PDF: the look agent ran (${turns})`, turns.endsWith('look'));
    check('PDF: the card says nothing is out of place', (await page.locator('text=Nothing is out of place').count()) === 1);
    check('PDF: no page errors', errs.length === 0);
    await page.close();
  }

  /* 3. Word: not looked at. */
  {
    const { page, errs } = await walk(browser, 'docx', 'ALL CLEAR');
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`WORD: no look (${turns})`, !turns.includes('look'));
    check('WORD: it still finishes', (await page.locator('text=Done. It is ready below.').count()) === 1);
    check('WORD: no page errors', errs.length === 0);
    await page.close();
  }

  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
