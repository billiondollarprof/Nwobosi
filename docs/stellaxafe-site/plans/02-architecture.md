# Build Architecture

Planning document. No code is written yet. Everything here is a
specification to build from on day one.

## 1. What we are demonstrating

A company workspace where staff get frontier model output **without
knowing how to prompt** and **without company data leaving the
perimeter**.

Scope for the first build is the **internal staff workflow only**. Not the
WhatsApp customer agent. Not billing. Not signup.

## 2. The two engines

This is the heart of the demo and the thing to get right first.

### Engine A — the Interview (prompt engine)

Most staff cannot write a good prompt, so they get bad output and blame
the AI. Engine A removes that step.

1. Staff says or types what they want, in plain words.
   ("I need to send a renewal notice to clients expiring next month.")
2. The system asks short, simple questions, one at a time. Not a form.
   **Hard cap of five questions**, then it proceeds with what it has.
3. If an answer is too vague to use, that question is **rephrased and
   asked again, or explained differently**. A retry does not count
   against the five. Two retries on the same question and it moves on
   rather than trapping the person in a loop.
4. While asking, it pulls **only the relevant labelled sections** of the
   company's files, not whole documents.
5. It produces a **long, detailed, company grounded prompt**.

The prompt must be built **only from the uploaded company files and the
person's answers**. Nothing from the model's general knowledge is
allowed to leak in as if it were company fact. If the files do not cover
something, the prompt says so rather than inventing it. This is the
difference between a grounded system and a confident liar, and it is the
thing judges will poke at.

**Voice input** is free and needs no service. Browsers have speech
recognition built in, so the microphone button turns speech into text in
the browser and the text goes through the normal path. Nothing changes
behind it. Chrome and Edge support it well, Safari partially, so it
stays an enhancement and the typing path always works.

### Engine B — the Build (output engine)

Takes that prompt and produces the actual artifact: Word, Excel,
PowerPoint, a letterhead document.

### The handoff

When the interview has enough, Engine A passes the prompt **straight to
Engine B automatically**. The prompt is also shown on screen so the
staff member can copy it and use it elsewhere if they prefer. Two
engines, one continuous experience.

## 3. Why the token cost stays low

The company's files are split at ingest into **labelled sections**, each
with a heading, a path, and extracted keywords. At request time the
system does not read the whole file. It works out which sections the
task touches, from the answers given in the interview, and pulls only
those. If the task spans three files, it pulls the relevant section from
each of the three.

This is the difference between sending a 40 page handbook to the model
every time and sending four paragraphs.

## 4. Data model

Every table carries `tenant_id`. Every table has row level security on.
This is the isolation story, and it is demonstrable on the free tier,
because RLS is a core Postgres feature and costs nothing.

| Table | Holds |
| --- | --- |
| `tenants` | The companies in the demo |
| `demo_codes` | Access codes. No signup. Code maps to a tenant |
| `staff` | People in a tenant, their role, their weekly token budget |
| `documents` | Uploaded company files |
| `doc_sections` | The labelled sections: heading, path, body, keywords, embedding |
| `sessions` | One piece of work a staff member is doing |
| `session_turns` | The interview questions and answers |
| `generated_prompts` | Engine A output, plus which sections it used |
| `artifacts` | Generated files, kind and storage path |
| `egress_log` | Every outbound model call: bytes out, redactions applied |
| `redaction_rules` | Per tenant patterns to strip before anything leaves |

`egress_log` is not bookkeeping. It is what the Containment Seal on the
landing page reads from. The brand mark shows real numbers.

### Row level security, in plain language

Nobody can read a row unless the tenant on that row matches the tenant
in their session token. There is no application level "where tenant_id
=" that a bug can skip, the database itself refuses. The demo proves it
by signing in as company A and showing company B's data is not merely
hidden, it is unreachable.

## 5. Edge functions

Supabase Edge Functions run Deno and TypeScript, which matters for the
document libraries below.

| Function | Job |
| --- | --- |
| `redeem-code` | Exchange an access code for a short lived, tenant scoped session token |
| `ingest-document` | Split a file into labelled sections, extract keywords, store |
| `interview-turn` | Engine A: decide the next question, or decide we have enough |
| `compose-prompt` | Engine A: retrieve the sections, assemble the detailed prompt |
| `generate-artifact` | Engine B: prompt to docx, xlsx or pptx |
| `gateway-proxy` | The actual product: validate, redact, log egress, then forward to the model |
| `token-ledger` | Enforce the per staff weekly budget |

**`gateway-proxy` is the one that matters.** Every model call in the
whole system goes through it. Nothing calls the model directly. That is
the entire StellaXafe pitch expressed as one function, and it is what
writes `egress_log`.

## 6. Access without signup

No account creation in the demo. A visitor enters a **code**, which
unlocks one company workspace. A plus button adds another company, so
you can demo two different businesses side by side using publicly
available information about each.

This is faster to build, faster to demo, and avoids auth flows eating a
day.

## 7. Decisions made

**Model provider: Anthropic**, on purchased or sponsor credits. There is
no general free tier, so the credits have to exist before Monday. Day 0
confirms them. `gateway-proxy` stays the only place that talks to a
model, so if credits fall through the swap is one file.

**Document generation: free libraries.** `docx`, `exceljs` and
`pptxgenjs` are free, need no OAuth, run in Deno alongside the edge
functions, and produce real Office files deterministically. Canva's
Connect API needs a developer app and OAuth approval, which is too much
risk to put on the critical path of a three day build. Canva comes after
the first build, where the per staff free account idea is still the right
long term answer for design heavy work.

### Canva Connect is blocked, not just risky (confirmed)

Attempted during setup and hit a hard wall, so this is settled rather
than a judgement call:

- Creating any integration needs **MFA** on the Canva account.
- MFA needs a **password** on the account first. An account created
  through Google sign in has none, and a passkey does not satisfy the
  requirement. The fix is the password reset page, then MFA through an
  authenticator app.
- Behind that, the real blocker: a **private** integration works only
  for a team on a **Canva Enterprise plan**, and a **public** one has to
  be **reviewed by Canva** before it can be used.

So on a free plan there is no route to a working integration in a
weekend. Money or a review queue sits at the end of it either way.
Engine B stays on the free document libraries, which need no account,
no OAuth and no approval.

### On the Canva Dev MCP server

Worth being precise about, because the name suggests more than it does.

The Canva Dev MCP server (`npx -y @canva/cli@latest mcp`) is a
**development time documentation assistant**. It gives a coding agent
access to Canva's Apps SDK, App UI Kit and Connect API documentation so
the agent writes correct integration code instead of guessing. It runs
locally and fetches docs from canva.dev.

It is **not a runtime path**. It does not let the deployed product
generate a design for a staff member. For that, the product still needs
the Canva **Connect API** with its own OAuth flow, which is exactly the
piece that was judged too risky for a three day build.

So the MCP server does not change the decision above. What it does
change is the cost of the Canva work **after** the first build: pointing a
coding agent at it should make the Connect integration noticeably faster
and less error prone to write. Add it to the tooling then.

Separately, a Canva **AI Connector** exists for working with designs
from inside an assistant session. That is also account bound and session
bound, so it is useful for prototyping and for seeing what Canva output
actually looks like, but it is not something a multi tenant product can
call on a staff member's behalf either.

## 8. Model and cost strategy

The token cost worry is the right worry, and most of it is solved by
caching rather than by picking a cheaper model.

### Two models, switched automatically

The system picks the model by job. The person never chooses.

| Job | Model | ID | Price per million, in / out |
| --- | --- | --- | --- |
| Asking the questions (Engine A) | Claude Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 |
| Writing the document (Engine B) | Claude Sonnet 5 | `claude-sonnet-5` | $2 / $10 until 31 Aug 2026, then $3 / $15 |

Interview turns are short back and forth. They do not need a powerful
model, they need a fast cheap one. Document writing is where quality
shows, so that gets Sonnet.

One correction worth making: **Haiku 4.5 is the current Haiku**, not
Haiku 3.5. The older one saves about twenty cents per million tokens and
is noticeably weaker. At this budget the saving is not worth it.

`gateway-proxy` decides which model to call based on the job, so the
switch is one line in one file and nothing else in the system knows or
cares.

### The $5 budget

Rough working figures, so you can see the shape rather than guess:

| Action | Rough cost |
| --- | --- |
| One five question interview on Haiku | about 3 cents |
| One document written by Sonnet | about 4 cents |
| One full run, interview plus document | about 7 cents |

So **$5 is roughly 70 full runs**, before caching. That is comfortably
enough for building, testing and demoing. Five dollars is not the
constraint. The things that actually burn a budget are:

- A retry loop that keeps firing after an error.
- Sending a whole file instead of the few sections that matter.
- Re-running the same big test twenty times while debugging.

`token-ledger` is what protects against all three. It is a product
feature and a spending brake at the same time.

Set a hard spend limit in the Anthropic console as well. Belt and
braces, and it costs nothing to do.

### What caching means, in plain words

Normally you pay for every word you send, every single time you send it.

In one work session the same company information gets sent over and over,
because the model has no memory between messages. You are paying full
price for the same paragraphs five times in a row.

Caching fixes that. The first time you send that block of company
information, the system keeps a copy of it for a few minutes. Every time
after that, sending the same block costs **about a tenth** of the normal
price. Making the copy costs a small amount extra once, then you save on
everything after.

There is one rule, and it is strict: **the saved part has to be
identical every time, and it has to come first in the message.**

So the message is built in this order:

1. The instructions, which never change.
2. The company sections, which do not change during a session.
3. *(the cache marker goes here)*
4. The person's question, which changes every time.

Everything above the marker is reused cheaply. Everything below is paid
for normally.

If you change even one character above that marker, the saved copy is
thrown away and the next message costs full price again. So the usual
mistakes are: putting the time or a random ID into the instructions,
building the JSON in a different order each time, or changing the list of
tools between calls. Any of those quietly turns caching off while
everything still appears to work.

To check it is actually working, look at `cache_read_input_tokens` on the
response. If that number is zero every time, something above the marker
is moving and the saving is not happening.

A practical note: the saved copy lasts five minutes by default, which
suits one person working through one task. There is a one hour option if
a session runs long.

### Enforcing the per staff weekly budget

`count_tokens` gives an exact count before a request is sent, so
`token-ledger` can refuse a call that would breach the weekly budget
rather than discovering it afterwards. Then read `usage` off the
response for the actual figure. Pre-flight check, post-flight
accounting.

### Spend controls on the request itself

- `output_config: {effort: "low" | "medium" | "high" | "xhigh" | "max"}`
  controls how much thinking the model does. Interview turns are cheap
  work, so `low` or `medium`. Prompt composition deserves `high`.
- `thinking: {type: "adaptive"}` is the only thinking mode on Sonnet 5.
  The old `budget_tokens` parameter is removed and returns a 400.
- Assistant message prefill is also removed on Sonnet 5 and returns a
  400. Shape the output with structured outputs
  (`output_config: {format: ...}`) instead, which is a good fit for the
  interview engine returning its next question as structured data.
- Stream anything that might produce a long document, so a slow response
  does not hit the request timeout.

### No embedding service needed

Anthropic does not sell embeddings, but this design does not need them.
The sections are already labelled with headings and keywords, so
**Postgres full text search** over `doc_sections` does the retrieval,
costs nothing, and is easier to explain to a judge than a vector index.
`pgvector` stays available on the free tier if search quality turns out
to need it, but start without it.

### If Wednesday runs out of time on Engine B

Claude's code execution sandbox already has `python-docx`, `python-pptx`
and `pypdf` installed, and can hand back generated files. It is a
genuine escape hatch if the local document libraries fight back. It
costs model tokens where local generation costs none, and it does the
assembly on Anthropic's side rather than inside our own function, so it
is the fallback rather than the plan.

## 8. Honest limits to state in the submission

Judges respect a clear boundary more than an overclaim.

- The isolation shown is **strict row level security on shared
  infrastructure**, not a private VPC. The VPC and on premise deployment
  are real offerings but are paid infrastructure and out of scope for a
  first demo. Say so plainly, and show the RLS policies instead.
- The demo tenants are built from **publicly available company
  information**, not real customer data.
