# Open: what Anthony has asked for, and what he has decided

The only file a session reads at the start, after `CLAUDE.md`. Keep it short.

How this file works:

- **A request he makes that is not finished in the same turn goes in at once**,
  in his words, with the date. Not at the end of the session.
- **It comes off when it is built, checked and used**, never when it is only
  planned. The finished entry moves to the bottom of
  `docs/history/SESSIONS.md` as one line, so this file never grows into a
  diary again.
- **A decision he makes goes under "Decided"**, so nobody reopens it.
- Everything before 2026-11-02, in full, is in
  `docs/history/CURRENT-to-2026-11-02.md`. Open it only when an entry below
  points there.

---

## 1. Now, in his order

**2026-11-10, done:** client trial code issued (given to Anthony in chat,
never in the repo), $2 meter. Every new workspace now starts on DeepSeek
(trigger, migration 20261110100000). Setup was broken for every new
workspace (73 character throwaway password, Supabase allows 72): fixed and
live. A full new workspace run was tested end to end on DeepSeek, test
workspace `volt-test-engineering` (internal test code, $1 meter): ask him
before deleting it.

**Next, his order:** (1) show the plan while it builds, as live progress
lines in colour, "like the way Claude used to show it"; (2) the output
fixes: one page means one page, no title shown twice, no reasoning on the
page, no chat at the top of the plan, no repeated lines (the Volt test PDF
repeated the payment terms and its header said the company name twice).

0. **After the Dreef call, 2026-11-10, in this order:**
   1. Rotate Amara's code (it was in the repo while public for minutes):
      `update access_codes set code = '<new>' where code = '<old>'`. His yes
      given. Give him the new code in chat only, never in the repo.
   2. Take every access code out of the docs, and add the rule: no codes, no
      keys in the repo. Six unused or orphaned codes already revoked.
   3. Ask him whether `docs/clients/` moves to his Drive.
   4. Output fixes f to i below (prompt, his yes given), test, ship.
   5. CI minute savings (his yes given): skip CI on doc-only pushes, no
      second CI run on the merge to main, shorter smoke wait.
1. **Make the demo flow work, step by step.** 2026-10-31. Dreef may book a
   call to see it. They need to see three things and nothing else:
   1. Start a request in the existing Amara knowledge base.
   2. It runs the stages and produces a finished document.
   3. If they want it, it searches the internet.

   Go through each stage of the assistant one at a time, find where it fails,
   fix it, and make each step simpler while keeping the output at its best.
   The demo stays on Supabase on purpose: it is there to close a client.

   **Audit from the records, 2026-11-03** (conversations and budget, read
   only). Last three real runs, 23 Sep to 1 Oct, all reached a document.
   Faults found, to fix together after one live rehearsal:
   a. Amara's budget is 67 cents. At zero the assistant refuses. Needs a
      top up or exempt (SQL write, his yes).
   b. The prompt never mentions Canva, so the model improvised: told him
      "PDF or Word", then offered PowerPoint two messages later. Prompt
      line needed (edge function change, his yes).
   c. Two error texts on the staff screen say "Check the function logs" and
      "answered with 500" (`src/shared/assistantApi.js`). Plain words.
   d. 25 Sep: "Yes, ask me your questions" stalled ("That one stopped
      answering"), then the next turn asked twice in a row. Cause unknown;
      the rehearsal logs will show it.
   e. FIXED 2026-11-10: the web search works. Tavily key added; live run
      found real sources with Verify links and tickboxes, 87 seconds.

   **Live run, 2026-11-10** (testing site, Amara, DeepSeek): request,
   questions, search, read back, PDF, all worked. Whole run 4.8 cents.
   Faults found in the result, to fix with his yes (assistant prompt):
   f. Asked for a one page summary, got 3 pages.
   g. Every section shows its title twice (a small label, then the same
      words as a heading), and the steps are numbered twice ("1" and "01").
   h. The model's own reasoning leaks onto the page: "This page will not
      borrow a foreign number and dress it as a Nigerian one".
   i. Two sets of reply buttons after the first turn: likely a double reply.
2. **Models for the demo: DeepSeek for the work, Gemini for support.**
   2026-11-03. His words: "use the DeepSeek most capable model and then use a
   simpler model for the WhatsApp chat... we can actually use Gemini, because
   Gemini has free tier". No Claude credit left. Found: Amara already runs
   wholly on DeepSeek (`deepseek-flash`, which DeepSeek says is its strongest
   model; v4-pro routes to it). To build: a `gemini` vendor in
   `_shared/brain.ts`, and a separate vendor setting for support (needs a
   column, SQL his yes). His steps: fund $5 on DeepSeek, get a Gemini key
   from Google AI Studio and put it in Supabase secrets as `GEMINI_API_KEY`.
   Caution told to him: Gemini's free tier may use prompts to improve
   Google's products; fine for Amara's demo, not for a client.
3. **Research similar tools**, and how they orchestrate agents to produce
   documents and files. Then recommend how to shape ours (security aside).
4. **MCP and the browser**, and keeping web search cheap. He asked why an
   online session costs so much, and about free search access such as Exa.
   Start from what exists: our search already runs on Tavily's free plan and
   DuckDuckGo (`docs/state/LIVE.md`).

## 2. Dreef, the first client

- Brief (ready to send): `docs/clients/dreef/BRIEF.md`
- Notes behind it, never sent: `docs/clients/dreef/NOTES.md`
- Build plan, two weeks: `docs/clients/dreef/PLAN.md`

## 3. Open from before, not yet done

Each was open when last written down. **Check the code before building any of
them**, because some may have been done since. Full detail is in
`docs/history/CURRENT-to-2026-11-02.md`, searchable by the date given.

**Knowledge base and cost**

- **One source per document.** `Amara Product Overview & Pricing` is one
  scrape of the whole website, 59,837 characters, sent on every turn, and it
  holds a second set of prices that contradicts `Amara partners`. His design
  decision. (2026-09-25)
- **Does support cache?** One test settles it: two support messages minutes
  apart. Not run. (2026-09-25)
- **Same content under a different name** is not detected. Needs a content
  fingerprint column, a schema change. (2026-09-21)
- **Pictures uploaded before `read-image` existed** have no text. A "Read this
  picture" action would fix them. (2026-09-21)
- **Bulk upload** still needs one Save per file. (2026-09-21)
- **Grouped pictures** keep what they said, not the originals. Keeping them
  needs a second table, his call. (2026-09-21)

**The assistant**

- **Canva design does not work.** Connecting works; nothing in the chat calls
  `canva-design`, and it only uploads a picture, it does not lay out a
  document. (2026-09-23)
- **Voice per staff member**, learned over time, falling back to the company
  tone. (2026-09-23)
- **Company format styles**: the built in format is a default, the company
  and staff can upload their own. (2026-09-23)
- **Reuse a good past document** as the reference (`docs/product/STYLE-MEMORY.md`,
  shape only, decided). Not built.
- **Memory per person** is designed (`docs/product/DIRECTION.md`), not built.
- **A search offer after the brief is written** was offered as its own job; he
  has not asked for it yet. (2026-09-21)

**Admin and support**

- **The Access requests panel** can never show anything. Wire it to real
  requests, or take it off. (2026-09-22)
- **Grey sub text on the brand colour** is hard to read. "Even if a text is
  supposed to be sub it should be readable too." (2026-09-23)
- **WhatsApp quick reply clash**: template buttons land in the support
  thread. His fix: a separate number. (2026-09-16)
- **Reply by WhatsApp or Gmail**, a toggle per thread, with a 12 hour cap on
  WhatsApp. (2026-09-16)
- **Remove the old message area** in the admin, since support has its own
  route. (2026-09-16)
- **The workspace header cuts the company name at 320px.** "Note that and
  maybe fix it later." (2026-09-10)

**His steps, not ours**

- **Deploy the document converter** on Cloud Run (`converter/README.md`), then
  set `CONVERTER_URL` and `CONVERTER_SECRET`.

## 4. On hold or dropped

- **Dropped, 2026-10-31: the /anthony portfolio and its video.** His
  portfolio is now anthony.stellaxafe.com. Do not change or remove the old page
  until he says so.
- **On hold, 2026-09-26: the slow video start.** Superseded by the drop above.

## 5. Decided, so nobody reopens them

- **2026-11-02: read only SQL runs without asking**; writes go to him as one
  batch with a short line each (`docs/rules/DEPLOY.md`).
- **2026-11-02: repeat a request back only for new features and big work.** A
  specific request is carried out.
- **2026-10-31: the demo stays on Supabase.** Clients get their own AWS build.
- **2026-09-23: storage is whatever the company connects.** Google Drive first;
  the next one is a provider entry, not a rewrite.
- **2026-09-23: the checkpoints are hard wired.** Permission before searching
  the internet. Interview, read back, brief, build, in that order. Interview
  and read back continue until everything is provided or the staff says go.
- **2026-09-23: reuse is shape only.**
- **2026-09-23: an admin sees the short summary of staff work, not the whole
  document.** (This replaced "admin sees everything" the same day.)
- **2026-09-21: the capable model reads pictures, every picture is read**, and
  a picture with no words gets a one line description of what it is.
- **2026-09-21: the model decides how pictures picked together are grouped.**
- **2026-09-15: headline** "Private AI that already knows your company. / Zero
  data leakage." Subtext used as he wrote it. Hallucination claim: "Nothing
  enters your work that you did not approve."
- **Bedrock is never named on a public page**; it belongs in a per customer
  deployment document.
