/* THE ADMIN SEES A SHORT SUMMARY, NEVER THE WORK ITSELF.

   Anthony, 2026-09-23: "admin can see, just the short summery not the
   entire work."

   This walks saveWork and listWork (src/shared/session.js) against the fake
   database, which really stores what it is given:

   1. With work_content there (after the SQL has run): the whole document
      goes to work_content, and work_history only gets a short summary.
      The person's own Library gets the whole document back. The admin's
      list gets the short summary and who made it, and no document.
   2. With work_content missing (before the SQL has run): nothing is lost.
      The whole document goes back into summary, the old way, and the
      person's Library still opens all of it.

   Run from the project root with the harness up, or via npm run flow which
   starts it for you.
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

const DOC = [
  '# Amara Pricing FAQ',
  '',
  'Answers to the questions guests ask most about our room rates. Every price below is in naira and includes VAT.',
  '',
  '## Room rates',
  '',
  'A standard room is ₦85,000 a night, and the executive suite is ₦210,000.',
  '',
  '## Discounts',
  '',
  'Stays of seven nights or more get 10% off the room rate.',
  '',
  '## Payment',
  '',
  'We take card and bank transfer. A deposit of 30% holds the booking.',
].join('\n');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => BAD.push('page error: ' + e.message));
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  /* 1. After the SQL: two tables. */
  const after = await page.evaluate(async (doc) => {
    window.__NO_WORK_CONTENT = false;
    const saved = await window.__session.saveWork({ companyId: 'c1', staffId: 's1', title: 'Amara Pricing FAQ', skill: 'document', content: doc });
    const history = window.__rows('work_history').find((r) => r.id === saved.id);
    const body = window.__rows('work_content').find((r) => r.work_id === saved.id);
    const mine = (await window.__session.listWork('c1', 's1')).find((r) => r.id === saved.id);
    const admin = (await window.__session.listWork('c1')).find((r) => r.id === saved.id);
    return { summary: history?.summary, body, mine, admin };
  }, DOC);

  check('THE SUMMARY IS SHORT (280 characters at most)', typeof after.summary === 'string' && after.summary.length <= 280);
  check('it says what the work is for', /Answers to the questions guests ask most/.test(after.summary));
  check('and names its sections', /Sections: Room rates, Discounts, Payment\./.test(after.summary));
  check('NO FIGURE FROM THE BODY IS IN THE SUMMARY', !/₦|10%|30%/.test(after.summary));
  check('the whole document is in work_content', after.body?.content === DOC);
  check('under the person who made it', after.body?.staff_id === 's1' && after.body?.company_id === 'c1');
  check('the person\'s own Library opens the whole document', after.mine?.content === DOC);
  check('THE ADMIN LIST CARRIES NO DOCUMENT', after.admin && !('content' in after.admin) && after.admin.summary === after.summary);

  /* 2. Before the SQL: the old way, and nothing lost. */
  const before = await page.evaluate(async (doc) => {
    window.__NO_WORK_CONTENT = true;
    const saved = await window.__session.saveWork({ companyId: 'c1', staffId: 's1', title: 'Older way', skill: 'document', content: doc });
    const history = window.__rows('work_history').find((r) => r.id === saved.id);
    const mine = (await window.__session.listWork('c1', 's1')).find((r) => r.id === saved.id);
    window.__NO_WORK_CONTENT = false;
    return { saved: !!saved, summary: history?.summary, mine };
  }, DOC);

  check('BEFORE THE SQL: the save still works', before.saved);
  check('and the whole document is kept in summary, the old way', before.summary === DOC);
  check('and the Library still opens all of it', before.mine?.content === DOC);

  /* A short summary for a document with no sections and no sentence. */
  const bare = await page.evaluate(async () => {
    const saved = await window.__session.saveWork({ companyId: 'c1', staffId: 's1', title: 'Bare', skill: 'document', content: '| a | b |\n| - | - |\n| 1 | 2 |' });
    return window.__rows('work_history').find((r) => r.id === saved.id)?.summary;
  });
  check('a document with nothing to quote still gets a plain line', bare === 'A finished piece of work.');

  check('no page errors', !BAD.some((n) => n.startsWith('page error')));

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
