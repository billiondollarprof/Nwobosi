# SESSIONS.md

Log of each work session. Newest at the top. Keep entries short.

---

## Session 1: 2026-08-24

**Setup and docs**

- Repo was empty. Added `buildfest_project_plan.pdf` and the chat prototype.
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
