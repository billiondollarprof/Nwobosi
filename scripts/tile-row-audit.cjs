/* ==========================================================================
   TILE ROW AUDIT
   Measures the three count tiles at the top of the admin Knowledge tab, at
   every width that matters, in both themes.

   WHY THIS EXISTS
   They used to stack on a phone, so three small numbers took most of the
   first screen and pushed the upload panel below the fold. Anthony:
   "they are eating space... they are pushing the part where you start
   uploading the knowledge downwards."

   Fixing that meant three columns inside about 90px each at 320px, which is
   the kind of layout that looks fine in one screenshot and breaks at the
   width nobody checked. So it is measured rather than looked at.

   WHAT IT CHECKS, per width and per theme:
     three tiles, not two and not four
     all three on the same row
     all three the same height
     equal column widths
     the third one inside the right edge
     no sideways scroll on the page

   IT USES THE WORST CASE LABELS ON PURPOSE. The seeded sources include one
   that failed, so the third tile reads "Could not be read", which is the
   longest label that can appear there. Checking the layout against its best
   case proves nothing.

   RUN IT
     npx vite --port 5199 --strictPort &
     node scripts/tile-row-audit.cjs

   It signs in with a planted session and answers Supabase locally, so it
   needs no real account and touches no real data.
   ========================================================================== */

const { chromium } = require('playwright');

const REF = 'cbunsqzkhidwjtxdsmxd';
const OUT = '/tmp/claude-0/-home-user/8f4ecd2f-3ccc-5d03-a093-a53eb66a1583/scratchpad';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FUTURE = Math.floor(Date.now() / 1000) + 86400 * 30;
const USER = '11111111-1111-1111-1111-111111111111';
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER, role: 'authenticated', exp: FUTURE })}.sig`;
const COMPANY = { id: 'c1', name: 'Amara', slug: 'amara', what_we_do: 'Guest feedback', industry: 'Hospitality', budget_cents_remaining: 72.96, is_exempt: false };
const STAFF = { id: USER, company_id: 'c1', name: 'Anthony', role: 'Admin', access_level: 'admin' };

/* A long label on purpose: "Could not be read" is the widest one that can
   appear, so the layout is checked against its worst case, not its best. */
const SOURCES = [
  { id: 's1', name: 'Executive brief with the numbers', description: 'Revenue', kind: 'file', status: 'failed', location: null, customer_visible: false, created_at: '2026-09-04T10:00:00Z' },
  { id: 's2', name: 'Amara: CCTV for Your Guest Experience', description: 'Landing page', kind: 'link', status: 'ready', location: 'https://amara.ng/', customer_visible: true, created_at: '2026-09-09T10:00:00Z' },
  { id: 's3', name: 'Amara pricing, current', description: 'What we charge', kind: 'file', status: 'pending', location: null, customer_visible: true, created_at: '2026-09-10T10:00:00Z' },
];

const WIDTHS = [320, 360, 375, 390, 414, 430, 600, 768, 834, 1024, 1280, 1440, 1920];

(async () => {
  const browser = await chromium.launch(require('./__harness/browser.cjs').launchOptions());
  const fails = [];

  console.log('width  theme  tiles  row  height  columns          label lines  upload starts');
  console.log('-----  -----  -----  ---  ------  ---------------  -----------  -------------');

  for (const width of WIDTHS) {
    for (const theme of ['dark', 'light']) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
      await ctx.addInitScript(({ ref, jwt, future, user, theme }) => {
        try {
          localStorage.setItem('stellaxafe.theme', theme);
          localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
            access_token: jwt, refresh_token: 'r', token_type: 'bearer',
            expires_in: 3600, expires_at: future,
            user: { id: user, aud: 'authenticated', role: 'authenticated', email: 'a@b.c', app_metadata: {}, user_metadata: {} },
          }));
        } catch {}
      }, { ref: REF, jwt: JWT, future: FUTURE, user: USER, theme });

      await ctx.route(`https://${REF}.supabase.co/**`, async (route) => {
        const url = route.request().url();
        const j = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) });
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
        if (url.includes('/auth/v1/user')) return j({ id: USER, aud: 'authenticated', role: 'authenticated', email: 'a@b.c', app_metadata: {}, user_metadata: {} });
        if (url.includes('/auth/v1/')) return j({});
        if (url.includes('staff_effective_limits')) return j([STAFF]);
        if (url.includes('/rest/v1/companies')) return j([COMPANY]);
        if (url.includes('/rest/v1/knowledge_sources')) return j(SOURCES);
        return j([]);
      });

      const page = await ctx.newPage();
      await page.goto('http://localhost:5199/amara', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);

      const m = await page.evaluate((vw) => {
        /* Scoped to the grid itself. Searching the whole page for the words
           also matched the "Being read" status pill on a source further
           down, which made it look like there were four tiles. */
        const grid = document.querySelector('.grid.grid-cols-3');
        const tiles = [];
        if (grid) {
          [...grid.children].forEach((el) => {
            const r = el.getBoundingClientRect();
            const label = el.querySelector('p:nth-of-type(2)');
            const lh = label ? parseFloat(getComputedStyle(label).lineHeight) : 0;
            tiles.push({
              top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
              right: Math.round(r.right),
              text: el.innerText.replace(/\s+/g, ' ').trim(),
              lines: label && lh ? Math.round(label.getBoundingClientRect().height / lh) : 0,
            });
          });
        }
        const up = [...document.querySelectorAll('*')].find((n) => n.textContent.trim() === 'Add company knowledge');
        return {
          tiles,
          uploadTop: up ? Math.round(up.getBoundingClientRect().top + window.scrollY) : -1,
          pageOverflow: document.documentElement.scrollWidth > vw,
        };
      }, width);

      const t = m.tiles;
      const oneRow = t.length === 3 && t.every((x) => Math.abs(x.top - t[0].top) <= 2);
      const sameH = t.length === 3 && t.every((x) => Math.abs(x.h - t[0].h) <= 2);
      const widths = t.map((x) => x.w);
      const evenCols = t.length === 3 && Math.max(...widths) - Math.min(...widths) <= 2;
      const inside = t.length === 3 && t[2].right <= width + 1;

      const ok = t.length === 3 && oneRow && sameH && evenCols && inside && !m.pageOverflow;
      if (!ok) fails.push(`${width} ${theme}: tiles=${t.length} row=${oneRow} height=${sameH} even=${evenCols} inside=${inside} overflow=${m.pageOverflow}`);

      console.log(
        String(width).padEnd(7) + theme.padEnd(7) + String(t.length).padEnd(7) +
        (oneRow ? 'yes' : 'NO ').padEnd(5) + (t[0] ? String(t[0].h) + 'px' : '-').padEnd(8) +
        widths.join('/').padEnd(17) + String(t.map((x) => x.lines).join('/')).padEnd(13) +
        String(m.uploadTop) + 'px' + (ok ? '' : '   <-- PROBLEM')
      );

      if ((width === 320 || width === 390 || width === 768 || width === 1440) && theme === 'dark') {
        const grid = page.locator('.grid.grid-cols-3').first();
        await grid.screenshot({ path: `${OUT}/tiles-${width}.png` }).catch(() => {});
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log('\n' + (fails.length ? 'PROBLEMS:\n' + fails.join('\n') : 'every width clean'));
  process.exit(fails.length ? 1 : 0);
})();
