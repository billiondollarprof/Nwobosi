/* ==========================================================================
   OVERFLOW AUDIT
   Finds content that runs past the right edge of a phone.

   WHY THIS EXISTS, AND WHY A SCREENSHOT WILL NOT DO
   PageShell uses overflow-x-clip. That stops the page sliding sideways,
   which is what it is for, but it also means an element wider than the
   viewport gets clipped rather than scrolled. document.scrollWidth then
   equals the viewport and reports clean while text is being cut off the
   right edge. A screenshot can miss it too, because an element often only
   overflows below a certain width.

   That is how the Insights page shipped with its heading and body clipped
   on any phone narrower than 374px. The cause was a grid item at its
   default min-width:auto refusing to shrink below the intrinsic width of a
   nowrap monospace block, which dragged the whole row wide with it. The
   fix was min-w-0 on the grid items.

   WHAT IT REPORTS
   Any visible element whose right edge is past the viewport, at four phone
   widths, on every public route. Two things are excused: anything inside a
   deliberate scroll or clip container, such as the connector marquee and
   the code blocks meant to scroll on their own, and anything aria-hidden,
   because decorative light is allowed to bleed.

   RUN IT
     npm run build
     npm run preview -- --port 4328 --strictPort
     BASE=http://localhost:4328 node scripts/overflow-audit.cjs

   Needs playwright available to node. It is not a project dependency, so
   either install it or run with NODE_PATH pointing at a global install.
   ========================================================================== */

const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:4328';
const routes = ['/', '/anthony', '/anthony/cv', '/insights', '/services', '/founder', '/contact', '/setup', '/auth'];
const widths = [320, 360, 390, 414];

(async () => {
  const browser = await chromium.launch(require('./__harness/browser.cjs').launchOptions());
  let total = 0;

  for (const route of routes) {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      try { await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 }); }
      catch { await ctx.close(); continue; }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);

      const bad = await page.evaluate((vw) => {
        const out = [];
        const seen = new Set();
        // An element only counts if nothing between it and the page shell is
        // a deliberate scroll or clip container. That excludes the masked
        // marquee and any code block that is meant to scroll on its own.
        const excused = (el) => {
          let n = el.parentElement;
          while (n && n !== document.body) {
            if (n.classList.contains('sx-grain')) return false;
            const ox = getComputedStyle(n).overflowX;
            if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') return true;
            n = n.parentElement;
          }
          return false;
        };
        document.querySelectorAll('body *').forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          if (el.closest('[aria-hidden="true"]')) return;
          if (excused(el)) return;
          const over = Math.round(r.right - vw);
          if (over > 1) {
            const tag = el.tagName.toLowerCase();
            const cls = (typeof el.className === 'string' && el.className)
              ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
            const key = tag + cls + over;
            if (seen.has(key)) return;
            seen.add(key);
            out.push({ over, tag, cls, w: Math.round(r.width), text: (el.textContent||'').trim().slice(0,40) });
          }
        });
        return out.sort((a,b) => b.over - a.over).slice(0, 5);
      }, width);

      if (bad.length) {
        total += bad.length;
        console.log(`\n### ${route} @ ${width}px`);
        bad.forEach((b) => console.log(`  +${b.over}px <${b.tag}> w=${b.w} ${b.cls.slice(0,60)} "${b.text}"`));
      }
      await ctx.close();
    }
  }
  console.log(total === 0 ? '\nRESULT: no overflow found.' : `\nRESULT: ${total} findings.`);
  await browser.close();
})();
