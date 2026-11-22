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

async function walk(browser, format, lookReply, { doc = DOC, revise = [], ask = 'Pricing for hotels' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([fmt, doc, look, fix]) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__SCRIPT = {
      orient: ['If I understand, you want pricing for hotels.\nOFFER_INTERVIEW'],
      analyse: [`**What:** pricing.\nFORMAT: ${fmt}\nREADBACK_COMPLETE`],
      brief: ['WHAT IS BEING MADE: pricing'],
      generate: [doc],
      look: Array.isArray(look) ? look : [look],
      ...(fix.length ? { revise: fix } : {}),
    };
  }, [format, doc, lookReply, revise]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('textarea').first().fill(ask);
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
    /* Since 2026-11-22 a fault goes to the fix; nothing scripted for it
       here, so the draft stays and the fault is still reported. */
    check(`SLIDES: the look agent ran, then the fix (${turns})`, turns.endsWith('look,revise'));
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

  /* 2b. THE FIX, 2026-11-22. The look finds a MAJOR fault, the fix stage
     sends back that section, the deck is drawn and looked at again, and the
     card says it was fixed. Anthony: "it will not go back to adjust it". */
  {
    const fixedSection = '## The plans\n:::cards\n### Essential | Small\nGuest houses.\n### Premier | Growing\nRestaurants.\n### Signature | Hotels\nHotels.\n:::';
    const { page, errs } = await walk(browser, 'pptx', ['MAJOR | Slide 2 | the third card is cut off | shorten it', 'ALL CLEAR'], { revise: [fixedSection] });
    await page.waitForTimeout(6000);
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`FIX: look, fix, look again (${turns})`, turns.endsWith('look,revise,look'));
    const asked = await page.evaluate(() => (window.__SENT || []).filter((x) => x.stage === 'revise').pop()?.messages?.[0]?.content || '');
    check('FIX: the fix was told the fault', asked.includes('Slide 2: the third card is cut off'));
    check('FIX: and given the draft', asked.includes('THE DRAFT') && asked.includes('## The plans'));
    check('FIX: the card says it was fixed', (await page.locator('text=Fixed: Slide 2, the third card is cut off.').count()) === 1);
    check('FIX: and that it is right now', (await page.locator('text=It is right now').count()) === 1);
    check('FIX: no red line left', (await page.locator('text=Tell me what to change').count()) === 0);
    await page.locator('button', { hasText: 'Show it here' }).first().click();
    await page.waitForTimeout(800);
    check('FIX: the document holds the fix', (await page.locator('text=Guest houses.').count()) >= 1);
    check('FIX: no page errors', errs.length === 0);
    await page.screenshot({ path: '/tmp/claude-0/look-fixed.png', fullPage: true });
    await page.close();
  }

  /* 2c. A one page PDF that runs over is cut to fit, measured by code. */
  {
    const long = '# Hotel plan\n\nWhat it is.\n\n' + [1, 2, 3, 4, 5, 6].map((i) => `## Part ${i}\n${'This sentence is here to fill the page with words. '.repeat(14)}`).join('\n\n');
    const short = '# Hotel plan\n\nWhat it is.\n\n## Part 1\nShort.\n\n## Part 2\nShort.\n\n## Part 3\nShort.\n\n## Part 4\nShort.\n\n## Part 5\nShort.\n\n## Part 6\nShort.';
    const { page, errs } = await walk(browser, 'pdf', 'ALL CLEAR', { doc: long, revise: [short], ask: 'A one page plan for hotels' });
    await page.waitForTimeout(8000);
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`ONE PAGE: over the page goes to the fix (${turns})`, turns.includes('revise'));
    const asked = await page.evaluate(() => (window.__SENT || []).filter((x) => x.stage === 'revise').pop()?.messages?.[0]?.content || '');
    check('ONE PAGE: the fix was told to fit one page', /must fit on one page/.test(asked));
    check('ONE PAGE: the card says it was tightened', (await page.locator('text=tightened to fit').count()) === 1);
    check('ONE PAGE: no page errors', errs.length === 0);
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
