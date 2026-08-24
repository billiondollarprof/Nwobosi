# SESSIONS.md

Log of each work session. Newest at the top. Keep entries short.

---

## Session 1: 2026-08-24

- Repo was empty. Added `buildfest_project_plan.pdf` and `buildfestchat.jsx`.
- Set up `CLAUDE.md`, `CURRENT.md`, and this file. Opened PR #1.
- Read the full 8 page project plan and the whole chat prototype.
- Named the product StellaXafe. Rewrote `README.md` around it.
- Agreed the architecture: single page app, source split into page modules, instant section switching.
- Agreed the stack: Supabase for auth, database, and pgvector RAG. Cloudflare Pages for hosting. Resend for email. Chosen because Supabase self hosts into a VPC later and keeps the vector index inside the same security boundary as the users.
- Agreed the knowledge rule: one index, always locked, admin decides its contents. No sector crawling. Hallucination is blocked by provenance at generation time, not by restricting the model's general knowledge.
- Confirmed model tiers and corrected pricing. Opus 5 is cheaper than Fable 5. Demo caps at Sonnet 5.
- Next: split the prototype into page modules, then the admin dashboard, then Supabase and Cloudflare, then auth and connectors.

### Repo description to paste by hand

No write token was available in the session, so the GitHub description field could not be set from here. Paste this into the repo settings:

> StellaXafe: a private AI gateway for enterprises. Runs a guided interview, reads only your company's approved knowledge, writes the prompt, then generates the file. Stops data leakage, cuts prompt iteration, and keeps every output on brand.
