# BuildFest

A private, multi agent system for company staff. A staff member describes what they need in plain language and gets back a finished, on brand file in minutes instead of hours.

## The problem it solves

Three problems, in order of priority.

**1. Data leakage.** Staff paste company data into public AI tools every day. BuildFest runs as an isolated tenant, scoped to one company. It can be demoed on a shared cloud account, but it is built to be redeployed inside a company's own environment. Company data stays in company hands.

**2. Wasted time and tokens.** Staff write a prompt, get a poor result, rewrite it, and repeat. BuildFest runs a guided interview instead. It asks only what it does not already know, then writes the technical prompt for the staff member in a single pass.

**3. Output quality and consistency.** Every output is checked against the company's own brand kit, templates, and terminology before it is generated. If something is missing from that library, the system says so instead of guessing.

## What that saves

- **Time.** Work that took hours of drafting and formatting lands in minutes. Staff describe the goal, not the format.
- **Cost.** The system picks the cheapest model tier that can do the job. Simple chat never spends heavy model cost. Files are captioned and cached once, so the same file is never reprocessed. Design work runs through Canva at no developer cost.
- **Consistency.** Every staff member produces work that looks like it came from the same company, because it did. No more slide decks in five different fonts.
- **Control.** Admins see who did what, when, and what it cost. Nobody gets in without an invite.

## How it works

Three parts do the work.

- **Interviewer agent.** Runs on the fastest, lowest cost model tier. Holds the conversation, asks only what it does not already know, and turns a rough request into a clean brief.
- **Output agent.** Takes the finished brief, works out what kind of output is needed, picks the model tier that fits, and either builds the file directly or calls a connector.
- **RAG knowledge base.** Holds the company's brand guidelines, templates, letterheads, terminology, and past work. Everything the system says or produces is checked against it.

### Model routing

The system reads the task and switches to the tier that fits, so the company only pays for heavy reasoning when the task needs it.

| Tier | Used for |
| --- | --- |
| Haiku class | Conversation, the guided interview, structuring a brief |
| Sonnet class | Analysis, summarizing, reasoning over data and documents |
| Sonnet 5 class | Heavy design generation, decks and brand assets through Canva |

### Connectors

Connectors are called workflow tools in the interface. Each one is authorized per staff member through OAuth. Nobody on the development side ever holds a staff member's password.

| Tool | Status | Purpose |
| --- | --- | --- |
| Google Drive | Essential | Large file handling, and where generated files are written back |
| Gmail | Essential | Reading relevant email threads on request |
| Canva | Essential, connected just in time | Decks, posters, and brand assets |
| Slack | Phase 2 | Real time team channels |
| Notion | Optional, phase 2 | Startup and product team docs |

Canva is not connected during onboarding. It is offered at the exact moment a design task needs it, then the system resumes the request automatically. Staff who only ever need documents or spreadsheets are never asked for it.

## Architecture

The app is built as a single page application. The source is split into separate page modules so the code reads clean and stays easy to work on as it grows. Those modules build into one app, so switching between sections is instant with no page reload. It reads like clean, sectioned code and runs like a native app.

### Pages

| Page | What it holds |
| --- | --- |
| Landing | Public entry point |
| Auth | Login, request access, OTP verification |
| Chat | The main staff surface. Conversation, workflow tools, Library, profile, theme |
| Admin | Invites, access requests, usage credits, brand kit uploads, connector visibility |

Shared design tokens (colors, type scale, spacing) live in their own module so every page feels like one product.

## Access

There is no public sign up.

- An admin invites a staff member by email, name, and role. The name and role are what let the chat greet someone properly from their first session.
- Someone with no account who tries to log in is not refused silently. They are told no account was found and offered the option to request access.
- That request lands in the admin dashboard. The admin approves it, which turns it into a normal invited account, or declines it. Requesting alone gets nobody in.

## Usage credits

Usage runs on credits, not a flat output count.

- A company wide default allowance applies to every new staff member automatically.
- An admin can set a custom limit for any individual, higher or lower, at invite time or later.
- Anyone without a custom limit falls back to the company default. No manual step needed.

## Tech stack

| Layer | Choice |
| --- | --- |
| Auth and database | Supabase |
| Transactional email | Resend |
| Conversation model | Claude Haiku class |
| Analysis model | Claude Sonnet class |
| Design model | Claude Sonnet 5 class |
| Design connector | Canva API, per staff OAuth |
| File storage | Google Drive API, per staff OAuth |
| Knowledge base | RAG vector index |
| Voice input (later) | Google Speech to Text |

## Repository files

| File | What it is |
| --- | --- |
| `buildfest_project_plan.pdf` | The full system plan. First written 2026-08-22, updated since |
| `buildfestchat.jsx` | Working prototype of the chat interface |
| `CLAUDE.md` | Working rules for this project |
| `CURRENT.md` | Full state of work in progress |
| `SESSIONS.md` | Log of past work sessions |

## Status

Early build. The chat interface prototype exists and is being refined. Next up is splitting the app into its page modules, setting up hosting, designing the admin dashboard, then building auth, the backend, and the connectors.
