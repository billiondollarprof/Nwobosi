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
