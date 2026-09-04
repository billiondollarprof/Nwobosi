# SESSIONS.md

Log of each work session. Newest at the top. Keep entries short.

---

## Session 6: 2026-09-04

**The landing page, and the mark it was missing**

- **The Containment Seal is the mark now**, built from `MARK.md` instead of from memory. `ContainmentSeal.jsx` is the hero version, three layers of lit tube with the bead orbiting the channel once every ten seconds. `LogoMark` in `icons.jsx` is the small still one, so nav, footer, chat, admin and auth all changed with it. Favicons, the touch icon and the social mark were all regenerated.
- Only the idle state is built. `MARK.md` also specifies a verified pulse and a blocked bounce, and both wait on a real event. The rule that governs the figures under the mark governs its motion too: a mark that reports things that did not happen is worse than one that reports nothing.
- **The ground moved off pure black** to `#05060D`, a near black with a faint blue cast, and stays cool. Pure black is what makes a dark product look cheap, and warming it would cost the gold bead the contrast that makes it the focal point. This is in `tokens.js`, so it moved every screen, not just the landing page.
- **Display type dropped from weight 700 to 500** and went up in size, with tighter tracking. At 54px bold is shouting. This is the single change that does most of the work, and it came from what ElevenLabs actually does: their display face runs at weight 300.
- **The read back is now on the page**, as the real component out of the chat screen rather than a drawing of one. Same rows, same words. It is the most convincing thing the product has and it was not being shown.
- The problem section and the research behind it are now one block instead of two, and every section below the fold arrives on scroll. The reveal rests visible, so a failed script or reduced motion leaves the page readable rather than blank.
- Headline sentences are each their own block so they balance independently. As one balanced block the second sentence kept dropping "it." onto a line by itself.
- Checked: build clean, all six pages captured desktop and mobile in both themes with no sideways scroll and nothing left hidden after scrolling, 14 click through checks passing, and `/setup` and `/auth` rendered to confirm the new mark did not break the app screens.
- `LogoAnimated.jsx` is now unused. Left in place rather than deleted, because the logo choice is still the user's to make and nothing imports it, so it costs nothing in the bundle.
- Fonts are blocked in this sandbox, so every screenshot is in fallback faces. Sora's real metrics could not be checked, which is why the headline was made to balance rather than tuned to fit.

---

## Session 5: 2026-09-02

**The StellaXafe site moved into this app**

- The two repos were the same product living apart: the marketing site was a separate Python generated static site, this repo was the product. Everything the site had and this app did not is now here, as React pages. This repo is the one with everything.
- Six public pages now share one nav and one footer: landing, `/services`, `/founder`, `/insights`, `/form-builder`, `/contact`. Services, Founder and Contact read as modals over the site, which is what the static site was going for, except arriving at one is instant now. That page reload was written up as a known limitation in the old repo, and moving into the router is what fixed it.
- New shared pieces: `MarketingNav.jsx`, `MarketingFooter.jsx`, `ModalCard.jsx`, and `marketing.jsx` for the page shell, eyebrow, section head, gradient text and divider. Chat, admin, auth and setup use none of them and were not touched.
- Landing kept its hero exactly as it was, one button, and gained what it was missing: the research reality check with sources cited straight, where we deploy, the four services, the products at `#products` (Amara, XALOM, Form Builder), and the insights teaser.
- **Demo does not get its own page.** `/setup` is the real demo, so every link the old site pointed at `demo.html` now points at `/setup`.
- **The contact form really sends.** New `send-contact` edge function emails `anthony@stellaxafe.com` through Resend, with the sender's address set as the reply to. It needs `RESEND_API_KEY` in the Supabase dashboard before anything leaves. Until then it fails closed with a plain message.
- BuildFest is cleared everywhere: the docs, the landing footer line, the stale `anthony@buildfest.com` sign in note, and the project plan PDF, renamed `stellaxafe_project_plan.pdf` with both its metadata and its visible text rewritten. Same in the StellaXafe repo's plan notes.
- Checked: build clean, all six pages captured desktop and mobile in both themes with no sideways scroll anywhere, and 14 click through checks passing, covering every nav link, the products anchor from another page, modal close and Escape, the hero CTA, footer links, the contact form's gate, and the mobile menu.
- Not done: the live send, this sandbox cannot reach `supabase.co`. Fonts also could not load here, so the screenshots show fallback faces rather than Sora and DM Sans.
- After review: the README's source tree and Status section were both stale, describing four pages and a front end with seeded data, which stopped being true several sessions ago. Both now say what is actually there, and Status points at `CURRENT.md` as the one to trust. The word "hackathon" was cleared from the StellaXafe repo's plan notes and their filenames, same as BuildFest.

---

## Session 3: 2026-08-25

**Hero copy split, plus the shimmer**

- Mobile now gets its own short subtext instead of the same long one shrunk down. Tablet and desktop keep the longer version, which now names "row-level security" directly, the one real technical term the landing page rule (added earlier this session) actually calls for.
- Wired up `sx-shimmer`, a keyframe that already existed in `index.css` but had never been used anywhere. A light band lives inside the second headline line's gradient now, sweeping across slowly.
- Confirmed the split renders right at mobile, tablet, and desktop widths, and caught the shimmer visibly moved between two shots 3.2 seconds apart.
- H1 itself untouched, it already said the right thing in plain words. `npm run build` clean, merged to `main`.
- Still open from the spec: the hero ending exactly at the fold on mobile, page structure below the hero, the connectors section. User's next stated priority is the "heavy" work, connectors and the real Anthropic API, flagged as Opus territory per CLAUDE.md when we get there.

**Speech to text, real this time**

- Built `src/shared/useSpeechToText.js`, a small hook around the browser's own Web Speech API. Kept the recognition object in a ref, built once, not rebuilt on every render, rebuilding it mid sentence would have cut the session.
- Wired it to the chat mic button: tap to start, whatever was already typed stays and the transcript lands after it, tap again or just stop talking to end. Distinct visuals for actually listening, a faster red pulse and a solid red button, instead of reusing the idle invitation-to-tap style.
- Hides the mic entirely on a browser without the API, rather than a control that cannot work. Also auto stops if the control itself would disappear (step reaching 3), so a session never runs with nothing showing it is live.
- Checked in a browser: idle and with typed text both render right, no console errors either way. Could not exercise an actual live transcript, this sandbox has no microphone and no route to the speech service a real browser would use, that needs a real phone to confirm.
- Merged to `main` and pushed.

**Logo settled**

- Locked the brand colors: navy `#1420A0`, purple `#7C3AED`, unchanged from `tokens.js`.
- Built `public/favicon.svg`: a new square composition, not a crop of the hero mark. Same stroke to radius ratio and same gap to radius ratio as the animated mark, so it reads as the same logo, just fitted to a square tab icon. Frozen gradient, same interlock mask trick as the hero mark.
- The existing `LogoMark` in `icons.jsx` uses `mix-blend-mode: screen`, which lightens against whatever sits behind it. Fine on a dark nav bar, wrong for a favicon that has to sit on other people's tab colors, so it was not reused.
- Rendered `favicon-32.png` and `apple-touch-icon.png` (180x180) from that SVG with headless Chromium, transparent background.
- Built a frozen, non-animated version of the full hero mark (same geometry as `LogoAnimated.jsx`, gradients stopped rather than removed) and rendered `logo-mark.png` at 1024x666, transparent, for anywhere the mark needs to sit still: email headers, social previews.
- Wired favicon and apple touch icon links into `index.html`, plus basic Open Graph and Twitter card tags using `logo-mark.png`.
- Not done: a full social share card with the wordmark and tagline set in Sora and DM Sans. This sandbox cannot load Google Fonts during headless rendering, so any text-bearing image built here would silently fall back to system fonts. Shipped the ring mark alone as `og:image` instead of a low fidelity fallback. A proper share card needs building somewhere that can reach Google Fonts, or by hand in Canva/Figma.
- `npm run build` passes clean.

**Landing page rebuild spec, and a round of fact checking**

- User shared a reference landing page (Xalom) and asked for that level of polish, plus a fixed logo animation (no float, zero gap at the ring crossing, a stretch and release breathing motion), a theme aware glass pill navbar, split mobile/desktop hero subtext, a hero that never looks cut off on mobile, a five part page structure (hero, problem with stats, examples, solution, projection), and two more connector logos. Full spec written into `CURRENT.md`. Not built yet.
- Confirmed the model switch happens before the read back, not after the prompt, matching what was already designed. Added the missing piece: after the read back, a user correction is conversation, so it drops back to the lower tier for that turn, still working inside the same already retrieved context. Only escalates back up if the correction changes what needs retrieving.
- Fact checked two pitch texts the user had drafted elsewhere. First one had real invented capabilities in it: local parsing, PII redaction, a "zero-trust runtime" or "AI police" governance layer, none of that is built. Second one, a market research summary, checked out: verified the McKinsey pilot-purgatory figure, the IBM shadow AI breach cost premium, and the Samsung ChatGPT leak via web search, all real.
- Clarified the no-leakage story: not claiming physical isolation today, that comes with the post-hire migration to a company's own VPC or on-premise system, meant to take under a week once a company is paying for private infrastructure instead of shared Supabase. The demo should still feel tight and locked down even while running on shared infra.
- Flagged two open items: a staff-facing "picking up from last time" view (the `work_history` table exists, nothing shows it yet), and a real onboarding/migration spec for when an actual company signs on. Neither started.
- Confirmed the copy voice rule: no em dashes and short sentences by default, but the system adapts to a company's own material when it already has a distinct voice.

**Logo interlock fix, first item of the landing rebuild**

- The old crossing used a plain round cutout to hide the right ring, which left a visible dent where a straight circle edge met a curved stroke. Replaced it with a cutout shaped like the covering ring's own stroke, clipped to a small patch around the top crossing only, so it does not also blank out the bottom one. Zero gap now, the two rings read as fused. Same fix carried into `favicon.svg` and the static mark, PNGs re-rendered.
- Added the requested second motion: the whole mark stretches slightly then eases back with a small overshoot, an 8 second loop, on top of the existing colour travel. Both rings move as one piece so the crossing fix holds through the whole animation, not just at rest, scaling each ring separately would have let the hole drift.
- Verified live in a browser, screenshotted the animated mark at four points across the cycle. Crossing stays fused in every frame, colour travel and stretch both visibly running. `npm run build` passes clean.
- Navbar, hero copy, page structure, and the connectors section are still open, next up.

**Navbar, second item on the landing list**

- Turned out the floating glass pill the user wanted already existed: `FloatingNav` in `ui.jsx`, already shared by Chat and Admin, already theme aware through `--nav-surface` (dark glass in dark mode, white glass in light). Swapped Landing's plain header for it instead of building a new one.
- Added an opt-in `sticky` prop to `FloatingNav`, on for Landing only, so the pill stays pinned while the page scrolls under it. Chat and Admin keep their old behaviour.
- Checked in a browser: dark and light, desktop and mobile, scrolled deep with the pill still pinned, clicked the theme toggle and confirmed the whole page including the pill's own tint switches. No console errors.
- Hero copy, page structure, and the connectors section are still open, next up.

**Live feedback round: quick fixes, the hero cloud, and a real merge**

- User checked the live site and reported the gap still visible, the old placeholder nav mark, "See it working" still there. Turned out `main` had never received anything past the original Supabase and Cloudflare setup, session 2 onward all sat on the working branch only. Explained it, got permission, merged `claude/nwobosi-access-5mces1` into `main` and pushed (commit `95ee8e0`), both branches match now.
- Quick fixes from the same feedback: removed "See it working" (one button on the hero now), removed "Read aloud" under chat replies (speech to text stays, real wiring still open), replaced the small nav `LogoMark` with the actual interlocked mark instead of the old two-discs placeholder, sped up the hero mark's colour travel from 11s to 7s a lap.
- Built the hero cloud: a soft drifting wash above the mark, three blurred blobs on a shallow arc plus a wider faint layer, independent timing so it reads as smoke. Checked dark, light, mobile, and two frames six seconds apart to confirm the drift is actually live.
- Started actually sending screenshots to the user as files instead of only describing them, per their reminder.
- Still open from this feedback round: the ambient cloud was the only piece done, real speech to text wiring, the hero H1/subtext rewrite plus a shimmer on the second line, and a full viewport and orientation pass on both Landing and Chat are next.

---

## Session 1: 2026-08-24

**Setup and docs**

- Repo was empty. Added `stellaxafe_project_plan.pdf` and the chat prototype.
- Set up `CLAUDE.md`, `CURRENT.md`, and this file. Opened PR #1.
- Read the full 8 page project plan and the whole chat prototype.
- Named the product StellaXafe. Rewrote `README.md` around it.

**Decisions**

- Architecture: single page app, source split into page modules, instant section switching.
- Stack: Supabase for auth, database, and pgvector RAG. Cloudflare Pages for hosting. Resend for email. Chosen because Supabase self hosts into a VPC later and keeps the vector index inside the same security boundary as the users.
- Knowledge rule: one index, always locked, admin decides its contents. No sector crawling. Hallucination is blocked by provenance at generation time, not by restricting the model's general knowledge.
- Model tiers confirmed, pricing corrected. Opus 5 is cheaper than Fable 5. Demo caps at Sonnet 5.

**Build**

- Scaffolded Vite, React 18, Tailwind 3, react-router-dom, lucide-react.
- Split the single file prototype into four pages plus five shared modules. Deleted the old monolith.
- Built the Landing, Auth (login, request access, OTP), and Admin (knowledge base, connectors, access, usage) pages from scratch to match the chat's design language.
- Drove the whole app in a browser: screenshotted every page in both themes plus mobile, and clicked through the interview, generation, library, connectors, OTP, and admin approve flows. All working.
- Found and fixed a layout bug where a long chat pushed the composer off screen.

**Next**

Close the four flow gaps in the chat (read back, prompt writing, retrieval, model routing), then Supabase, then deploy to Cloudflare Pages, then real auth and connectors.

### Repo description to paste by hand

No write token was available in the session, so the GitHub description field could not be set from here. Paste this into the repo settings:

> StellaXafe: a private AI gateway for enterprises. Runs a guided interview, reads only your company's approved knowledge, writes the prompt, then generates the file. Stops data leakage, cuts prompt iteration, and keeps every output on brand.

---

## Session 2: 2026-08-24

- Merged PR #1. Main now holds the whole app.
- Resolved a conflict: two commits had been made directly on main editing README.md, which left it empty. Kept the full README, nothing was lost.
- Repo is private now. Description is set. Default branch is main.
- Added `wrangler.jsonc` for the Cloudflare deploy. Assets only Worker, with single page application fallback so /chat and /admin resolve on a direct load.
- Added the product principle to `CLAUDE.md`: no settings on the staff side, no plumbing exposed to the admin, plain words in every screen, and only two things stay visible (the read back, and which sources were used).
- Applied it: the admin knowledge base now says Ready and Being read instead of Indexed and Indexing.
- Confirmed from the Canva API that its export formats are PDF, JPG, PNG, PPTX, GIF, MP4, and CSV. No DOCX, no XLSX. Decks go through Canva, visual documents come back as PDF, and spreadsheets are always generated directly.

Next: connect the repo in Cloudflare, then Supabase.
- Created Supabase project `stellaxafe` (ref `cbunsqzkhidwjtxdsmxd`, eu-west-1, free). Checked the existing Amara project first and left it alone.
- Built the schema in four migrations: extensions, core tables, row level security, retrieval functions. Seven tables, RLS on all of them.
- Security advisor flagged the two helper functions as REST endpoints. Moved them into a `private` schema. Advisors now return clean.
- Installed `@supabase/supabase-js` and added `src/shared/supabase.js` with the client and both retrieval helpers. `.env.example` committed, `.env.local` gitignored.
- Reworked the entry model. No sign in on the landing page. A company arrives with a single use access code, names itself, and gets its own workspace at /their-company plus /their-company/admin. Recorded in full in CURRENT.md.
- Rebuilt the landing hero around an animated interlocked ring logo. Locked the H1 and subtext.
- Built the logo twice. The first pass split navy from purple with dashed strokes, which left gaps and read as damage. Rebuilt it with a rotating SVG gradient, which keeps the tube unbroken and the colour seam soft. Verified the travel by comparing three frames three seconds apart.
- Built setup screens 1 and 2: access code, then admin account. Three step progress bar, code auto formats as you type (sxa7k4m2pq becomes SX-A7K4-M2PQ), password rule shown inline, show password toggle, back walks the steps in reverse.
- Nothing is created until the final step on purpose, so abandoning setup halfway does not burn someone's code.
- `TextInput` now forwards its ref so the access code field can take focus on arrival.
- All server calls for setup are isolated in `src/shared/setupApi.js`. `checkAccessCode` is the one function that becomes an edge function call.
- Blocked: the Supabase connector dropped out of the session, so the access_codes migration and the check-access-code edge function could not be applied. Code validation is shape only until that is wired.
- Built setup step 3: company name, what you do, industry. Three fields, all required, everything else deferred to the admin dashboard.
- Added a review card between the form and the (not yet built) create step. Shows a live slug preview under the company name, reads back every answer, and states plainly that the access code is spent past this point. Build button is disabled until the backend exists.
- Added `TextArea` to the shared UI primitives and validation helpers (companyNameProblem, companyAboutProblem, industryProblem, slugify) plus the industry list to setupApi.js.
- Clicked through the whole three step flow in a browser: autofocus, each validation message, the live slug preview, back from review preserving what was typed, light theme. No console errors.
- Supabase connector was on at account level but toggled off for the chat. Diagnosed with ListConnectors (connected: true, enabledInChat: false).
- Built the access code backend. `access_codes` table with RLS on and deliberately zero policies, which denies everyone except the service role.
- Five lifecycle functions: peek (looks, does not spend), claim (atomic, one winner, five minute stale claim recovery), release, finalise, and create_company_workspace (company plus admin staff row in one transaction, with slug collision handling).
- Had to move those from the `private` schema to `public`: PostgREST only publishes `public`, so an edge function could not reach them in `private`. Kept them safe by revoking execute from public/anon/authenticated and granting only to service_role. Published is not the same as callable.
- Deployed the `check-access-code` edge function, verify_jwt off since the caller has no account yet. Rejects bad shapes before any query runs so brute force traffic costs nothing.
- Generated six codes in the database. First attempt produced duplicates twice: a correlated subquery Postgres evaluated once, then LATERAL which it also cached. Fixed by referencing the outer row inside the subquery.
- Wired setupApi.js to the live endpoint via supabase.functions.invoke.
- Could not test the endpoint from the sandbox: egress proxy blocks supabase.co, same as pages.dev. Needs verifying in a browser.
- Note: bundle went from 78 KB to 137 KB gzipped now that supabase-js is genuinely imported. Worth code splitting later so the landing page does not carry the auth client.

---

## Session 4, 2026-08-27, the day before submission

Opus for the flow and the security work, and it needed to be.

The theme of the session: several things that looked finished were not,
and finding them mattered more than building new ones.

### The stage flow, rebuilt to the user's correction

- Interview capped at three to five questions rather than open ended. It
  ends its last message with `INTERVIEW_COMPLETE`, which the app strips
  and never shows, including while the marker is still arriving one
  character at a time.
- That marker hands straight over to Sonnet. Nobody presses anything.
- Sonnet does one of two things and only one. If something is missing it
  says so, ends with `NEED_INPUT`, and the app drops **back to the cheap
  model** for that conversation, because anything needing a person is a
  conversation and should not be charged at analysis rates. When it has
  everything it reads the brief back and ends with `READBACK_COMPLETE`.
- Only a read back puts the Build card up. It asks "Did I get that
  right?" and offers Build or "Something is missing", and the second one
  re-enters the same loop. The correction path needed no special case,
  which is how you know the loop was right.
- Drove the whole machine in a browser against a stand-in backend. Ten
  checks, all pass, including a marker split across two chunks.

### Things that were quietly lying

Each of these was found by looking, not by being reported.

- **The file upload was theatre.** It staged the file, showed a green
  "42% smaller" badge, and never sent a byte. Someone could hand over
  their brand guide, watch it confirm, and get a draft written from
  nothing. Now really read, with the chip saying Read, Part read or
  Cannot read.
- **The admin knowledge base was a mockup.** Five invented rows in local
  state, a Browse files button with no handler at all, and no write to
  `knowledge_sources` ever. Nothing an admin added had ever reached the
  assistant, and could not have.
- **Sign in was a `setTimeout`** against two email addresses hardcoded in
  the source. A workspace lasted exactly as long as its browser tab.
- **The chat greeted everyone as Anthony** and called itself by a fixed
  name that had nothing to do with whatever company the workspace was for.
- **The library shipped two invented files** marked as synced to a Drive
  nobody has connected.
- **Canva said Connected** and claimed its designs were real and yours to
  download. Nothing sends anything to Canva.
- **The admin Connect button** flipped to Connected while nothing
  happened behind it.
- **Retry, Share and More** under every reply did nothing.

All fixed or removed. Nothing in the app now says Connected.

### What became real

- Knowledge base writes to `knowledge_sources` and `knowledge_chunks`,
  and the assistant receives the **contents** from the analysis stage on,
  capped at 60k characters. The interview still gets names only.
- PDF and Word parsed in the browser with pdfjs-dist and mammoth, loaded
  on demand. Scanned PDFs refused with an explanation.
- Paste box above the file area, because most company material lives in
  formats that cannot be copied out cleanly and telling someone to
  convert their own document is a bad answer.
- `add-link` fetches a page once, server side, admin only.
- Images in the chat shrunk to 1568px and sent as image blocks. Measured:
  1179x2556 becomes 723x1568, 47KB, about 1500 tokens.
- Password sign in, routed to the right workspace by role.
- `work_history` persistence, so finished work survives a refresh.
- LICENSE, proprietary, plus a notice in the README.

### Security

- **SSRF in `add-link`.** It fetched whatever address an admin typed,
  including private ones. Now refuses private, loopback, link local and
  bare internal names, and follows redirects by hand so a public address
  cannot bounce to a private one after the check passed.
- **Verified RLS against the live database.** Every table on, every policy
  scoped by company, `with_check` on every write policy, `access_codes`
  with zero policies. `private.current_company_id()` reads `staff` by
  `auth.uid()` and is `SECURITY DEFINER` with a pinned `search_path`.
  The tenant isolation claim is true.
- **`verify_jwt` turned OFF on every function, deliberately.** The toggle
  verifies against the *legacy* secret and this project uses the new key
  system, so ON could have rejected every real user token. Each function
  checks the caller itself.

### Two bugs the build did not catch

- `NotionIconGlyph` imported nowhere but referenced. Compiled clean.
- `SKILL_LABELS` used in the usage panel and never imported. Compiled
  clean, would have thrown a blank tab.
- `doc.destroy` removed from pdf.js v6, so a PDF that had been read
  perfectly threw on the way out and vanished silently.

A green build is not evidence a page renders. Drive the app.

### Not done, and named as not done

Canva, Drive sign in, Resend, email OTP, staff invites, real file formats,
images in the knowledge base. All listed in `CURRENT.md` with what each
would take.

### Blocked all session

Could not reach `supabase.co`: the environment's network policy answers
403 on connect. So nothing has been tested against the real backend, and
the access code SX-4M8G-T4P3 is still unspent.

---

## 2026-08-27, late. The interview was writing the document

The chat was live and talking well, so the next thing found was the flow
underneath it.

Asked to "just build it", the assistant wrote the entire one pager there
and then, on the cheap model, in the interview stage. No marker, so the
app never moved up. No analysis, no read back, no Build card, no file to
download. It looked like a chatbot because for that turn it was one.

Two causes, both mine.

`max_tokens` was 8000 on every stage. The interview was told not to
produce the work and handed all the room it needed to ignore that. Now
each stage has its own ceiling: 700, 4000, 8000. A question is two hundred
tokens and a one pager is fifteen hundred, so the interview is now
incapable of the thing it was only being asked not to do. Same principle
as having no search.

The interview prompt said "ask them to name a file or paste what matters".
So when the user pointed it at the company knowledge base, it said it had
no access and asked for a file name. A staff member should never need to
know a file name in their own company's knowledge base. Pointing at the
sources is now a handoff, because only the higher model can read them.
Their own material, on their own laptop, is the only case where it asks
for an attachment.

Also this session:

- Five questions is now enforced by the app. It was a sentence in a prompt.
- Partial answers get asked again, once, instead of read as agreement.
- The analysis stage checks for the things a document cannot exist
  without: whose name is on it, who it is for, which company. The
  interview is short on purpose and misses them.
- Enter makes a new line on a touch screen. There is no Shift to hold on a
  phone, so Enter sending left no way to write a second line.
- The greeting typed itself twice. It was built with no name, then again
  with one, and the typewriter read that as new text. A new chat also lost
  the name. Both fixed.
- Copy says "Copied", and says so when it cannot.
- Em dashes kept appearing because the rule sat one line above "match the
  company's house style", which the model read as permission. Stated as an
  absolute now.
- Mic was never broken. It hides where the browser has no speech
  recognition, which is honest. Confirmed working in Chrome.

**The lesson, again.** Every one of these was a rule written in a prompt
where a limit belonged. A rule is a suggestion to a cheap model under
pressure from a user instruction. Give it a ceiling instead.
