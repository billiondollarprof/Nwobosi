# CURRENT.md

This file holds the full state of work in progress. Update it at the end of every session so the next session can pick up without losing context.

## Where things stand (2026-08-24)

- Repo was empty. Added the first two project files:
  - `buildfest_project_plan.pdf`: the project plan. First written 2026-08-22, updated since then.
  - `buildfestchat.jsx`: a single-file React prototype of the chat interface. This is the working UI reference for how the chat should look and behave.
- Added `CLAUDE.md` with working rules: plain English, no em dashes, session file rules, feature-confirm-then-plan-then-build workflow, UI screenshot and click-through testing, and the one-page-per-section project structure.
- Opening a PR for branch `claude/nwobosi-access-5mces1`.
- Cloudflare setup: not started yet.

## Agreed plan going forward

1. Split `buildfestchat.jsx` into separate pages, each its own file, each with clear labeled sections inside:
   - Chat interface page
   - Admin interface page
   - Landing page
   - Auth page (login, signup, OTP verification as sections)
2. Connect the project to Cloudflare.
3. Design the admin interface.
4. Build the backend: auth, connectors (Gmail, Drive, Slack, Canva as seen in the chat prototype), and the rest.

## Not started yet

- File split of the chat prototype into separate pages.
- Cloudflare project setup.
- Admin UI design.
- Backend, auth, and connector work.
