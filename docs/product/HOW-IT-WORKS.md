# How StellaXafe works

A private AI gateway for one company. Staff describe what they need in
plain language. The assistant interviews them briefly, reads only that
company's approved material, confirms what it understood, and produces a
finished document.

---

## The problem

Three, in the order they cost a company money.

**Data leaks through the front door.** Staff paste company material into
public AI tools every day. There is no policy that survives a deadline.

**Prompting is a retry loop.** Write a prompt, get something close, rewrite,
repeat. Every round costs time and tokens, and the result still does not
match how the company writes.

General AI models hallucinate by pulling unverified external data or making assumptions outside company context.

## The answer
One secure workspace per company, isolated to its own internal data. The AI interviews users before generation to refine requirements and create optimized prompts, reducing guesswork, token waste, hallucinations, and inaccurate outputs. It can run locally or in a private cloud/VPC, with external web access restricted so sensitive company data stays within its secure boundary.


---

## The flow, end to end

**1. Setup.** A company arrives with an access code, names itself, and gets
its own workspace at `/{company}`. Codes are single use and spent only at
the final step, so an abandoned setup costs nobody anything.

**2. The admin adds the company's knowledge.** Files, pasted text, or a web
page. Each one gets a name and a line saying what it holds, because that is
how the assistant later decides which to open. PDF and Word are read in the
browser: the file never leaves the device, only the text inside it.

**3. A staff member asks for something.** Plain language. No prompt writing.

**4. A short interview.** Three to five questions, on the cheapest model,
because working out what somebody wants does not need the expensive one.

**5. It steps up by itself.** When the interview has enough, the work moves
to a stronger model without anybody pressing anything. That model reads the
company's material and picks what is relevant.

**6. It either asks or reads back.** If something is genuinely missing it
says so, and the conversation drops back to the cheap model to collect it.
When it has everything, it reads the brief back: what it is making, for
whom, which company sources it will use, what it is assuming.

**7. The person confirms.** *Did I get that right?* Build it, or say what is
wrong. A correction re-enters the same loop.

**8. It writes the document.** Download it as a PDF or a Word file, both
built in the browser, and it is saved to the company's library.

---

## What makes it different

**It only looks online with permission.** The assistant can search the web
and read pages, but only after the person says yes, and what it finds is shown
as a list they tick before any of it enters the work. Every address shown comes
from a result the search actually returned. Facts reach a draft through these
routes, and a person opens every one:

1. The company's approved sources
2. What the person types, or a file they hand over
3. Web findings they approved, each with its link
4. Nothing

**Missing information becomes a route, not a refusal.** When it lacks
something it names who in the company to ask, or where to look and what
search terms to use, or asks for the material itself. It never fills the
gap by inventing.

**Anything unverified is marked** and has to be confirmed before it enters a
draft.

**Links are read once, by the server, when an admin vouches for one.** The
page's text is stored. The assistant reads stored text and still cannot
open a link, so a page that changes next week cannot quietly change what it
believes.

**The model tier is decided by the task and capped by the person.** Cheap
conversation, expensive output, never the other way round, and never above
what an admin granted that staff member.

---

## How the isolation actually works

Every table has row level security on. Every policy is scoped by company,
and the company is looked up from the signed-in user's own row:

```sql
select company_id from public.staff where id = auth.uid()
```

That value comes from a verified token, so a client cannot claim to be on
another company by editing a request. The helper runs `SECURITY DEFINER`
with a pinned `search_path`, and fails closed: no row means no access
rather than all access.

Access codes have RLS on and **zero policies**, so nothing but the server
can read them.

The Anthropic key never reaches a browser. Every model call goes through an
edge function that decides three things the browser is not allowed to
influence: **who** you are, **which** model may run, and **how much** budget
is left.

---

## What it is built on

React and Vite on Cloudflare. Supabase for Postgres, auth, row level security
and edge functions. The model is a setting per company, not a fixed choice:
the assistant runs on Anthropic or DeepSeek today, through one seam
(`supabase/functions/_shared/brain.ts`). Web search is our own
(`_shared/search.ts`), so it works the same for every model.

---

## Limits of this demo

- **Outputs:** PDF, Word, Slides and Excel files, built in the browser, plus a
  straight conversion between PDF and Word.
- **Storage:** Google Drive is the first connection built. Others are added
  per company.
- **Canva:** connecting works; laying a document out in Canva does not yet.
- **Gmail, Slack and Notion** are examples of what a deployment connects.
- **Sign in** is a code sent to email. No passwords.
- **A scanned PDF cannot be read** as text, because it is pictures of words.
  It says so and asks for the text.

What a client receives is built for them, in their own cloud. See
`docs/product/DIRECTION.md` and the client folders in his Google Drive.
