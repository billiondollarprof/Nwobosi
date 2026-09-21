/* THE DELETE THAT LOOKED LIKE IT WORKED.

   Anthony, 2026-09-21: a file deleted from the knowledge base kept its
   name, so uploading a new one with that name said the name was taken.

   The cause was `return !error`. A delete filtered by a row level security
   policy removes nothing and reports NO error, so the old code returned
   true, the screen dropped the file from the list, and the row stayed in
   the database.

   This walks both halves directly against removeSource, with a fake
   database that really deletes, and a switch that makes a delete match
   nothing the way a policy does.

   Run from the project root with the harness up, or via npm run flow which
   starts it for you.
*/

const { chromium } = require('playwright');

const OK = [], BAD = [];
function check(name, cond) { (cond ? OK : BAD).push(name); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => BAD.push('page error: ' + e.message));
  await page.goto('http://localhost:5301/?page=chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  /* A delete that works reports true and the row really goes. */
  const good = await page.evaluate(async () => {
    window.__BLOCK_DELETE = false;
    const said = await window.__session.removeSource('k1');
    return { said, left: window.__rows('knowledge_sources').length };
  });
  check('a delete that works says it worked', good.said === true);
  check('and the row is really gone', good.left === 0);

  /* A delete a policy filters out removes nothing and reports no error.
     This is the exact shape of the bug. */
  const blocked = await page.evaluate(async () => {
    window.__BLOCK_DELETE = true;
    return await window.__session.removeSource('k1');
  });
  check('THE FIX: a delete that removed nothing reports FAILURE, not success', blocked === false);

  await b.close();

  console.log('');
  for (const n of OK) console.log('  ok   ' + n);
  for (const n of BAD) console.log('  FAIL ' + n);
  console.log(`\n${OK.length} passed, ${BAD.length} failed`);
  process.exit(BAD.length ? 1 : 0);
})();
