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

**Done on 2026-11-10** (moves to the session log at the end of the day):
client trial code issued with a $2 meter; every new workspace starts on
DeepSeek; setup fixed for every new workspace (73 character password);
Amara's access code changed and six old codes revoked; Amara meter topped up
by $4; Tavily key added, web search works; Amara's green set as its brand
colour, and brand colour now found from an admin's uploads; documents: no
doubled titles or step numbers, no running line saying the company twice,
reading text at least 11 point, no reasoning on the page (instruction), the
plan written first with nothing before it; the plan shown live while it
builds, with coloured progress lines; landing page motion like his
portfolio, "Meet the founder", founder page linking to anthony.stellaxafe.com;
products section removed from the landing page; one page means one page
(tested live: a fresh Amara one-pager came out as exactly one page); a page count
they named is checked once, then respected (live, assistant redeployed by
GitHub).

**The queue, everything he asked for on 2026-11-10, taken one after the
other.** Nothing comes off until it is built, checked and live.

3. **The waiting line.** Something on screen within about 2 seconds
   ("Responding in a bit"); the word shimmers with a pulsing mark, like
   Claude's "Musing..."; a failure says so and retries once; a usage limit
   says so plainly. "It doesn't leave somebody hanging."
   **Built, on testing:** "Responding in a bit" first, a breathing mark and shimmering word, a seconds counter after 4s, one automatic retry ("That did not come back, trying again"), limits and pauses said as plain replies.
4. **The first stage, conversational.** Chat freely, read the company map
   silently, and only when the direction is clear say "if I understand, this
   is what you want to build", then pull the knowledge. "That beginning part
   is actually very, very, very vital." Each stage its own skill (its own
   instruction file). His yes given. Built: each stage in
   `supabase/functions/assistant/stages/`, the first stage talks until the
   direction is clear, the card reads "Is that right?". On testing; live
   test, then main.
4b. **Fit the pages, never truncate** (2026-11-10): "Fitting into a page
   doesn't mean that it will Truncate the details, it still has to end every
   file well." The plan now says how the content fits; the writing keeps
   every agreed point and always ends properly. Ships with 4.
5. **The flow after that.** The few missing questions in one go, with "should
   I look this up online?" inside them; the search runs after the answers;
   a short read back (what, who, direction, sources, format); then "Go ahead
   with PDF / Word / Excel / Slides".
   **Built, on testing:** questions in one numbered message; "Yes, after my answers" arms the search, which runs once they answer (the server's yes gate unchanged); five line read back; build card "Go ahead with PDF" plus Word, Excel, Slides. Walk: `search-after.cjs`.
6. **Change a document after it is built, with no new interview.** The
   instruction is live (assistant v55); test it.
7. **Excel and PowerPoint, checked for real.** Make both, screenshot every
   slide and sheet, text at least 11 point. The system should look at what
   it made (screenshot) before handing it over, especially slides.
8. **"Analyse this file", simple, for the client.** Upload a document, get an
   analysis (for example pricing). The full analyser comes later, per
   company, and reads the knowledge map.
   **Built, on testing:** "Analyse a file" in the plus menu; the first stage answers in the chat (what it is, what stands out, against your material, risks, next steps).
9. **The knowledge map.** One short file summarising every source, its
   sections and where it lives; written when files are added; says where
   the brand colour came from (uploaded on purpose, found in the logo or
   files, or none so our blue); the assistant reads it and fetches only what
   it needs. Project files first, connected platforms later.
   **Built, on testing:** `_shared/knowledgeMap.ts`, read first by the assistant every turn and shown folded on the admin Knowledge screen. Brand colour origin needs SQL (`20261110120000`, his yes). **Not built yet:** fetching only the sources a turn needs; every turn still reads all of them. Needs a measured test of cost and answer quality before it ships.
10. **Admin control.** A weekly limit as well as daily; pause and resume a
    person; usage per person in documents made; click a name for a dropdown
    of what they did; signed in, signed out, active now. No notice to staff
    about it (his decision).
    **Built, on testing:** the daily limit, a weekly limit and pause are now
    enforced by the assistant on the server (before, nothing stopped anyone);
    People screen shows activity, documents today and this week, Pause and
    Resume, and a tap on a name lists their last seven days of work. Needs
    SQL (`20261110130000`, his yes) before weekly limit, pause and activity
    appear.
11. **Humanizer on every piece of copy.** Go through the landing page and the
    app's own text so it reads like a person talking: context, conversational,
    nothing clipped. The skill is in `.claude/skills/humanizer`, the rules in
    `docs/rules/WRITING.md`.
    **Landing page done, on testing.** Also fixed two lines left stale by the
    products section going, and took Amazon Bedrock off the public page.
    **The app's own text is not done yet.**
12. **Gemini for support, DeepSeek for the work.** Needs his Gemini key in
    Supabase secrets as `GEMINI_API_KEY`.
13. **CI minute savings** (his yes given): skip CI on doc-only pushes, no
    second CI run on the merge to main, shorter smoke wait.
    **Blocked:** the edit to the workflow files was refused by the agent's
    safety check, because it skips checks. Needs his explicit go-ahead in
    the chat for this exact change.
14. **Housekeeping.** Take the access codes out of the docs and add the rule
    "no codes, no keys in the repo"; ask whether `docs/clients/` moves to his
    Drive; ask before deleting the test workspace `volt-test-engineering`;
    the repo goes back to private (his step) before anything sensitive is
    added.
    **Codes done, on testing:** every code in the repo replaced with
    `SX-XXXX-XXXX` (all were revoked or never existed) and the rule added to
    `CLAUDE.md`. The three questions are still open.
15. **Connected tools, per client** (written in `docs/product/DIRECTION.md`):
    ask before using any, one at a time in task order, connected knowledge
    before the internet, Canva offered for designs.
16. **Research:** similar tools and how they orchestrate agents to make
    files; MCP and the browser; keeping search cheap.

**Background, kept for its findings:** the demo flow audit. 2026-10-31. Dreef may book a
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
**Background:** models for the demo, DeepSeek for the work, Gemini for support.
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
**Background:** research similar tools, and how they orchestrate agents to produce
   documents and files. Then recommend how to shape ours (security aside).
**Background:** MCP and the browser, and keeping web search cheap. He asked why an
   online session costs so much, and about free search access such as Exa.
   Start from what exists: our search already runs on Tavily's free plan and
   DuckDuckGo (`docs/state/LIVE.md`).

## 2. Dreef, the first client

Client papers live in his Google Drive, not in this repo (moved 2026-11-10,
because the repo is public): folder "StellaXafe - Clients - Dreef", holding
the brief (ready to send), the notes behind it (never sent) and the two
week build plan. Anything about a client, a price or a contract goes there.

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

- **2026-11-10: limits.** Admins have no document limits; the money meter
  (the $2 on a client trial) is their only cap, and when it runs out it is
  finished. Staff get 20 documents a day by default; the admin can lower it
  at any time and the new number applies at once (done 10, cut to 12, so 2
  left). A change to a finished document is not a new document: changes have
  their own cap of 20 a day. On this platform the money cap belongs to the
  admin, because admins are the clients. In a client's own build, the client
  decides each user's cap, by number of documents or by usage.
- **2026-11-10: Gemini runs support only, on this platform**, on the free
  Flash tier, to save money. DeepSeek does the work. His key is in Supabase
  secrets as `GEMINI_API_KEY`.
- **2026-11-10: the knowledge map decides what a turn reads.** A turn reads
  the map, then only the sources it needs; everything only when the task
  needs everything.
- **2026-11-10: client papers live in his Drive**, never the public repo.
- **2026-11-10: connected tools are context for now.** Canva and Drive keys
  are added; why they do not work yet is to be checked.

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
