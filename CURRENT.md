# CURRENT.md

This file holds the full state of work in progress. Update it at the end of every session so the next session can pick up without losing context.

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

**Model routing.**

| Step | Tier |
| --- | --- |
| Interview and conversation | Haiku 4.5 |
| Analysis and prompt writing | Sonnet 5 |
| Output and design | Sonnet 5 |

Demo is capped at Sonnet 5.

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

## Gaps between the UI and the real flow

The front end is all seeded data. These steps from the flow above are not visible in the chat yet:

- No read back as a distinct confirm step. The summary card covers it but does not read as a confirmation.
- No visible prompt writing stage in the generating card.
- No retrieval step showing which knowledge base sources were pulled.
- No real model routing, so no tier switching is shown.

Closing these four is what makes the demo tell the real story.

## Open items

- Repo is public. Consider making it private, given the product is about data leakage.
- Default branch is `claude/nwobosi-access-5mces1`, not `main`. Switch after PR #1 merges.
- Repo description needs updating by hand. No write token available in the session. Text is in SESSIONS.md.

## Next steps

1. Close the four flow gaps in the chat so the demo shows the prompt engine.
2. Set up Supabase: schema, row level security, pgvector index.
3. Deploy to Cloudflare Pages.
4. Wire real auth, then the backend flow, then the connectors.
