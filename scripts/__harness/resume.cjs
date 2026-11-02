/* DOES THE LAST CHAT COME BACK WHEN THE PAGE LOADS, OR DOES A NEW ONE OPEN.

   The rule lives in src/shared/resumeWindow.js and its own unit test covers
   the arithmetic. This covers the half that unit test cannot: that Chat.jsx
   actually asks the rule and actually obeys the answer. A correct rule that
   the page never calls is worth nothing, and that failure looks like
   absolutely nothing on screen.

   Four walks, and the clock is a number rather than an hour of waiting.
   fake-session.js hands back one old conversation whose age and delivered
   flag come from window.__RESUME.

   Start the harness first:
     npx vite --config vite.harness.config.js
   Then, from the project root:
     node scripts/__harness/resume.cjs
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const LINE = 'This is the board report you were working on.';
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

/* Loads the chat with one old conversation staged, and reports what the
   person would actually be looking at. */
async function open(browser, { minutes, delivered }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', e => BAD.push('page error: ' + e.message));

  await page.addInitScript((set) => {
    try { localStorage.setItem('stellaxafe.theme', 'dark'); } catch {}
    window.__RESUME = set;
    /* Nothing should be sent in these walks, but a stage with no script
       throws rather than hanging, which would read as a resume failure. */
    window.__SCRIPT = { orient: ["Hello.\nOFFER_INTERVIEW"] };
  }, { updatedAt: minutesAgo(minutes), state: { v: 1, delivered } });

  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const reopened = (await page.getByText(LINE).count()) > 0;
  /* The old conversation has to still be reachable either way, which is
     the half of his ask that is about not losing anything. */
  const inRecent = (await page.getByText('Board report').count()) > 0;

  return { page, reopened, inRecent };
}

(async () => {
  const b = await chromium.launch(require('./browser.cjs').launchOptions());

  /* 1. Ten minutes ago, nothing downloaded. He is still working on it. */
  let r = await open(b, { minutes: 10, delivered: false });
  check('10 minutes ago: the chat he was in comes back', r.reopened === true);
  await r.page.screenshot({ path: '/tmp/claude-0/resume-10min.png', fullPage: true });
  await r.page.close();

  /* 2. Fifty nine minutes. Still inside the hour. A long meeting. */
  r = await open(b, { minutes: 59, delivered: false });
  check('59 minutes ago: still comes back', r.reopened === true);
  await r.page.close();

  /* 3. Two hours. Past the window. */
  r = await open(b, { minutes: 120, delivered: false });
  check('2 hours ago: a new chat opens instead', r.reopened === false);
  check('and the old one is still sitting in Recent', r.inRecent === true);
  await r.page.close();

  /* 4. THE ONE HE ASKED FOR. Yesterday. */
  r = await open(b, { minutes: 60 * 24, delivered: false });
  check('yesterday: a new chat opens', r.reopened === false);
  check('yesterday: the old chat is still in Recent', r.inRecent === true);
  await r.page.screenshot({ path: '/tmp/claude-0/resume-yesterday.png', fullPage: true });
  await r.page.close();

  /* 5. Finished and downloaded five minutes ago. Well inside the hour, and
        it must still open a new chat, because that job is done. */
  r = await open(b, { minutes: 5, delivered: true });
  check('downloaded 5 minutes ago: a new chat opens anyway', r.reopened === false);
  check('and that finished one is still in Recent', r.inRecent === true);
  await r.page.screenshot({ path: '/tmp/claude-0/resume-delivered.png', fullPage: true });
  await r.page.close();

  /* 6. Built five minutes ago but NOT downloaded. The difference between
        finished and merely written, which is the whole point of recording
        the download rather than the build. */
  r = await open(b, { minutes: 5, delivered: false });
  check('built but not downloaded 5 minutes ago: it comes back', r.reopened === true);
  await r.page.close();

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
