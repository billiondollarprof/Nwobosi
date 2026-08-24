# CURRENT.md

This file holds the full state of work in progress. Update it at the end of every session so the next session can pick up without losing context.

## Where things stand (2026-08-24)

Files in the repo:

- `buildfest_project_plan.pdf`: the full system plan. First written 2026-08-22, updated since then. Read this before doing any real work.
- `buildfestchat.jsx`: a single-file React prototype of the chat interface. This is the working UI reference for how the chat should look and behave.
- `README.md`: written from the plan. Explains the product, the three problems it solves, the architecture, and the stack.
- `CLAUDE.md`: working rules.
- `CURRENT.md` and `SESSIONS.md`: state and history.

Done so far:

- PR #1 is open: https://github.com/billiondollarprof/Nwobosi/pull/1
- Cloudflare account is connected and reachable. One unrelated worker exists (`amara-guest-page`). Nothing created for this project yet.

## Architecture decision (confirmed with user)

The app is a single page application.

- The source is split into separate page modules so the code reads clean and stays workable as it grows.
- Those modules build into one app, so switching sections is instant with no page reload.
- The goal is code that reads sectioned and clean, running as something that feels like a native app.

Pages: landing, auth (login, request access, OTP), chat, admin. Shared design tokens live in their own module.

## Open question to resolve

The plan (section 9) names Supabase for auth and database, and Resend for email. The user wants Cloudflare. These can work together: Cloudflare hosts and serves the app, Supabase handles auth and data. Or the whole thing can move to Cloudflare (D1, R2, KV). This needs a decision before backend work starts.

## Agreed plan going forward

1. Split the chat prototype into page modules, each with clear sections inside.
2. Set up hosting on Cloudflare.
3. Design the admin interface.
4. Build the backend: auth, connectors (Drive, Gmail, Canva), usage credits, RAG index.

## Not started yet

- Page module split.
- Cloudflare project setup.
- Admin UI design.
- Backend, auth, and connector work.
