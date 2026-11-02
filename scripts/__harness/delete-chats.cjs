/* DELETING CHATS FROM THE SIDEBAR.

   Anthony, 2026-09-23: "you can delete a chat at a time by pressing and
   holding it in the side bar and you can also select multiple chats and
   delete at the same time. But deleting a chat doesn't delete it's memory."

   Walked the way a person does it: hold one, tap another, cancel once to
   prove cancel does nothing, then delete for real and check the list the
   database hands back. Deleting HIDES a chat (see hideConversations in
   src/shared/session.js); the fake records which ids were hidden.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then, from the project root:
     node scripts/__harness/delete-chats.cjs
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const CHATS = [
  { id: 'conv-2', title: 'Pricing FAQ for customers' },
  { id: 'conv-3', title: 'Letter to the landlord' },
];

async function open(browser, { width = 1280, height = 900, theme = 'dark', fails = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(({ set, theme, fails }) => {
    try { localStorage.setItem('stellaxafe.theme', theme); } catch {}
    window.__RESUME = set;
    window.__HIDE_FAILS = fails;
    window.__SCRIPT = { orient: ['Hello.'] };
  }, { set: { updatedAt: minutesAgo(10), state: { v: 1 }, chats: CHATS }, theme, fails });
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.locator('button[aria-label="Open menu"]').click();
  await page.waitForTimeout(500);
  return { page, errs };
}

const chat = (page, title) => page.locator('aside button', { hasText: title }).first();

async function hold(page, title) {
  const box = await chat(page, title).boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(750);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

const heading = (page, text) => page.locator('aside p', { hasText: text }).count();
const inList = (page, title) => page.locator('aside button', { hasText: title }).count();

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());

  /* ---- 1. HOLD ONE, TAP ANOTHER, CANCEL, THEN DELETE ------------------- */
  {
    const { page, errs } = await open(b);
    check('three chats in the list to start with',
      (await inList(page, 'Board report')) === 1 && (await inList(page, 'Pricing FAQ')) === 1 &&
      (await inList(page, 'Letter to the landlord')) === 1);

    await hold(page, 'Board report');
    check('HOLDING A CHAT STARTS SELECTING IT', (await heading(page, '1 selected')) === 1);
    check('and holding does not open it as well', (await page.locator('aside').isVisible()));

    await chat(page, 'Pricing FAQ').click();
    await page.waitForTimeout(200);
    check('tapping a second chat adds it', (await heading(page, '2 selected')) === 1);

    await chat(page, 'Pricing FAQ').click();
    await page.waitForTimeout(200);
    check('tapping it again takes it back off', (await heading(page, '1 selected')) === 1);
    await chat(page, 'Pricing FAQ').click();
    await page.waitForTimeout(200);

    await page.locator('aside button', { hasText: 'Delete 2 chats' }).click();
    await page.waitForTimeout(400);
    check('it asks first', (await page.getByText('Delete 2 chats?').count()) === 1);
    check('and says the documents stay',
      (await page.getByText('Documents you made stay in your Library.').count()) === 1);
    await page.screenshot({ path: '/tmp/claude-0/delete-dialog.png' });

    await page.locator('[role="dialog"] button', { hasText: 'Cancel' }).click();
    await page.waitForTimeout(300);
    const callsAfterCancel = await page.evaluate(() => window.__HIDE_CALLS || 0);
    check('CANCEL CHANGES NOTHING: nothing was deleted', callsAfterCancel === 0);
    check('and both are still ticked', (await heading(page, '2 selected')) === 1);

    await page.locator('aside button', { hasText: 'Delete 2 chats' }).click();
    await page.waitForTimeout(300);
    await page.locator('[role="dialog"] button', { hasText: 'Delete 2 chats' }).click();
    await page.waitForTimeout(900);
    const hidden = await page.evaluate(() => window.__HIDDEN || []);
    check(`DELETED: exactly the two picked (${hidden.join(', ')})`,
      hidden.length === 2 && hidden.includes('conv-old') && hidden.includes('conv-2'));
    check('the list read back from the database has only the third',
      (await inList(page, 'Board report')) === 0 && (await inList(page, 'Pricing FAQ')) === 0 &&
      (await inList(page, 'Letter to the landlord')) === 1);
    check('selecting ends once it is done', (await heading(page, 'Pick up where you left off')) === 1);
    check('the chat that was open was one of them, so a clean chat starts',
      (await page.getByText('This is the board report you were working on.').count()) === 0);
    check('no page errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''), errs.length === 0);
    await page.close();
  }

  /* ---- 2. A PLAIN TAP STILL OPENS, and "Select" works without holding -- */
  {
    const { page } = await open(b);
    await chat(page, 'Letter to the landlord').click();
    await page.waitForTimeout(300);
    check('A PLAIN TAP DOES NOT START SELECTING', (await heading(page, 'selected')) === 0);

    await page.locator('button[aria-label="Open menu"]').click().catch(() => {});
    await page.waitForTimeout(400);
    await page.locator('aside button', { hasText: /^Select$/ }).click();
    await page.waitForTimeout(200);
    check('"Select" starts selecting for somebody who never holds',
      (await heading(page, 'Tap chats to select')) === 1);
    check('with nothing ticked, delete cannot be pressed',
      await page.locator('aside button', { hasText: 'Delete chat' }).isDisabled());
    await page.locator('aside button', { hasText: /^Cancel$/ }).click();
    await page.waitForTimeout(200);
    check('Cancel leaves selecting', (await heading(page, 'Pick up where you left off')) === 1);
    await page.close();
  }

  /* ---- 3. A DELETE THAT FAILS SAYS SO ----------------------------------- */
  {
    const { page } = await open(b, { fails: true });
    await hold(page, 'Letter to the landlord');
    await page.locator('aside button', { hasText: 'Delete chat' }).click();
    await page.waitForTimeout(300);
    await page.locator('[role="dialog"] button', { hasText: 'Delete chat' }).click();
    await page.waitForTimeout(800);
    check('FAILED: it says it could not', (await page.getByText('That could not be deleted. Try again.').count()) === 1);
    check('FAILED: and the chat is still in the list', (await inList(page, 'Letter to the landlord')) === 1);
    await page.close();
  }

  /* ---- 4. LOOKS, at phone and desktop, both themes ---------------------- */
  for (const [w, h, theme] of [[360, 780, 'light'], [360, 780, 'dark'], [1280, 900, 'light']]) {
    const { page } = await open(b, { width: w, height: h, theme });
    await hold(page, 'Board report');
    await chat(page, 'Letter to the landlord').click();
    await page.waitForTimeout(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${w} ${theme}: no sideways scroll (${sw})`, sw === w);
    await page.screenshot({ path: `/tmp/claude-0/delete-${w}-${theme}.png` });
    await page.close();
  }

  await b.close();
  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
