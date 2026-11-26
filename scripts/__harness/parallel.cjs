/* SLIDES WRITTEN AT THE SAME TIME. Anthony, 2026-11-26: "Do the slides
   written in parallel."

   Walks:
     1. A deck whose plan numbers five slides: five writing turns, each told
        its slide, joined in order into one deck, then looked at as usual.
     2. A PDF is written in one go, as before. */

const { chromium } = require('playwright');
const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const BRIEF = ['WHAT IS BEING MADE: a deck', 'Slides: exactly 5',
  'Slide 1: Cover, Hotel pricing.', 'Slide 2: The plans, cards.', 'Slide 3: How it works, steps.',
  'Slide 4: Results, a stat.', 'Slide 5: Next step, statement.'].join('\n');
const PARTS = ['# Hotel pricing\n\nWhat each plan costs.\n\n## The **cover**\nA line.',
  '## The **plans**\n:::cards\n### Essential | Small\nGuest houses.\n### Premier | Growing\nRestaurants.\n:::',
  '## How it **works**\n:::steps\n### Ask | First\nTell us.\n### Build | Then\nWe build.\n:::',
  '## What it **brings**\n:::stat 30% | fewer rewrites\nLess back and forth.\n:::',
  '## Next **step**\n:::statement Book a **call** this week.'];

async function walk(browser, format) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([fmt, brief, parts]) => {
    window.__SCRIPT = {
      orient: ['If I understand, you want a pricing deck.\nOFFER_INTERVIEW'],
      analyse: [`**What:** pricing.\nFORMAT: ${fmt}\nREADBACK_COMPLETE`],
      brief: [brief],
      generate: fmt === 'pptx' ? parts : [parts.join('\n\n')],
      look: ['ALL CLEAR'],
    };
  }, [format, BRIEF, PARTS]);
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('textarea').first().fill('A pricing deck for hotels');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Yes, start now' }).first().click();
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Go ahead with' }).first().click();
  await page.waitForTimeout(10000);
  return { page, errs };
}

(async () => {
  const browser = await chromium.launch(require('./browser.cjs').launchOptions());
  {
    const { page, errs } = await walk(browser, 'pptx');
    const sent = await page.evaluate(() => (window.__SENT || []).filter((x) => x.stage === 'generate').map((x) => x.part && x.part.index));
    check(`DECK: five writing turns, one per slide (${sent.join(',')})`, sent.length === 5 && sent.every(Boolean));
    check('DECK: each told which slide of how many', JSON.stringify(sent.slice().sort()) === '[1,2,3,4,5]');
    const turns = await page.evaluate(() => (window.__TURNS || []).join(','));
    check(`DECK: then looked at as usual (${turns})`, turns.endsWith('look'));
    await page.locator('button', { hasText: 'Show it here' }).first().click();
    await page.waitForTimeout(600);
    const body = await page.locator('text=Book a').count();
    check('DECK: the last slide is in the deck', body >= 1);
    const order = await page.evaluate(() => { const t = document.body.innerText; return [t.indexOf('Guest houses'), t.indexOf('Tell us'), t.indexOf('Less back and forth')]; });
    check(`DECK: slides in order (${order.join(',')})`, order[0] > 0 && order[0] < order[1] && order[1] < order[2]);
    check('DECK: no page errors', errs.length === 0);
    await page.close();
  }
  {
    const { page, errs } = await walk(browser, 'pdf');
    const sent = await page.evaluate(() => (window.__SENT || []).filter((x) => x.stage === 'generate'));
    check(`PDF: written in one go (${sent.length})`, sent.length === 1 && !sent[0].part);
    check('PDF: no page errors', errs.length === 0);
    await page.close();
  }
  await browser.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
