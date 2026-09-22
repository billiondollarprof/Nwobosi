# StellaXafe — Decision Log

Living record of what has been decided, including things not yet
committed to code. Read this before starting work. Update it as
decisions happen: add new ones, revise changed ones, delete reverted
ones. Newest relevant entries at the top of each section.

## This site now lives in the Nwobosi repo (2026-09-02)

**Decided and done.** The two repos were always the same product living
apart: this one held the public site, `Nwobosi` held the product, its
backend, and the `stellaxafe` domain. `Nwobosi` is now the single repo
with everything, and the pages here were ported into its React app.

What that means for anyone reading this repo:

- **Every page here now exists as a React route** in `Nwobosi/src/pages/`:
  Services, Contact, Founder (`/founder`), Insights, and Form Builder.
  The landing page content was merged into that app's existing landing
  page rather than replacing it.
- **The known limitation is fixed.** Modal styled pages were a real page
  load here, which `DESIGN-GUIDELINES.md` flagged and named client side
  routing as the correct long term fix. That is what happened.
- **The Demo page did not come across.** `Nwobosi` has a live setup flow
  that builds a real workspace, so that is the demo. Every link that
  pointed at `demo.html` now points at `/setup`.
- **The contact form now really sends**, through an edge function that
  emails `anthony@stellaxafe.com`. It was a front end acknowledgment here.
- **The X glyph and `stellaxafe-mark.svg` did not come across.** That app
  has its own interlocked rings mark, and one product cannot carry two
  logos. Amara's wordmark did come across, set in Fraunces as this repo's
  design guidelines require. XALOM's two theme assets came across as they
  are.
- Work on any of these pages happens in `Nwobosi` now, not here.

## Build phases

Agreed sequencing (asset extraction turned out to be a prerequisite for
the modal work, not an optional extra):

1. **Phase 1, assets and shared CSS** (done, pending review): pull every
   base64 image and the duplicated stylesheet out of the 7 pages into
   `assets/`.
2. **Phase 2, build script** (done, pending review): `build.py` plus
   `partials/`, `content/`, and `pages.py` as the single source of
   truth for the shared shell and page content.
3. **Phase 3, inline modals**: Services, Contact, and Founder rendered
   into `index.html` as instant modals, with the standalone pages kept
   as shareable-URL fallbacks.

### Phase 2 decisions

- **Layout of the source tree**:
  - `partials/` shared shell fragments: `head.html`, `nav.html`,
    `footer.html`, `tail.html`, `modal-open.html`, `modal-close.html`.
  - `content/<slug>.html` one file per page, holding only that page's
    own markup, nothing shared.
  - `pages.py` the manifest: title, description, which nav link to
    highlight, and layout (`page` or `modal`).
  - `build.py` assembles them into the root `*.html` files.
- **Workflow**: edit `partials/`, `content/`, or `pages.py`, then run
  `python3 build.py`. No dependencies, no npm, nothing to install.
- **The root `*.html` files are now generated output.** They stay
  committed, because Cloudflare Pages serves them directly and needs no
  build step on its side. Every generated page carries a "GENERATED
  FILE, DO NOT EDIT" banner at the top pointing at the real source, so
  a direct edit is not silently lost on the next build.
- **`x_glyph()` is restored** as a build helper, as
  `DESIGN-GUIDELINES.md` always described. It stamps a unique gradient
  id per instance, and the counter restarts on each page. Previously
  the ids ran off one global counter across the whole build, so the
  numbering depended on build order (`xg0`/`xg1` on index, `xg2`/`xg3`
  on services, and so on). This matters for Phase 3: once the modal
  partials are inlined into `index.html`, that page will hold several
  glyph instances at once, and duplicate ids would make later copies
  render with the first one's gradient.
- **Font loading fixed** (the Phase 1 follow up): the two font
  `@import`s moved out of `assets/styles.css` into the templated
  `<head>` as real `<link rel="stylesheet">` tags, preceded by
  `preconnect` hints, so fonts download in parallel with the stylesheet
  instead of waiting a round trip for it to parse. Both URLs were
  verified to round trip byte for byte after HTML unescaping.
  Caveat: webfonts are blocked in the sandbox, so the change was
  verified structurally, not by observing fonts actually render. Worth
  one eyeball locally.

### Phase 2 verification

`build.py` is idempotent, three consecutive runs produce byte identical
output. Regenerating the whole site from the extracted partials
reproduced all 7 pages exactly, the only differences being a handful of
stray blank lines and the gradient id renumbering described above.
Rendered before and after in headless Chromium: every page matched to
the exact pixel height, so nothing shifted.

### Phase 1 audit findings (the reason for this sequencing)

- 660 KB of the repo's 877 KB of HTML was base64 embedded images.
- The StellaXafe brand mark (200x200 PNG) was embedded **14 times**,
  nav and footer of all 7 pages, about 293 KB of pure duplication.
- `index.html` carried a 900x900 PNG at 198 KB, rendered at 190px wide
  with `opacity:0.16` as a decorative flourish. It was 59% of the
  homepage, and it was the **same artwork** as the brand mark.
- The 198-line `<style>` block was byte-identical across all 7 pages.
- The XALOM light/dark logos are 200x200 but render at 32px.

### Phase 1 decisions

- **Brand mark is now SVG** (`assets/stellaxafe-mark.svg`, 3.5 KB). It
  was auto traced from the 900px original (marching squares, then
  cubic bezier fitting) and verified at 95.7% silhouette IoU against
  the source, visually indistinguishable at display size. This single
  change removed roughly 490 KB: all 14 raster badge copies plus the
  198 KB decorative flourish, which now reuses the same SVG. It also
  brings the badge in line with `DESIGN-GUIDELINES.md` rule 4, every
  icon is inline SVG and no raster icons.
- The mark is referenced as `<img src="assets/stellaxafe-mark.svg">`
  rather than inlined, so the browser caches one copy for all 7 pages
  and there is no risk of duplicate SVG gradient IDs colliding in a
  single document.
- **Remaining rasters converted to WebP**, keeping original pixel
  dimensions: `xalom-light.webp`, `xalom-dark.webp`,
  `anthony-nwobosi.webp`. Dimensions deliberately left alone while
  branding is still in flux.
- Shared CSS extracted to `assets/styles.css`, linked by all 7 pages.
- Result: HTML across all 7 pages went from 877 KB to 107 KB (88%
  smaller), with `index.html` from 336 KB to 28 KB.

### Phase 1 verification

Rendered all 7 pages before and after in headless Chromium at 1280px,
in both dark and light themes, and compared full page screenshots.
Every page matched to the exact pixel height, so no layout shifted.
Pixel differences were 0.00% on most pages and never above 0.25%, and
all of them fall in mid page content bands rather than the nav or
footer. Inspecting the largest one showed the cause is the `.log-line`
stagger animation being captured at a slightly different moment, not
a rendering regression. Webfonts do not load in the sandbox, so both
sides rendered with fallback fonts; that affects both equally and does
not invalidate the layout comparison, but it does mean the screenshots
did not exercise webfont rendering.

### Phase 1 follow ups, still open

- The XALOM logos are still 200x200 but display at 32px. Downscale to
  about 64px once the XALOM branding is settled.
- The XALOM shield logos are simple geometric shapes and are good
  candidates for SVG reproduction too, which would remove another
  28 KB. Not done unilaterally, as XALOM is a separate product and its
  branding is the user's call.
- The two font `@import` lines now sit at the top of
  `assets/styles.css` instead of an inline `<style>`, which costs one
  extra round trip before the fonts start downloading (browser must
  fetch and parse `styles.css` before it discovers the imports). Fix
  in Phase 2 by moving them into the templated `<head>` as real
  `<link rel="stylesheet">` tags so they load in parallel. Not a
  correctness problem, only slightly later font swap on a cold load.

## Repositioning (supersedes earlier product decisions)

- **Form Builder & Automation is cut from StellaXafe.** No longer a
  product, not on the site, not in the nav, footer, or products
  section. It becomes separate private work if a business asks for it.
  This reverses the earlier decision that it would be the heaviest
  section and split across multiple files.
- **StellaXafe is the parent company**, a trust and safety company. The
  thing it sells is an enterprise private AI gateway: a zero trust layer
  letting companies use AI on their own data without that data leaving
  the perimeter. XALOM is infrastructure (trust and identity protocol
  for informal and social commerce markets). Amara is a SaaS product
  (guest intelligence and reputation for hospitality).
- **Design language moves to XALOM's**, which is already built at
  infrastructure grade. Light and institutional, not dark violet: navy
  ink, indigo, gold foil amber, verification green, on near white.
  Sora and DM Sans. More white space, fewer glows.
- **New brand mark: the Containment Seal.** Two concentric rings that
  cannot be separated, counter rotating, with a live egress count in
  the centre. Meaning: nothing leaks. It is the enterprise mirror of
  XALOM's Digital Trust Passport, and the number in it is real,
  read from the gateway's egress log.
- **The current site gets a rebrand, not a patch.** Form Builder is not
  being surgically removed from the existing dark design, because that
  surface is being replaced anyway and the removal would be throwaway
  work. Both happen together after the first build. Exception: if the
  current site is about to be shown to anyone, the removal is quick and
  should just be done.
- The WhatsApp customer support agent is real but parked. Most US
  companies do not run support on WhatsApp, and it doubles the build.

See `plans/01-positioning-and-brand.md` for the full brand direction,
and `plans/02-architecture.md` plus
`plans/03-build-schedule.md` for the build itself.

## Mobile layout fixes

Found by actually rendering the pages at 390px rather than trusting the
markup. On a phone several blocks were still locked to two columns, so
the text column collapsed to roughly 160px and body copy broke every
three words. Stacked up it read as if the text was repeating itself,
and it looked cheap.

- **Founder page had real horizontal overflow**, 411px of content in a
  390px viewport, so the page scrolled sideways. Cause: the hero block
  bleeds to the edge of `.modal-card` with `margin: -46px -44px`, but
  that card's padding drops from 44px to 22px at the 640px breakpoint,
  so the negative margin overhung by 22px each side. It is now a
  `.founder-hero` class whose bleed tracks the card padding, and it
  stacks to one column on a phone.
- **Services** was `repeat(2, 1fr)`, four cards jammed into two columns.
  Switched to the `repeat(auto-fit, minmax(250px,1fr))` pattern already
  used everywhere else, so it collapses on its own.
- **Demo** (prompt and checkpoint panels) and **Form Builder** (the
  "How We Deliver It" split) got a `.stack-mobile` class that forces one
  column under 720px.
- The index stat tiles were left as two columns on purpose. They are
  short labels and a number, and they read well side by side.

Verified after: all 7 pages at 390px and 1280px have
`scrollWidth == viewport width`, no sideways scroll anywhere, and the
desktop rendering is pixel identical to before the fix.

### Note for future screenshot checks

Two traps, both of which cost time here:

- A full page screenshot does not scroll, so `.flip-in` and `.fade-up`
  blocks below the fold are still invisible and show up as blank gaps.
  That is the animation, not missing content.
- Comparing screenshots taken in different browser runs produces small
  false differences, because the reveal animations settle at slightly
  different moments (the blocked webfont requests fail on their own
  schedule). Compare in one session, or allow the same settle time.

### Still worth a human eye

Webfonts are blocked in the build sandbox, Fontshare in particular, so
every screenshot above rendered with fallback fonts. Layout and overflow
conclusions hold regardless, but the actual typography has never been
seen. One thing to look at on a real device: the `X` glyph in the
wordmark is set to `0.72em`, which renders noticeably smaller than the
surrounding capitals and reads like a multiplication sign rather than
part of the word. That may be fine in Clash Display and wrong only in
the fallback. Not touched, since guessing at brand typography blind is
worse than leaving it.

## Deployment (Cloudflare Pages)

- **Platform: Cloudflare Pages**, not Workers. The Workers flow was
  tried first but Pages is the simpler fit for a purely static site and
  needs no `wrangler` config. Workers will still be needed later for the
  per organization Form Builder subdomains, since resolving a tenant
  from the hostname cannot be done by static file hosting. That is a
  separate project when the time comes, it does not block this one.
- Project name `stellaxafe`, so the preview host is
  `stellaxafe.pages.dev`.

### Settings to use in the Pages dashboard

| Field | Value |
| --- | --- |
| Framework preset | `None` |
| Build command | leave empty |
| Build output directory | `dist` |
| Production branch | the working branch for now, `main` once merged |

Build command stays empty on purpose: `dist/` is committed, so
Cloudflare only has to serve files and there is no build step, no
toolchain, and nothing to install on their side.

### Only `dist/` is ever published

`build.py` now writes into `dist/`, and `assets/` is copied in
alongside. This exists because pointing the deploy at the repo root
would publish everything in it, so `DECISIONS.md`, `CLAUDE.md`,
`build.py`, `partials/`, and `content/` would all be publicly
downloadable, for example `stellaxafe.pages.dev/DECISIONS.md`. The
generated pages no longer live at the repo root at all, which removes
the chance of pointing the deploy at the wrong directory.

The authoring banner and the design and copy rules comment are also
stripped from the built HTML now. They stay in `partials/head.html`
where the editing happens, but they are no longer in public view source
on every page. `DESIGN-GUIDELINES.md` used to state that the rules were
embedded in every generated page; that is updated, the embedding made
sense only while pages were hand edited.

## Active decisions

- **Page architecture**: `index.html` is the landing page. Services,
  Contact, and Founder (`anthony-nwobosi.html`) are content that also
  displays as an in page modal (dimmed backdrop, centered card, close
  button) reachable without a full page reload. Demo, Insights, and
  Form Builder & Automation are real standalone pages, not modals.

- **Modal + standalone sync (in progress, not yet built)**: content for
  Services, Contact, and Founder will live once in a `partials/`
  folder. A small local build script (`build.py`, no framework, no npm
  dependency tree) regenerates both the standalone page and the inline
  modal markup in `index.html` from those partials, so there is one
  source of truth and no hand copy pasting. At runtime the inline
  modal is shown/hidden with plain JS and no navigation; the build
  step only runs locally when authoring. See "In flight" below, spec
  pending go-ahead.

- **Framework decision**: staying on plain static HTML plus the build
  script above, not moving to Next.js yet. Revisit Next.js once
  branding/design has stabilized, or once the Form Builder multi
  tenant subdomain feature forces a real backend/app anyway (see
  below), whichever comes first.

- **Demo page**: lightweight showcase and lead capture only, points
  people to request sandbox access. The real product demo stays
  private and is shown manually by the founder, not hosted publicly.

- **Form Builder & Automation**: expected to become the heaviest
  section by design. Unlike the modal trio, it will be split across
  multiple files on purpose, not merged or inlined anywhere.

- **Code organization principle**: no single file with too many lines
  of logic, files kept decoupled so editing one does not create
  regressions in another via shared runtime globals. Build time
  templating from shared partials is not considered this kind of
  coupling.

- **Hosting**: not deployed yet. Target platform is Cloudflare Pages.
  Domain not yet purchased.

- **Subdomain plan (not yet built)**: XALOM is an entirely separate
  codebase and product, deployed as its own Cloudflare Pages project,
  sharing the root domain (e.g. `xalom.stellaxafe.com`) via DNS only.
  Form Builder customers will eventually get a subdomain per
  organization (e.g. `greenwichhospitals.stellaxafe.com`, business
  name first instead of a generic `forms.` prefix). That needs
  wildcard DNS (`*.stellaxafe.com`) plus Cloudflare Workers to resolve
  the tenant from the subdomain at request time, since static file
  hosting alone can't do arbitrary per customer subdomains. Not solved
  yet, flagged for when Form Builder is actually built.

## In flight / not yet committed to code

- Build script (`build.py`) plus `partials/` folder for Services,
  Contact, and Founder, and the injection of that content as hidden
  modal markup into `index.html`. Spec to be presented, needs explicit
  go-ahead before implementation per the new feature workflow in
  `CLAUDE.md`.
