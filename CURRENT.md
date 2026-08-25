# CURRENT.md

This file holds the full state of work in progress. Update it at the end of every session so the next session can pick up without losing context.

**Note (2026-08-25): a lot has moved since the section below was last written** (access codes, Setup.jsx, real Supabase backend, Cloudflare Pages is live, custom domain `stellaxafe.com`, Resend). See `SESSIONS.md` sessions 2 and 3 for what actually happened. This file needs a full rewrite to match; until then, treat SESSIONS.md as the source of truth where the two disagree.

**Important (2026-08-25): `main` was way behind.** Everything from session 2 onward had only ever been pushed to the working branch `claude/nwobosi-access-5mces1`, never merged into `main`. The live site builds from `main`, so none of it was actually visible there, which is why UI checks against the live site kept showing old behaviour. Merged into `main` and pushed this session, both branches now match as of commit `274b38d`. Keep merging as work lands, do not let this gap reopen.

## Access code requests (2026-08-25)

`PRODUCT.supportEmail` in `config.js` is a placeholder (`anthony@stellaxafe.com`). The "no code" line on the setup screen's first step now mails that address directly, so someone without a code has a way to ask.

Not built yet, mentioned by the user as a "we are going to also build" item, not an ask for right now: a real request form that lands in `access_codes`-adjacent state and sends an actual notification email through Resend when someone asks, rather than relying on their device having a mail client configured. The mailto link is the honest placeholder until that exists.

## Brand assets (settled, 2026-08-25)

- `public/favicon.svg` — square, purpose built favicon. Same ratios as the hero mark, frozen gradient.
- `public/favicon-32.png`, `public/apple-touch-icon.png` — rendered from the SVG above.
- `public/logo-mark.png` — frozen (non-animated) full mark, 1024x666, transparent. For email headers and anywhere else the mark needs to sit still.
- `index.html` now links the favicon and apple touch icon, and carries basic Open Graph/Twitter tags using `logo-mark.png`.
- Still open: a real social share card with the wordmark and tagline in brand type (Sora/DM Sans). This sandbox cannot load Google Fonts in headless rendering, so it was not built here. Needs doing somewhere that can reach Google Fonts, or by hand.
- Now unblocked: the per-company branding upload system (logo, brand color) in the admin dashboard, deferred until the master logo was settled.

## Landing page rebuild (spec, confirmed 2026-08-25)

Confirmed with the user. Logo, navbar, and the hero cloud are done. Also done, from live UI feedback rather than the original spec: the "See it working" button is gone (one button on the hero now), the small nav mark matches the real logo instead of an old placeholder, the mark's colour travel is faster, the "Read aloud" button under chat replies is gone, the Setup page's access code step is actually centered on a phone now, and speech to text on the chat mic is real (see below). Rest of the spec below is not yet built.

**Speech to text, done.** `src/shared/useSpeechToText.js` wraps the browser's Web Speech API, no server or key. Wired to the mic button in `Chat.jsx`: tap to start, existing typed text stays and the transcript lands after it, distinct red pulsing style while actually listening, auto stops if the mic control would disappear (step reaching 3). Hides itself entirely on a browser without the API rather than showing a dead control. Verified the fallback path and that nothing crashes, could not exercise a live transcript from this sandbox (no microphone, no route to the speech service), worth a real tap on an actual phone.

**Hero cloud, done.** A soft drifting wash of colour above the mark, three blurred blobs on a shallow arc plus a wider faint layer, each on its own timing (17s/20s/22s/26s) so it reads as smoke rather than one shape breathing. `HeroCloud` in `Landing.jsx`, keyframes `sx-cloud-drift-a/b/c` in `index.css`.

**Logo animation, done.** Stop the float and bounce. The mark stays put. The gradient keeps slowly trading navy and purple around each ring, that part stays. Fix needed: the interlock mask can leave a faint seam where it meets the ring stroke at the crossing. There must be zero visible gap there, the two rings read as fused, not just avoiding each other. Add a second motion on top of the gradient travel: a slow stretch and release, the tube looks pulled, then eases back to its resting shape, on a loop. Not floating. Breathing.

**Navbar, done.** Turned out to already exist: `FloatingNav` in `ui.jsx`, shared with Chat and Admin, already theme aware through `--nav-surface`. Swapped Landing's plain header for it and added an opt-in `sticky` mode so it stays pinned while the page scrolls, on for Landing only.

**Hero.** Two lengths of subtext: short for mobile, longer for tablet and desktop, never the same copy at every width. The hero must end exactly at the fold on mobile, no sliver of the next section showing, it should never look cut off. A few technical terms in the hero copy, enough to sound like it knows what it is talking about, not a wall of jargon.

**Page order below the hero:** Hero → Problem (backed by real statistics) → concrete examples (how staff and legal firms actually feel this) → Solution (how StellaXafe fixes it) → Projection (what changes once a company adopts it). Threaded through all of it: anyone who can read and write should get a great output, privacy, time and cost saved, and a smaller model performing like a much smarter one because it is pointed at the company's own material instead of running blind.

**Connectors section.** Add Notion and Microsoft 365 (Outlook/Teams) to the existing Canva, Gmail, Drive, Slack. Real logos, not just names, laid out like an integrations strip, grid or marquee, plus a "+ more" note. Cards can animate on scroll, glow, sliding over each other, that does not need Opus.

Reference for the overall polish level: the Xalom landing page the user shared. Clean hero, one clear call to action, generous white space. Test every breakpoint separately, mobile, tablet, desktop, screenshot each before calling it done, per the UI rule in CLAUDE.md.

## Where things stand (2026-08-24)

The app is built and running as a single page application. Four pages, each its own file, each with labeled sections inside. They build into one app so switching is instant.

```
src/
  main.jsx              entry point
  App.jsx               routes, instant page switching
  index.css             fonts, base styles, animations
  shared/
    tokens.js           colors, gradients, themes, type, shape
    config.js           branding, skills, model tiers, workflow tools, limits
    icons.jsx           product mark and connector glyphs
    theme.jsx           theme provider and hook
    ui.jsx              shared primitives every page builds from
  pages/
    Landing.jsx         public entry point
    Auth.jsx            login, request access, OTP
    Chat.jsx            the staff surface
    Admin.jsx           the knowledge brain
```

Stack in place: Vite, React 18, Tailwind 3, react-router-dom 6, lucide-react. `public/_redirects` is there so client side routing works on Cloudflare Pages.

Other files:

- `buildfest_project_plan.pdf`: the full system plan, 8 pages. First written 2026-08-22, updated since. Read this before doing any real work.
- `README.md`: written from the plan. The reference document.
- `CLAUDE.md`: working rules.
- `SESSIONS.md`: history.

The old single file prototype `buildfestchat.jsx` is gone. Its content now lives in `src/`.

Done so far:

- PR #1 is open: https://github.com/billiondollarprof/Nwobosi/pull/1
- Cloudflare account is connected. One unrelated worker exists (`amara-guest-page`). Nothing created for this project yet.
- Supabase account exists, free plan. Nothing created for this project yet.

## What is built and tested

Driven in a real browser, screenshotted, and clicked through end to end:

- **Landing.** Hero, three problems, four step flow, security panel, call to action, footer. Both themes.
- **Auth.** Login, unrecognized email leading to no account found, request access, request sent, OTP with auto advance and paste support. Verified the full path in both directions.
- **Chat.** Greeting typewriter, three step interview, skill badge with flash, brief read back card, generating state, result card, Library with Drive sync states and search, workflow tools under the plus control with working connect toggles, sidebar, profile with usage meter, both themes, mobile layout.
- **Admin.** Four tabs. Knowledge base with upload area, add link form, and the indexed source list. Connectors. Access requests with working approve and decline. Invite form with model ceiling. Staff list with per person model ceiling and usage meters. Company defaults, the model tier ladder, and recent work history.

Production build passes clean: 257 KB JS, 75 KB gzipped.

One layout bug was found and fixed during testing: `PageShell` used `min-h-screen`, so a long chat pushed the composer off screen. Pages that should behave like an app now use `h-screen overflow-hidden` with an inner scroll area, and document style pages use `min-h-screen`.

## The entry model (this replaces the old sign in flow)

This is not a sign up product. There is no sign in on the landing page. A company arrives with an access code and builds their own workspace.

```
Landing
  "Build your company's AI"
        ↓
Access code                    single use, only the founder issues them
        ↓
Admin email and password       this becomes the admin account
        ↓
About your company             name, what you do, industry
        ↓
Brand and documents            optional
        ↓
Admin dashboard, ready
        ↓  "Deploy your company AI"
Live at /buildfest             staff app, branded as BuildFest AI
       /buildfest/admin        their dashboard
```

**Deploy is not a real deploy.** Nothing spins up. The company's workspace becomes live at its own path on the same site. Both doors need a login: the admin uses the account made during setup, staff use their invited email.

**The staff login page wears their brand**, not StellaXafe's. Their logo, their colours. That is the moment it stops feeling like a demo.

**Access codes are single use.** The moment one is redeemed it is dead and cannot be passed on. That is the only thing that expires.

**The workspace does not disappear.** Instead each demo company gets a usage budget, enforced server side. Recommendation: about $2, roughly five complete outputs. Store it as cents remaining and decrement by what the API actually reports.

Show it to users as **outputs remaining**, never tokens or dollars. When it runs out, that screen is the sales moment, not a dead end: this was a temporary build, talk to StellaXafe about running it inside your own systems.

The BuildFest workspace is exempt from the cap so judges can push it.

**Not building expiry or the budget for the competition.** Plain single use codes now.

### Setup fields

Three required: company name, what the company does, industry. Everything else optional (logo, colours, staff roles, documents).

One paragraph about the company is worth more than ten uploaded files. And documents must stay optional, because a client trying your proposal will not gather their brand guidelines first.

### Landing page copy (locked)

H1 line one: Your staff are using AI right now.
H1 line two, in the blue to purple gradient: You don't know what they've told it.

Sub: Every day your people paste company numbers, client names, and contracts into tools you do not control. StellaXafe gives them one you own. It reads only what you approve. Nothing leaves your walls.

Button: Build your company's AI. Trust strip: Nothing leaves your walls, No setup team, Live in 10 minutes.

## Decisions made (confirmed with user)

**Product name.** StellaXafe. BuildFest is the competition it was built for. The demo company inside the app is still branded BuildFest, driven by one value in `config.js`.

**Architecture.** Single page application. Source split into page modules for clean reading. Builds into one app so section switching is instant.

**Stack.** Supabase for auth, database, row level security, and the RAG index via pgvector. Cloudflare Pages for hosting. Resend for email.

Reason: Supabase is self hostable, which is what makes the post competition VPC deployment possible. pgvector puts the vector index in the same Postgres as the users under the same security policies, so there is one boundary instead of three. All Cloudflare would need Vectorize as a separate service and none of it self hosts.

Warning for the demo: free Supabase projects pause after about a week of inactivity. Wake it and test the day before presenting.

**Knowledge and hallucination.** One index, always locked. The admin decides what is in it. No crawling, no separate setup phase, no sector ingestion.

The rule is provenance, not a knowledge blackout:

- Company facts (numbers, names, specs, policies) must come from the admin knowledge base or staff input. If missing, the assistant says so.
- General craft (how a deck is structured, how a report reads) comes from the model. That is what makes output good.

Enforced at generation time. The written prompt carries each retrieved fact with its source and instructs the output model to use only those for anything company specific.

If a company needs sector material, the admin uploads or links those specific sources deliberately.

**Data isolation and the migration promise, confirmed 2026-08-25.** No leakage is a real design goal, not a demo talking point. What is not real: local parsing, PII redaction, a "zero-trust runtime" or governance layer. Those got caught as invented in an earlier draft pitch and were dropped.

What is real and belongs in the plan: once a company actually hires StellaXafe, moving them off shared Supabase onto their own private system, VPC or on-premise, should be close to seamless, under a week of work. A handful of security upgrades happen at that point specifically because the company is now paying for and running its own private infrastructure instead of sitting on a shared multi-tenant platform.

Right now this build is simulating that intent ahead of being hired to build it for real. The demo runs on shared Supabase with row level security, which is genuine isolation between companies, just not physical isolation. The demo should still feel close to VPC grade, tight, nothing crossing between companies, even though the underlying infrastructure is shared. Say what is true (row level isolation, single use codes, scoped retrieval). Do not claim physical separation that is not there yet.

**Model routing.**

| Step | Tier |
| --- | --- |
| Interview and conversation | Haiku 4.5 |
| Analysis and prompt writing | Sonnet 5 |
| Output and design | Sonnet 5 |

Demo is capped at Sonnet 5.

**Switch timing, confirmed 2026-08-25.** The tier switches up before the read-back gets written, not after the prompt. Analysis reads the retrieved sources on the higher tier first, so the read-back the user confirms reflects real understanding, not a cheap model's guess. If the switch waited until after the prompt was written, a misunderstanding from the cheap model would get locked into the prompt with nothing left to catch it.

**After the read-back.** If the user comes back with a correction or an addition, that is conversation, not a fresh ask, so the system drops back down to the lower tier for that turn. It still has full access to everything already retrieved for this task. The admin metadata and any staff files pulled in are part of the working context, not something tied to which model happens to be reading it. So the lower tier is not working blind, it is editing inside an already scoped brief, which is exactly what a cheap model is good at. It only escalates back up if the correction changes what needs to be retrieved or the understanding materially, not for a wording tweak or an added detail.

| Model | ID | Input per 1M | Output per 1M | Context |
| --- | --- | --- | --- | --- |
| Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | 200K |
| Sonnet 5 | `claude-sonnet-5` | $3 | $15 | 1M |
| Opus 5 | `claude-opus-5` | $5 | $25 | 1M |
| Fable 5 | `claude-fable-5` | $10 | $50 | 1M |

Note: Opus 5 is cheaper than Fable 5. Sonnet 4.6 costs the same as Sonnet 5 with less capability, so do not use it.

**Per staff model access.** Admin sets each person's ceiling at invite or approval time. Default is Sonnet 5. Admin can raise it to Opus 5 or Fable 5 by role, and sets a usage limit per day or week, with a company default they can raise or lower. The admin UI for all of this is built.

## The core flow (this is the heart of the product)

StellaXafe is a prompt generator first. The full path:

1. Staff says what they want to build, or picks a slash quick start.
2. Interview on Haiku. Asks only what it does not know. What output, who for, which sources, which workflow tool and which file.
3. Retrieval from the admin knowledge base. Every file there has a clean name and short description, so only what is needed gets pulled.
4. Analysis on a higher tier. Reads retrieved material plus any staff files.
5. Read back. Tells the staff in plain language what it understood and what it will produce. Staff confirms before anything is generated.
6. Prompt writing. One complete prompt: what is being made, every company fact with its source, brand colors and templates, structure, tone, length, any file or image to use.
7. Skill spins automatically. PowerPoint, Word, Excel, design, mind map, or analysis. Design skill asks for Canva if not connected.
8. Generation runs against the prompt. Canva for design, direct otherwise.
9. File written to the staff member's Google Drive. Download link in chat. Nothing stored in the chat system.

Why write the prompt down: the model does not drift, company facts carry their source so hallucination is blocked at generation time, and the prompt is an audit record.

### Voice rules (confirmed 2026-08-25)

Default: no em dashes, short simple or compound sentences, plain conversational language, no jargon. If the company's own uploaded material already uses long sentences, em dashes, or professional jargon, the system matches that instead of overriding it. Not a hard cap, a fallback for when the company has not already told us their own voice through what they gave us.

## Gaps between the UI and the real flow

The front end is all seeded data. These steps from the flow above are not visible in the chat yet:

- No read back as a distinct confirm step. The summary card covers it but does not read as a confirmation.
- No visible prompt writing stage in the generating card.
- No retrieval step showing which knowledge base sources were pulled.
- No real model routing, so no tier switching is shown.
- No staff-facing "picking up from last time" moment. `work_history` exists in the schema as a table, but nothing in `Chat.jsx` surfaces it yet. The pattern this coding project itself uses, `CURRENT.md` and `SESSIONS.md`, a saved state plus a running log, is the right model for it: a quiet, plain-language "last time you built X" on return, not a full audit trail dumped on the user. Not started.

Closing these five is what makes the demo tell the real story.

## Supabase (built)

Project `stellaxafe`, ref `cbunsqzkhidwjtxdsmxd`, eu-west-1, free tier. It sits in the StellaXafe Ecosystem org beside `billiondollarprof's Project`, which is the live Amara build and was left untouched.

Seven tables, row level security on every one, zero security advisor warnings.

| Table | Holds |
| --- | --- |
| `companies` | The tenant. Default model ceiling, daily limit, default storage. |
| `staff` | One row per invited person, keyed to `auth.users`. Null ceiling or limit means fall back to the company default. |
| `access_requests` | Raised from the login screen. Admin approves or declines. |
| `knowledge_sources` | The assistant's entire world. Name and description drive retrieval. |
| `knowledge_chunks` | Text plus a 1536 dimension embedding. `company_id` is carried here so the policy is one comparison. |
| `work_history` | The memory. One row per finished output, plus an embedding. |
| `connectors` | Company scope serves everyone, staff scope belongs to one person. |

**Helpers live in a `private` schema, not `public`.** They have to be security definer or a policy on `staff` that reads `staff` recurses. Sitting in `public` also published them as REST endpoints, which the advisor flagged. Moving them to `private` keeps policies working and takes them off the API.

**Retrieval functions** are `match_knowledge` and `match_work_history`, both security invoker, so row level security applies inside them. A caller physically cannot reach another company's rows.

**`staff_effective_limits`** is a view that resolves the fall back to company defaults, so nothing in the app has to remember that rule.

Decisions still open:

- **Embedding model.** The vector columns are 1536, which matches OpenAI `text-embedding-3-small`. Anthropic does not do embeddings, and pairs with Voyage AI, whose dimensions differ. Changing this later means a migration, so pick before ingesting anything real.
- **Connector tokens.** The columns exist but are plain text placeholders. Real tokens must go into Supabase Vault before any live OAuth flow.
- **Access request inserts.** There is deliberately no insert policy, so requests must be created server side through an edge function. That keeps the table closed to anonymous spam.

## App wiring

- `@supabase/supabase-js` installed.
- `src/shared/supabase.js` holds the client, `getCurrentStaff`, `matchKnowledge`, and `matchWorkHistory`.
- `.env.example` is committed. `.env.local` holds the real values and is gitignored.
- Nothing imports the client yet, so it tree shakes out of the bundle. That changes when auth is wired.

## Cloudflare

`wrangler.jsonc` is in the repo: assets only Worker, `not_found_handling` set to single page application so a direct load of `/chat` or `/admin` resolves.

Not deployed yet. Pages is being sunset, so the path is Workers Builds. The dashboard connect is a one time manual step, and the same two `VITE_` variables have to be set as build environment variables there, because Vite reads them at build time.

## Next steps

This list replaces the stale one that used to sit here (see the note at the top of the file). Current order:

1. Landing page rebuild: logo fix first, then navbar, hero, page structure, connectors section. Spec is above.
2. Build the `create-workspace` edge function so Setup's final step actually creates a company.
3. Real email and OTP auth, no password, for both the admin setup step and staff login.
4. Close the five flow gaps in the chat so the demo shows the real prompt engine end to end.
5. Per-company branding upload (logo, colour) in the admin dashboard, unblocked now that the master logo is settled.
6. Write the real-company onboarding spec: what setup looks like for a paying enterprise, the VPC/on-premise migration plan and timeline, which security upgrades apply once they are off shared Supabase. Not started.
7. Design the staff-facing session continuity view described above. Not started.
