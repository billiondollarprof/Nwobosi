# Dreef: the build plan for our first client

What this is: the step by step plan for building StellaXafe for Dreef, the
first paying client, once the contract is signed. Written 2026-10-31, before
the contract, so the work starts from here and not from a blank page.

Why it exists: the demo runs on Supabase and our own accounts, on purpose,
because it is only there to close the client. Dreef gets a different build:
their own private AWS account, a private network, and the model reached over
a private link. This file is how we get from one to the other.

What it must never do: become a promise to the client. The client facing
text is `CLIENT-BRIEF.md`. Dates and fees here are our internal plan.

Related: `CLIENT-BRIEF.md` (what Dreef reads), `BRIEF-NOTES.md` (research,
costs and sources behind it),
`ARCHITECTURE.md` (the isolation model, WhatsApp as the customer front desk).

---

## 1. Decisions already made

- **Hosting.** Cloudflare Pages serves the screens, free. Everything that
  touches Dreef's data or the model runs inside Dreef's AWS account.
- **Database.** Postgres on RDS (AWS's managed database), in their account.
  Our RLS rules (database rules that block one company from seeing
  another's rows) are plain Postgres, so they move across.
- **Server code.** The Supabase edge functions become Lambda functions
  (AWS's run code on demand service), inside the VPC (Virtual Private
  Cloud: a private network only Dreef uses).
- **The model.** DeepSeek through Amazon Bedrock, reached over PrivateLink.
  Never DeepSeek's own API: that runs on DeepSeek's servers and breaks the
  private link promise. The Humanizer rules go in as instructions, the model
  is not trained.
- **Connections.** One MCP layer (Model Context Protocol, the standard plug
  for outside tools) in the code. One StellaXafe app per vendor, registered
  once, used by every client. Each client's admin approves it once. The
  running copy and the tokens live in each client's own account, never on
  one shared server.
- **Google.** For Dreef, a small Internal app inside Dreef's own Google
  Workspace: no Google review, no fee. Switch to one verified StellaXafe app
  (yearly paid security test, CASA) once there are several clients.
- **GitHub to AWS.** OIDC (GitHub proves to AWS which repo and branch is
  asking, and gets a key that expires within the hour). No stored AWS keys.
- **Billing.** Dreef's card, or ours plus a 20% management fee. Either way
  the AWS account and everything in it belongs to Dreef.
- **Maintenance.** First three months included, then a retainer.

## 2. Before the contract: the scope meeting

Ask, and write the answers into this file.

1. What do they use for email, files, chat and notes? (Google Workspace or
   Microsoft 365, Drive or SharePoint, Slack or Teams, Notion or other.)
2. Which documents does their team write most? Get three real samples and
   their templates.
3. How many staff will use it, and which departments first?
4. Do they want WhatsApp for customers? Which number?
5. Who is their IT admin? (They approve Google, Slack and Notion access.)
6. Their card or ours for AWS?
7. Do they want staff to sign in with their existing company login (SSO)?
8. Where are they based? (Sets the AWS region, and the price scale.)

Then pick the tier and the fee.

| Tier | What is in it | Fee (scale to their market) |
|---|---|---|
| Core | Private AWS setup, knowledge base, staff assistant, one storage connection | about $15,000 |
| Standard | Core, plus WhatsApp for customers, and Gmail, Drive and Slack | about $25,000 |
| Full | Several departments, many connections, custom templates, SSO | $35,000 and up |

Quote the full price. If we discount for the first client, it shows as its
own line ("founding client"), so the next client does not inherit the low
number.

The contract covers: scope and tier, payment stages, the three free months,
the retainer, the AWS account and data belong to Dreef, and a DPA (data
processing agreement: how we handle their data).

## 3. Week one (the old weeks one and two)

### 3.1 Day one: start everything that is waiting, not working

These take days on someone else's side, so they start first.

1. **Meta.** Submit business verification and the WhatsApp display name.
   Usually 5 to 15 days. Nothing speeds it up.
2. **Google.** Send Dreef's IT admin the steps to create the Internal app
   and mark it trusted.
3. **Slack and Notion.** Send the admin the install link for our StellaXafe
   apps.
4. **AWS.** Open Dreef's account on the **Paid plan** (never the Free plan,
   which suspends the account after 6 months). Link it to ours through AWS
   Organizations if it runs on our card. Set a budget alert.

### 3.2 The AWS foundation

1. Pick a region where Bedrock has the DeepSeek model.
2. Create the VPC.
3. Add the S3 gateway endpoint (free private route to storage).
4. Add the PrivateLink endpoint to Bedrock, in two zones (about $15 a month).
5. Create the RDS database and the S3 storage, both encrypted.
6. Put every secret in Secrets Manager (WhatsApp token, Google, Slack,
   Notion, Canva). None in GitHub.
7. Write all of the above as a template (CDK or Terraform: code that builds
   the AWS setup), so the second client is one command.

Keep the functions that only talk to WhatsApp, search and Google outside the
private network. That avoids a NAT gateway (about $33 a month).

### 3.3 GitHub

1. Create the OIDC role in Dreef's account, locked to our repo and to the
   `testing` and `main` branches.
2. Create two GitHub Environments: `dreef-test` and `dreef-live`. Each holds
   the AWS account ID, the region and the role. These are not secrets.
3. Write the deploy workflow. Same code for every client; the environment
   picks the client.

### 3.4 Moving the app

1. Apply the schema and the RLS rules to RDS.
2. **Sign in.** Supabase does our email code sign in today. Replace it with
   Amazon Cognito, which supports email codes with no password. Keeps the
   no passwords rule.
3. **RLS without Supabase.** Our rules read the user from `auth.uid()`, a
   Supabase function. On RDS each request sets the signed in user first,
   and the rules read that instead. Same rules, one small change.
4. Port each edge function to Lambda, one by one, tested against the test
   copy.
5. Wire the MCP connections: Drive, Gmail, Slack, Notion, Canva.
6. Cloudflare Pages project, and their domain (for example ai.dreef.com).

## 4. Week two (the old weeks three and four)

1. Load Dreef's files and templates. Each one gets a name and a line saying
   what it holds.
2. Run the full flow on `dreef-test`: request, questions, read back, sources,
   document, saved to their storage.
3. A small group of their staff uses it for real work. Fix what they find.
4. WhatsApp goes live if Meta has finished. If not, it goes live the day it
   does.
5. Turn on the health checks (a scheduled job that checks the system and
   alerts us), and the monthly budget alert.
6. Train their staff. Short, since there is nothing to learn.
7. Go live on `dreef-live`. Hand over: account details, how billing works,
   who to call.

## 5. Running agents in parallel

Anthony sets up the accounts. Agents build at the same time, one lane each:

1. AWS template (VPC, endpoints, RDS, S3, Secrets Manager).
2. Database move (schema, RLS, the signed in user change).
3. Edge functions to Lambda.
4. MCP connections.
5. Cognito sign in.
6. Tests and the full flow run on `dreef-test`.

## 6. What can slow us down

- **Meta verification** is outside our control. Start it on day one.
- **Dreef's IT admin** has to approve Google, Slack and Notion. Book them in
  the scope meeting.
- **The client's files.** A scanned PDF is pictures of words and cannot be
  read. Ask for real text versions early.

Our plan is two weeks. If the contract names a date, give the client a
little more than two weeks, so finishing early is the surprise.
