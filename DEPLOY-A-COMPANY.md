# DEPLOYING STELLAXAFE FOR A NEW COMPANY

Anthony, 2026-09-23: "this is what we have to deploy for other companies,
because we need everything that we are doing here to be properly arranged,
properly scoped, properly documented, every line by line, properly
documented, and well ready for us to take it and redeploy for another
company into their own system."

This file is the checklist for that. Somebody who has never seen this
project should be able to follow it top to bottom and end with a working
assistant for a new company. Where a step cannot be done yet, it says so
plainly and says why.

Written 2026-09-23 from the code and the live project, not from memory.
Every secret name, function name and file below was read out of the repo
or the database on that date. **When any of those change, this file
changes with them.**

---

## 0. READ THIS FIRST: what is not ready yet

Three things to know before following this guide. The first is fixed. They are
listed first so nobody finds them halfway through a deployment.

1. **FIXED 2026-09-23: the first database migrations were not in the
   repo.** They were read out of the live database and saved into
   `supabase/migrations/` with their live version numbers. These are the
   ones that were missing:

   ```
   20260824164712 enable_extensions
   20260824164747 core_schema
   20260824164839 row_level_security
   20260824164950 retrieval_functions
   20260824165119 move_helpers_to_private_schema
   20260825022634 access_codes_and_company_setup
   20260825022940 workspace_creation_functions
   20260825023037 expose_setup_functions_to_service_role_only
   20260906130850 access_code_resolves_to_its_workspace
   20260906132235 staff_invites_with_72h_single_use_links
   20260915150343 source_kind_image
   20260916001137 canva_per_staff_and_support_seat
   20260916001607 staff_effective_limits_can_support
   ```

   Before a new deployment, still compare the repo against the live list
   (item 3 below): a few repo files carry a different version number from
   the one the live database recorded.

2. **The per person memory is designed, not built.** `DIRECTION.md`,
   "Memory, instead of keeping the file". Until it is built, each chat's
   own row is its memory. Deleting a chat hides it and keeps the row for
   exactly this reason (see `20260923060226_conversation_hidden_at.sql`).

3. **Some files in `supabase/migrations/` may not have run on the live
   project under the same name.** The live list uses different version
   numbers for some of them. Before a new deployment, compare the two
   lists and make sure the new project gets every change the live one has.

---

## 1. What one deployment is

One company gets:

- **Its own Supabase project.** This holds the database, the sign in, the
  file storage and the edge functions (small programs that run on
  Supabase's servers, not in the browser). The company's documents,
  conversations and staff live only here.
- **Its own Cloudflare Pages project.** This serves the app people open in
  their browser. It holds no data at all, only the built app.
- **Its own address**, for example `assistant.companyname.com`.

Nothing is shared between two companies except the code. That is how the
privacy works: each company's material sits in its own project, and inside
that project RLS (a database rule that decides which rows each person can
see) stops one staff member reading another's conversations.

---

## 2. Before you start, have these ready

1. A Supabase account that can create a new project.
2. A Cloudflare account with Pages.
3. An Anthropic API key for this company. One key per company, so its
   spending is its own and can be switched off on its own.
4. A Resend account with the company's sending domain verified. This is
   what sends the sign in codes and the invitations.
5. The company's name, and the address the app will live at.
6. Optional: a Canva developer app, if the company wants design work.
7. Optional: the WhatsApp bridge, if customer support should answer on
   WhatsApp (see `supabase/amara-functions/README.md`).

---

## 3. The Supabase project

### 3.1 Create it

1. In Supabase, create a new project. Pick the region closest to the
   company's staff.
2. Write down the project reference (the short id in the project URL).

### 3.2 Build the database

1. Run every file in `supabase/migrations/` in order, oldest first. The
   file name starts with its date, so the alphabetical order is the right
   order.
2. Where two files describe the same change under different version
   numbers (see section 0, item 3), run it once.
3. After running, check that every table in the list below exists and
   says RLS is on. All of them must:

   ```
   companies, staff, access_requests, knowledge_sources, knowledge_chunks,
   work_history, connectors, access_codes, conversations, staff_invites,
   support_threads, support_messages, escalations, support_routes,
   publish_overrides, knowledge_contradictions, integration_tokens,
   oauth_pending
   ```

### 3.3 Storage

1. Create a storage bucket called `brand-assets`. The function
   `read-image` reads from it. If you use a different name, set the
   `BRAND_ASSETS_BUCKET` secret to that name.

### 3.4 Sign in settings

This product does not use passwords. Signing in is a code sent to the
person's email. See `CLAUDE.md`, "No passwords".

1. In Authentication, turn on email sign in with a one time code.
2. Paste `supabase/email-templates/otp.html` in as the email template for
   the code.
3. Set the site URL to the company's app address.
4. Add the app address to the allowed redirect URLs.
5. Set up custom SMTP (sending email through your own provider rather
   than Supabase's) so the codes come from the company's own domain.
   Resend can do this with the same account as section 2, item 4.

### 3.5 Secrets for the edge functions

Set these in Project Settings, Edge Functions, Secrets. The first three
Supabase sets for you.

| Secret | What it is | Needed |
| --- | --- | --- |
| `SUPABASE_URL` | the project's own address | set by Supabase |
| `SUPABASE_ANON_KEY` | the public key | set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | the key that bypasses RLS. Only ever on the server | set by Supabase |
| `ANTHROPIC_API_KEY` | this company's model key | yes |
| `RESEND_API_KEY` | sends invitations and support replies | yes |
| `CONTACT_FROM` | who emails come from, for example `Company AI <noreply@mail.company.com>` | yes |
| `APP_URL` | the app's address. The invitation link is built from it | yes |
| `CONTACT_TO` | where the contact form lands | if the contact form is used |
| `SUPPORT_SHARED_SECRET` | lets the support channel call `support-ask` | if support is used |
| `SUPPORT_BRIDGE_SECRET` | shared with the WhatsApp bridge | if WhatsApp is used |
| `AMARA_FUNCTIONS_URL` | where the WhatsApp bridge lives | if WhatsApp is used |
| `GOOGLE_CLIENT_ID` | Google OAuth client id, for Drive | if Drive is used |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. Never pasted into a chat | if Drive is used |
| `CANVA_CLIENT_ID` | Canva app id | if Canva is used |
| `CANVA_CLIENT_SECRET` | Canva app secret. Never pasted into a chat | if Canva is used |
| `BRAND_ASSETS_BUCKET` | only if the bucket is not called `brand-assets` | rarely |

Two of these do not fail when they are missing, and that makes them the
dangerous ones. `APP_URL` and `CONTACT_FROM` quietly fall back to
StellaXafe's own values. So if you forget them, the company's staff get
invitation links to stellaxafe.com and emails from StellaXafe. Set both,
every time.

### 3.6 Deploy the edge functions

Every folder in `supabase/functions/` except `_shared` is one function.
Deploy each one with **JWT verification off**. Every function checks who
is calling by itself, and some are called by people who do not have an
account yet (setup, accepting an invitation).

```
accept-invite      add-link          assistant        canva-connect
canva-design       check-access-code create-workspace describe-source
drive-connect      drive-upload
group-images       invite-staff      oauth-callback   read-before-publish
read-image         resume-demo       revoke-staff     send-contact
support-ask        support-reply
```

Keep each function's slug and its display name identical. Deploying by a
different name creates a second function instead of updating the first.
See `CLAUDE.md`, "Slug and display name stay identical".

After deploying, list the functions and check each one is ACTIVE.

### 3.7 Which model this company runs on

`MODEL_ID` in `supabase/functions/assistant/index.ts` is the only place in
the whole codebase that names a model. It is set per deployment. Change it
there, and the `PRICE` table under it, if this company is on a different
model or a different price. Nothing else moves and no screen changes.

---

## 4. The Cloudflare Pages project

1. Create a Pages project connected to this repo.
2. Build command: `npm run build`. Output folder: `dist`.
3. Environment variables, both for production and preview:

   | Variable | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | the new project's URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the new project's publishable key |

   These two are safe in the browser. The service role key never goes
   here or anywhere under `src/`.
4. Add the company's address as the custom domain.
5. Set the production branch. Every other branch builds as a preview, and
   `scripts/preview-guard.mjs` marks previews so search engines stay away.

---

## 5. Creating the company inside the app

The company, its admin and the admin's account are made in one step by
the `create-workspace` function, using a single use access code.

1. Make an access code for this company (the `access_codes` table, shape
   `SX-XXXX-XXXX`). The code is the credential for setup, and it works
   once.
2. Give the code to the company's admin.
3. The admin opens the app, enters the code, and sets up the workspace.
   `create-workspace` claims the code, makes the account, makes the
   company and the admin, then kills the code. If any step fails, the code
   is given back and nothing half made is left behind.
4. The admin uploads the company's files, gives each one a name and a
   line saying what it holds, and invites their staff. That is the whole
   setup. See `CLAUDE.md`, "The product principle".
5. Give the company a budget (`companies.budget_cents_remaining`). With no
   budget the assistant tells staff the workspace has used up its outputs.

---

## 6. Check it works, before the company sees it

Do every one. A green build is not a working deployment.

1. On your own machine, run `npm run check`. It lints, type checks every
   function, runs the tests, walks the chat in a browser, and builds.
2. Sign in as the admin with an email code. Confirm the code arrives from
   the company's domain.
3. Invite a test staff member. Confirm the email names this company, not
   StellaXafe, and that the link works once.
4. As the staff member, ask for a one page document. Go through the offer,
   the interview and the read back. Press build. Download it as Word and
   as PDF and open both files.
5. Refresh the page. Confirm the chat comes back with its document.
6. In Supabase, read the function logs for the `assistant`. Every turn
   logs a `usage stage=...` line. Confirm `cacheRead` goes above zero from
   the second turn onward. If it stays at zero, something above the prompt
   is changing between turns and the company is paying ten times too much.
7. Sign in as a second staff member. Confirm they cannot see the first
   one's chats or documents.

---

## 7. What lives where, for the next person

| To change | Go to |
| --- | --- |
| What the assistant says and how it behaves | `supabase/functions/assistant/index.ts`, the stage prompts |
| The steps of a piece of work | `FLOW.md`, then `src/pages/Chat.jsx` |
| Reopening a chat, which step and which button | `src/shared/resumeCards.js` |
| The admin screen | `src/pages/Admin.jsx` |
| What is live versus what is in the repo | `PENDING-DEPLOYS.md` |
| The rules for working on this project | `CLAUDE.md` |
| What is open right now | `CURRENT.md` |
