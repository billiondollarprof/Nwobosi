# Build Sequence

**Starts Saturday 5pm WAT.** This replaces the earlier Monday plan.

The rule for the whole build: **the spine works end to end before
anything is made to look good.** A rough flow that runs all the way
through beats a beautiful screen that stops halfway.

## Before 5pm Saturday, no code

- Buy the $5 of Anthropic credit. Do not wait to find out whether the
  organisers supply any. Five dollars is enough (see the budget section
  in `02-architecture.md`) and waiting costs more than it
  saves.
- Create the accounts: Supabase project, Anthropic API key, GitHub repo.
- Pick the case study company and download its public material. Aim for
  an About page, a services or product list, a policy or terms page, and
  a price list. Four files is plenty.
- Decide the one demo scenario you will show a judge, start to finish.
- Write the access codes.

## Block 1 — Saturday evening: the spine and the isolation proof

End of block: **the company exists, its data is locked to it, and you
can prove it on screen.**

1. Repo and Supabase project wired up.
2. The tables, with row level security switched on and a policy on each.
3. `redeem-code`: enter a code, get a session tied to one company.
4. The code entry screen. Plain. No styling effort yet.
5. `ingest-document`: split each file into labelled sections with
   keywords.
6. Load the case study company's files.
7. **The isolation proof.** Add a second company, sign in as the first,
   and show the database refusing to return the second one's rows.
   Capture it now. It is the most persuasive thing you have, and it is
   the first thing that gets forgotten in a rush.

## Block 2 — Sunday: the two engines

End of block: **someone describes a task in plain words and a real
document comes out.**

1. `gateway-proxy` first, before anything else calls a model.
   Validation, redaction, logging, then forward. Everything routes
   through it from the start so nothing has to be retrofitted.
2. `interview-turn`: Haiku asks up to five questions, one at a time,
   and rephrases when an answer is too vague.
3. `compose-prompt`: pull the matching sections, build the detailed
   prompt, show which sections were used.
4. `generate-artifact`: Sonnet writes the document. **Word first.** One
   format working completely beats three half working.
5. Excel and PowerPoint once Word is solid.
6. `token-ledger`: the weekly per person budget, enforced.

## Block 3 — Monday: admin, the seal, and the edges

End of block: **feature complete and rehearsed.**

1. Admin dashboard: staff list, weekly budgets, the egress log.
2. The **Containment Seal** wired to real numbers from the log. Not a
   mockup. See `04-logo-and-hero.md`.
3. Switching between companies.
4. The refusal state. When the company files do not answer the question,
   the system says so and offers to fetch a human. **Demonstrate this
   deliberately.** It is the trust argument, not an edge case.
5. Voice input, only if everything above is done.
6. Full end to end rehearsal, twice.

## Block 4 — final day: landing page and submission

No new features. Anything unfinished the night before is cut, not
rescued.

1. The landing page, built to `04-logo-and-hero.md`. Hero, the problem
   in one line, three steps, the live proof, the code entry.
2. Record the walkthrough. Follow the scenario decided before 5pm.
3. README: what it is, what is real, what is simulated.
4. Submit with hours to spare, not minutes.

## What to cut, in this order

1. Canva.
2. Voice input.
3. PowerPoint and Excel. Keep Word.
4. The second company, once the isolation proof is recorded.
5. Admin dashboard polish. The numbers matter more than the layout.

**Never cut:** the isolation proof, the gateway log, or the refusal
behaviour. Those three are the submission.

## Named as roadmap, not built this week

Say these out loud in the submission as the next steps. They are real
and they are close, which is worth more than pretending they are done.

- **WhatsApp customer agent.** The business account is already approved
  by Meta. A number takes roughly 24 hours to clear. Because the
  customer always messages first, no message template approval is
  needed, the reply goes back through a webhook. The wider point to
  make: the same engine can sit behind email or Facebook instead, so it
  meets customers wherever they already are rather than forcing a new
  channel.
- **Canva** for design output, using the Connect API.
- **Private VPC and on premise** deployment for companies that need the
  perimeter to be physical rather than enforced in the database.
