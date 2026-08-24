# CURRENT.md

This file holds the full state of work in progress. Update it at the end of every session so the next session can pick up without losing context.

## Where things stand (2026-08-24)

Files in the repo:

- `buildfest_project_plan.pdf`: the full system plan, 8 pages. First written 2026-08-22, updated since. Read this before doing any real work.
- `buildfestchat.jsx`: single file React prototype of the chat interface. The working UI reference.
- `README.md`: rewritten as StellaXafe from the plan plus everything agreed in session 1.
- `CLAUDE.md`: working rules.
- `CURRENT.md` and `SESSIONS.md`: state and history.

Done so far:

- PR #1 is open: https://github.com/billiondollarprof/Nwobosi/pull/1
- Cloudflare account is connected. One unrelated worker exists (`amara-guest-page`). Nothing created for this project yet.
- Supabase account exists, free plan. Nothing created for this project yet.

## Decisions made (confirmed with user)

**Product name.** StellaXafe. The README, repo description, and the app all use it. BuildFest is the competition it was built for.

**Architecture.** Single page application. Source split into page modules for clean reading. Builds into one app so section switching is instant.

Pages: landing, auth (login, request access, OTP), chat, admin. Plus a shared design tokens module.

**Stack.** Supabase for auth, database, row level security, and the RAG index via pgvector. Cloudflare Pages for hosting. Resend for email.

Reason: Supabase is self hostable, which is what makes the post competition VPC deployment possible. pgvector puts the vector index in the same Postgres as the users under the same security policies, so there is one boundary instead of three. All Cloudflare would need Vectorize as a separate service and none of it self hosts.

Warning for the demo: free Supabase projects pause after about a week of inactivity. Wake it and test the day before presenting.

**Knowledge and hallucination.** One index, always locked. The admin decides what is in it. No crawling, no separate setup phase, no sector ingestion.

The rule is provenance, not a knowledge blackout:

- Company facts (numbers, names, specs, policies) must come from the admin knowledge base or staff input. If missing, the assistant says so.
- General craft (how a deck is structured, how a report reads) comes from the model. That is what makes output good.

Enforced at generation time. The written prompt carries each retrieved fact with its source and instructs the output model to use only those for anything company specific.

If a company needs sector material, the admin uploads or links those specific sources deliberately.

**Model routing.**

| Step | Tier |
| --- | --- |
| Interview and conversation | Haiku 4.5 |
| Analysis and prompt writing | Sonnet 5 |
| Output and design | Sonnet 5 |

Demo is capped at Sonnet 5.

Model IDs and pricing per 1M tokens:

| Model | ID | Input | Output | Context |
| --- | --- | --- | --- | --- |
| Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | 200K |
| Sonnet 5 | `claude-sonnet-5` | $3 | $15 | 1M |
| Opus 5 | `claude-opus-5` | $5 | $25 | 1M |
| Fable 5 | `claude-fable-5` | $10 | $50 | 1M |

Note: Opus 5 is cheaper than Fable 5. Sonnet 4.6 costs the same as Sonnet 5 with less capability, so do not use it.

**Per staff model access.** Admin sets each person's model ceiling at invite or approval time. Default ceiling is Sonnet 5. Admin can raise it to Opus 5 or Fable 5 by role. Admin also sets a usage limit per day or week, with a company wide default they can raise or lower.

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

## What the prototype already covers

Checked against `buildfestchat.jsx`:

- 3 step interview (what to build, audience, sources), then a summary card with Generate
- Auto skill detection with a badge and flash animation. `guessProjectType` maps to ppt, excel, word
- Generating state, result card, download button
- Library in the sidebar with Drive sync states and search above a threshold
- Workflow tools (Canva, Gmail, Drive, Slack) under the plus control, with upload file
- Slash quick starts, typewriter greeting, dark and light and system themes
- Floating glassy nav, animated ambient glow, rotating mic ring
- Daily limit of 5 and 1 MB upload cap

Gaps versus the flow above: no visible prompt writing stage, no read back as a separate confirm step before generation, no retrieval from an admin knowledge base, no real model routing.

## Open items

- Repo is public. Consider making it private, given the product is about data leakage.
- Default branch is `claude/nwobosi-access-5mces1`, not `main`. Switch after PR #1 merges.
- Repo description needs updating by hand. No write token available in the session. Text is in SESSIONS.md.

## Next steps

1. Split the prototype into page modules with clean sections.
2. Design the admin dashboard.
3. Set up Supabase (schema, RLS, pgvector) and Cloudflare Pages.
4. Build auth, then the backend flow, then the connectors.
