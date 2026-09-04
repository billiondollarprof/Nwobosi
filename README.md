# StellaXafe

A private AI gateway for enterprises. Staff describe what they need in plain language. StellaXafe runs a short interview, reads only the company's approved knowledge, writes a full prompt, and returns a finished, on brand file.

> **Proprietary.** Copyright (c) 2026 Okechukwu Nwobosi. All rights reserved.
> This repository is shared for review only. See [LICENSE](LICENSE). Reading it
> grants no right to copy, reuse, or redistribute any part of it.

**Two documents worth reading first:** [HOW-IT-WORKS.md](HOW-IT-WORKS.md)
explains the product and its honest limits. [ROADMAP.md](ROADMAP.md) is the
spec for everything not yet built.

## The problem it solves

Three problems, in order of priority.

**1. Data leakage.** Staff paste company data into public AI tools every day. StellaXafe runs as an isolated tenant scoped to one company, with row level security on every record. It is built to be redeployed inside a company's own environment, such as a private VPC. Company data stays in company hands.

**2. Wasted time and tokens.** Staff write a prompt, get a poor result, rewrite it, and repeat. Every round burns time and tokens. StellaXafe interviews the staff member first, confirms what it understood, then writes one complete prompt. The iteration happens before generation, in cheap conversation, not after it in expensive output.

**3. Output quality and consistency.** Every output is built from the company's own brand kit, templates, and terminology. Two staff members asking for the same thing get work that looks like it came from the same company, because it did.

## What that saves

- **Time.** Work that took hours of drafting and reformatting lands in minutes. Staff describe the goal, not the format.
- **Tokens.** The interview removes the retry loop. Retrieval pulls only the files a task actually needs. File descriptions are cached, so nothing is reprocessed. Cheap models handle conversation and expensive models only touch the work that needs them.
- **Consistency.** Every output traces back to the same approved material.
- **Control.** Admins decide who gets in, which models they can reach, how much they can spend, and what the AI is allowed to read.

## How it works

This is the full path from a staff member's first message to a finished file.

**1. The request.** A staff member opens the chat and says what they want to build. They can also type `/` for a quick start such as a pitch deck or a quarterly report.

**2. The interview.** The assistant asks only what it does not already know. What the output is, who it is for, and which sources to read. If the staff member wants it to work from a file, they point it at the workflow tool holding that file, such as Drive, Gmail, or Slack. This step runs on the cheapest model tier, because it is conversation.

**3. Retrieval.** The system looks into the company knowledge base held in the admin dashboard. Every file there carries a clean name and a short description, so the system pulls only what this specific task needs instead of sweeping the whole index. This is what keeps both hallucination and token spend down.

**4. Analysis.** The assistant switches to a higher model tier. It reads the retrieved company material and any files the staff member supplied, and works out what the output actually requires.

**5. Read back.** Before building anything, the assistant tells the staff member in plain language what it understood and what it is about to produce. The staff member confirms or corrects. Nothing is generated until they agree.

**6. The prompt.** The assistant writes one complete, detailed prompt. See the section below, this is the core of the system.

**7. The skill.** The right skill spins up automatically based on the task. PowerPoint, Word, Excel, design, mind map, or analysis. The staff member never picks one from a menu.

**8. Generation.** The prompt runs. Design work goes through Canva. Everything else is generated directly.

**9. Delivery.** The finished file is written to the staff member's connected Google Drive and a download link appears in the chat. The file is not stored in the chat system. Drive stays the single source of truth.

## The prompt engine

StellaXafe is a prompt generator before it is anything else. This is what separates it from a chat window with a company logo on it.

Once the interview is done and the staff member has confirmed the read back, the system writes a complete prompt. That prompt carries:

- Exactly what is being produced, for whom, and why
- Every company fact the output needs, pulled from the knowledge base, with the source each one came from
- Brand colors, fonts, logos, templates, and terminology
- Structure, tone, and length
- Any file or image the output must use

Then generation runs against that prompt.

Writing the prompt down first does three things:

- **The model does not drift.** It follows the prompt line by line instead of losing details across a long conversation.
- **Company facts carry their source.** The output model is instructed to use only the supplied facts for anything company specific. That is how hallucination is stopped, at generation time, on every output.
- **It is auditable.** The prompt is a record of exactly what was asked for and what it was built from.

## What the AI is allowed to know

The rule is provenance, not a knowledge blackout.

**Company facts must come from an approved source.** Numbers, client names, product details, policies, prices. These come from the admin knowledge base or from what the staff member supplies through a workflow tool. If a fact is not there, the assistant says so rather than inventing one.

**General craft comes from the model.** How a deck is structured, what sections a report needs, how a proposal reads. The model already knows this and uses it. That is what makes the output good.

There is one knowledge index and the admin decides what goes in it. If a company needs sector reference material such as regulations or standards, the admin uploads or links those specific sources deliberately. There is no crawling and no separate class of knowledge.

## Skills

Skills spin up automatically from the task. The active skill appears as a small label next to the assistant's name once it has been detected.

| Skill | Handles |
| --- | --- |
| PowerPoint | Slide decks and presentations |
| Word | Documents, letters, proposals, memos |
| Excel | Spreadsheets, finance reports, data tables |
| Design | Posters, flyers, social graphics, brand assets |
| Mind map | Structure and planning outputs |
| Analysis | Reviewing and reasoning over data and documents |

The design skill asks for a Canva connection at the moment it is needed. It routes design work through Canva because that produces better output and costs fewer credits than generating a design from scratch.

## Model routing

The system reads the task and moves to the tier that fits it, so the company only pays for heavy reasoning when the work needs it.

| Step | Tier | Why |
| --- | --- | --- |
| Interview and conversation | Haiku class | Fast and cheap. Most turns in a session are this. |
| Analysis and prompt writing | Sonnet class | Reading files, reasoning over company material, writing the full prompt. |
| Output and design | Sonnet 5 class | Generating the file and directing Canva, where quality matters most. |

Current pricing per million tokens, for reference when setting limits.

| Model | ID | Input | Output | Context |
| --- | --- | --- | --- | --- |
| Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | 200K |
| Sonnet 5 | `claude-sonnet-5` | $3 | $15 | 1M |
| Opus 5 | `claude-opus-5` | $5 | $25 | 1M |
| Fable 5 | `claude-fable-5` | $10 | $50 | 1M |

The demo is capped at Sonnet 5.

### Per staff model access

Model access is a permission, set by the admin.

- Every staff member gets access up to Sonnet 5 by default.
- When inviting someone, or approving their access request, the admin can raise that ceiling to Opus 5 or Fable 5 based on their role.
- The admin also sets a usage limit for that person, per day or per week.
- A company wide default applies to anyone without a custom setting. The admin can raise or lower that default.

## The admin dashboard

The admin dashboard is the brain of the system. Everything the AI knows about the company lives here.

**Knowledge base.** Upload brand guidelines, templates, letterheads, past work, and reference documents. Add links to sources the assistant may read. Every file carries a name and a short description, which is what makes retrieval precise.

**Connectors.** The admin connects company wide sources. These are the same workflow tools staff use in the chat, serving the same two purposes: knowledge and storage.

**Access control.** Invite staff by email, name, and role. Review and approve or decline access requests raised from the login screen. Revoke access at any time.

**Permissions and usage.** Set each staff member's model ceiling and usage limit. Set the company wide defaults. See a history of what each person worked on, when, and what it cost.

## Workflow tools

Connectors are called workflow tools in the interface. They live under the plus control in the message box, next to file upload. Each one is authorized per staff member through OAuth. Nobody on the development side ever holds a staff member's password.

| Tool | Status | Purpose |
| --- | --- | --- |
| Google Drive | Essential | Large file handling, and where every generated file is written back |
| Gmail | Essential | Reading relevant email threads on request |
| Canva | Essential, connected just in time | Decks, posters, and brand assets |
| Slack | Phase 2 | Real time team channels |
| Notion | Optional, phase 2 | Startup and product team docs |

Canva is not requested during onboarding. It is offered at the exact moment a design task needs it, and the system resumes the request automatically once connected. A free Canva account works. Staff who only ever need documents or spreadsheets are never asked for it. Each staff member connects their own Canva account, even at companies with a Canva Enterprise plan.

## File handling

- Direct uploads in the chat are capped at 1 MB. This keeps the chat fast and keeps large raw files out of the model context.
- Anything larger goes to the staff member's Google Drive first, then they point the assistant at it.
- Every file is described and cached once. Later references reuse that description instead of reprocessing the file.
- Generated files are written to Drive, not stored in the chat.

## Access

There is no public sign up.

- An admin invites a staff member by email, name, and role. The name and role are what let the assistant greet someone properly from their first session.
- Someone with no account who tries to log in is not refused silently. They are told no account was found and offered the option to request access.
- That request lands in the admin dashboard. The admin approves it, which turns it into a normal invited account, or declines it. Requesting alone gets nobody in.

## Architecture

The app is a single page application. The source is split into separate page modules so the code reads clean and stays workable as it grows. Those modules build into one app, so switching between sections is instant with no page reload. It reads like sectioned code and runs like a native app.

| Page | Sections inside it |
| --- | --- |
| Landing | Public entry point |
| Auth | Login, request access, OTP verification |
| Chat | Greeting, conversation, message box, workflow tools, Library, sidebar, profile, theme |
| Admin | Knowledge base, connectors, invites, access requests, permissions, usage |

Shared design tokens, meaning colors, type scale, and spacing, live in their own module so both surfaces feel like one product.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Auth and database | Supabase | Postgres with row level security. Self hostable, so it can be deployed inside a company VPC later. |
| Knowledge index | Supabase pgvector | The vector index sits in the same database as the users, under the same security policies. One boundary. |
| Hosting | Cloudflare Pages | Serves the built app. The frontend is static, so it stays portable. |
| Transactional email | Resend | Invite emails and access request notifications |
| Models | Anthropic Claude | Haiku, Sonnet, Opus, and Fable tiers, routed by task |
| Design connector | Canva API, per staff OAuth | Decks, posters, and brand assets |
| File storage | Google Drive API, per staff OAuth | Large files and every generated output |

## Repository layout

```
src/
  main.jsx              entry point
  App.jsx               routes, instant page switching
  index.css             fonts, base styles, animations
  shared/
    tokens.js           colors, gradients, themes, type, shape
    config.js           branding, skills, model tiers, workflow tools, limits
    icons.jsx           product mark, sister product marks, connector glyphs
    theme.jsx           theme provider and hook
    ui.jsx              shared primitives every page builds from
    supabase.js         one client for the whole app
    session.js          who is signed in
    marketing.jsx       page shell and text pieces for the public pages
    MarketingNav.jsx    the public nav, shared by all six public pages
    MarketingFooter.jsx the public footer
    ModalCard.jsx       the card the modal styled pages sit in
    assistantApi.js     the chat call
    setupApi.js         access codes and workspace creation
    inviteApi.js        staff invites
    linkApi.js          adding a link to the knowledge base
    readFile.js         PDF and Word parsing in the browser
    useSpeechToText.js  the mic button
    LogoAnimated.jsx    the hero mark
  pages/
    the product
      Setup.jsx         access code to a live workspace
      Auth.jsx          login, request access, OTP
      Chat.jsx          the staff surface
      Admin.jsx         the knowledge brain
    the public site
      Landing.jsx       public entry point
      Services.jsx      /services, modal styled
      Founder.jsx       /founder, modal styled
      Contact.jsx       /contact, modal styled, really sends
      Insights.jsx      /insights
      FormBuilder.jsx   /form-builder

supabase/functions/     edge function sources, deployed by hand
```

| File | What it is |
| --- | --- |
| `stellaxafe_project_plan.pdf` | The full system plan. First written 2026-08-22, updated since |
| `CLAUDE.md` | Working rules for this project |
| `CURRENT.md` | Full state of work in progress |
| `SESSIONS.md` | Log of past work sessions |

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

There is no public sign up. A company starts at `/setup` with an access code, which creates their workspace and their admin account. Staff reach the app by invitation from that admin, or by raising an access request the admin approves.

## Status

**`CURRENT.md` is the blunt version, and it is the one to trust.** It is kept deliberately honest about what is real and what only looks real. This section is the summary.

**Real, running against Supabase:**

- Setup. An access code creates the auth user, the company and the admin, and lands them in their own workspace. Every step rolls back.
- Sign in. Real password sign in, and where you land is read from the database.
- The assistant. Streaming, real Claude, three stages, all enforced server side: who you are by row level security, which model by the ceiling your admin set, and how much by a budget checked before and charged after.
- The knowledge base. Files and pasted text are read, chunked and stored, and their contents reach the model. PDF and Word are parsed in the browser. Links are fetched server side, admin only.
- Saved conversations and finished work both survive a refresh.
- Row level security is on for every table, with `access_codes` reachable only by the service role.
- The public site. Six pages, ported from the old separate repo.

**Not real, and must not be claimed:**

- Canva and Google Drive are registered, with keys in place, and neither makes nor connects anything yet. Gmail, Slack and Notion are examples only.
- Every generated file is Markdown. The skill badges name PowerPoint, Word and Excel, and nothing produces one yet.
- There is no staff invite flow, and the OTP screen is unreachable. Sign in is password only.
- Images cannot go into the knowledge base.
- The contact form is deployed but `RESEND_API_KEY` is not set, so it fails closed and no mail leaves.
