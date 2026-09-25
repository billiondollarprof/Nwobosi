# CURRENT

Where StellaXafe actually stands. The body of this file was written
2026-08-27; the note directly below was added 2026-09-04. Read this first.
`SESSIONS.md` is the log behind it, and `DIRECTION.md` is what this is all
being built toward.

---

## ANTHONY'S OPEN REQUESTS

**Read this before anything else in this file, and add to it the moment he
asks for something.**

Why this section exists: on 2026-09-15 Anthony asked whether his requests
were being recorded or thrown away. They were being listed back to him in
chat every time, and they were never written down anywhere that survives a
session. He was right. A request that lives only in a conversation is gone
the moment that conversation ends, and he then has to remember it and ask
again, which makes remembering his own product his job instead of Claude's.

So: when he asks for something and it is not built in that same turn, it
goes here, in his words, with the date. It comes off the list when it is
built and checked, not when it is planned.

### Open

0000000000000000. **2026-09-25, THE BRAIN IS SWAPPABLE: THE SEAM IS BUILT, THE
                   DEEPSEEK ADAPTER IS NEXT. Read this before touching any
                   model call.**

                   Anthony: "the first thing is to make that possible before
                   adding DeepSeek as the brain so that the infrastructure will
                   exist already so I can always switch... this project is not
                   a SaaS, it is on demand deployment. So a company might prefer
                   OpenAI."

                   BUILT, ON `testing`, NOT DEPLOYED. A new shared module,
                   `supabase/functions/_shared/brain.ts`, is now the ONE place
                   in the server that names a real model and what it costs. All
                   eight functions that reach a model read from it:
                   assistant, support-ask, read-image, describe-source,
                   group-images, add-link, canva-design, read-before-publish.
                   Each had its own hardwired client and its own model string.

                   The table is per VENDOR and per LEVEL, so one vendor can
                   carry more than one model. That is the cost efficiency he
                   asked for: a company on Anthropic pays for the cheap model
                   on support and the capable one for office work.

                   ⚠️ STEP ONE IS BEHAVIOUR-NEUTRAL BY CONSTRUCTION. Anthropic
                   is still the only adapter, and the numbers reproduce what
                   shipped: the same models, the same rates, the same two
                   rounding rules. Verified: type check clean, all 21 test files
                   at zero failures, lint at zero errors.

                   ⚠️ THE VENDOR IS STILL HARDWIRED TO ANTHROPIC IN EFFECT.
                   Every call site reads `vendorFor(null)`, which returns
                   Anthropic. The `brain_vendor` column does NOT exist yet. That
                   column plus one line per call site is step three, and it
                   needs Anthony's approval in the chat before it runs.

                   ⚠️ OPENAI IS DELIBERATELY EMPTY in the table, and
                   `clientFor` refuses it, so choosing it fails loudly rather
                   than quietly spending on prices nobody has checked. Its
                   models and rates have to be chosen before it can be used.

                   NEXT: the OpenAI-format adapter, which natively covers both
                   OpenAI and DeepSeek, then the column, then DeepSeek on his
                   own company. `DEEPSEEK_API_KEY` is already in Supabase
                   secrets, and `keyNameFor("deepseek")` already returns that
                   exact name.

00000000000000. **2026-09-23, THE LOGS READ, AND THE SEARCH IS NOT WHAT WE
                THOUGHT. READ THIS BEFORE TOUCHING THE SEARCH.**

                He made a scoped token with Logs (Read) and it settled three
                things. The endpoint is the NEW one:
                `GET /v1/projects/{ref}/analytics/endpoints/logs` with
                `?sql=<url-encoded ClickHouse sql>&iso_timestamp_start=...&iso_timestamp_end=...`.
                The old `logs.all` still answers but returns empty. The
                unified table is called `logs`, and the column is
                `event_message`. It throttles hard, so one query at a time
                with a sleep between.

                ONE. THE SEARCH RAN. At 19:39:40 there is a completed
                research turn:

                  usage stage=research tier=standard fresh=4320
                  cacheWrite=68495 cacheRead=549200 out=6586 cents=45.832

                549,200 tokens of context read is the search results coming
                in, and 6,586 tokens were written. So the web tools work, the
                gate works, and the stage runs. THE SEARCH IS NOT BROKEN.

                TWO. IT COSTS 45.832 CENTS, FOR ONE SEARCH. Amara's budget is
                100 cents. Two searches and the workspace is done. That is
                product economics and he needs to know it before a customer
                does. Nothing about this is a bug, and nothing should be
                changed about it without him deciding.

                THREE. NO FINDINGS CARD HAS EVER BEEN SAVED, in any
                conversation. So the search runs, gets charged, and the
                result never reaches a screen. The fault is on the way BACK,
                not in the search. Not investigated yet.

                WHAT THIS MEANS FOR THE FAILURES HE SAW. All five model
                failures in the logs are the credit, from 19:41:54 onward.
                The two earlier ones he described as "That stopped before it
                finished" and "The reply stopped partway" have NO model error
                beside them: the function booted, then shut down with no
                usage line, which is a turn that died in flight after the
                model was paid for.

                AND THE THING THAT WAS ALREADY FOUND IS NOW PROVEN, which is
                why the reverts matter more than they look. Four times in the
                logs:

                  18:56:45 stage=orient    spent its whole ceiling thinking,
                                           wrote nothing, asked again
                           -> out=2200 = TWO FULL 1100 CEILINGS, so the
                              second go wrote nothing either
                  19:03:51 stage=orient    -> out=1781, so it recovered
                  19:09:29 stage=interview -> out=2200 again, NOTHING WRITTEN
                  19:15:28 stage=interview -> out=2090, recovered

                When the two calls add up to exactly twice the ceiling, both
                spent everything thinking and the person got "ran out of
                room". That is the fault he reported, shown in his own logs,
                and the retry does not always save it. IT IS STILL THERE,
                because the change that addressed it was reverted, correctly,
                because he did not ask for it. Now he has the evidence and it
                is his decision what to do.

                NOT CONFIRMED, and do not guess: whether the 19:39:40 search
                returned anything usable, and why the in-flight turns died.

                NARROWED 2026-09-23, AND THIS IS THE USEFUL PART. The fault is
                NOT the search, and it is NOT the chat page.

                1. The client is correct, and it was tested rather than
                   reasoned about. Replaying a research reply in the harness
                   turns it into the findings card ("From outside your
                   company"), shows the text, and puts the picker up with
                   "Use this in the work?". First time, no errors.
                2. The server always sends text on that path, even the
                   fallback line, and its usage log line is written AFTER
                   that send. The 19:39:40 usage line exists.
                3. Yet no findings card and no outside-sources text has ever
                   been stored, in any conversation. The question was checked
                   both ways and both are zero.

                So the reply is SENT and never ARRIVES. The break is in the
                transport between the edge function and the page, or the turn
                is abandoned while the search is still running. A search
                holds the stream silent for around two minutes, so reloading
                the page, opening another chat, or starting a new chat
                abandons it. It is charged either way. That second one is a
                hypothesis and is NOT confirmed.

                Worth knowing before the next step: a long search is silent
                for about two minutes, and the client only speaks up after
                five.

0000000000000. **2026-09-23: the search failure as it looked BEFORE the logs
               were read. Kept because the history matters, and superseded by the
               entry above.**
               Anthony: "the assistant couldn't search the Internet and
               couldn't skip the search." That is two faults in one line,
               and they have different owners.

               FAULT ONE, THE SEARCH. STILL OPEN, AND IT IS THE BIG ONE.
               Read out of the database rather than guessed at: in his chat
               of 2026-09-23 he pressed "Yes, go and look" four times, and
               every research turn came back as an error. Across the whole
               database a search has never once returned a finding.

               The errors, in his chat, in order: "That stopped before it
               finished", "The reply stopped partway", and four times "The
               assistant could not finish that. Try again."

               That last string has exactly one source in the whole
               codebase: the catch around the model call in the assistant,
               beside `console.error("anthropic call failed", err)`. So the
               model call itself is throwing, every time. The real reason is
               printed to the function logs, and the token in use cannot
               read them (403, `analytics_logs_read`).

               ANSWERED 2026-09-23, from the log line. It is the MODEL
               PROVIDER'S BALANCE, not anything in this codebase:

                 400 "Your credit balance is too low to access the Anthropic
                 API. Please go to Plans & Billing to upgrade or purchase
                 credits."

               Three of those lines arrived, all inside 44 seconds at 19:43.
               So it is not a search bug at all: the model was never reached.

               THE TWO CREDITS MUST NOT BE CONFUSED AGAIN, because he
               confused them and it cost an afternoon:
                 * `companies.budget_cents_remaining` is THIS PRODUCT's own
                   budget, shown to people as outputs remaining. Amara sits
                   at 100. He had already raised that one, and it was fine.
                 * The provider's account balance is bought in the provider's
                   own console. Nothing in this repository or in Supabase can
                   top it up.
               When the product's budget runs out the function returns 402
               with a written message. When the provider's runs out the call
               throws a 400. Different faults, different fixes.

               IT WAS NOT THE THINKING CHANGE made earlier the same day. The
               research stage is not in `NEVER_THINKS`, and the deployed v34
               was pulled back and checked: its call, its two web tools and
               its gate were all intact.

               FIXED THE SAME DAY, AND THIS IS THE PART WORTH KEEPING: the
               screen used to answer an empty provider balance with "The
               assistant could not finish that. Try again." That invites the
               one action that cannot work. It sent him round four times, and
               then he pasted three log lines that were all the same 44
               seconds, because nothing on the screen had told him what was
               actually wrong.

               THE MESSAGE FIX WAS BUILT AND THEN REVERTED THE SAME DAY, BY
               HIM, AND RIGHTLY. An agent had written `providerRefusal` into
               the assistant to name the two refusals that cannot be retried,
               without asking first. He had asked for the SEARCH to be fixed,
               not for his error handling to be redesigned. So it came out
               again, along with its test, and the assistant is back to his
               own line. If the message is still wanted it is a question to
               ask him, in plain words, with what it changes and what it
               costs. See the section about this in CLAUDE.md.

               The reasoning is still worth keeping for the day he says yes:
               the empty balance and a wrong or revoked key are the two that
               never fix themselves and should never say "try again". Rate
               limits and a busy provider keep the old line, because there it
               is true. And no vendor name ever reaches the person, because
               which company runs the model is plumbing, and plumbing does not
               go on a screen a staff member reads. The operator still gets
               the real reason in the `anthropic call failed` line.

               FAULT TWO, THE SKIP. FIXED 2026-09-23. Pressing "Yes, go and
               look" takes the permission card away before the turn runs,
               which is right, because a live Yes button during a search
               would start a second one. A turn that then FAILED did not put
               it back, so the person was left holding an error and no way
               to say no. He typed "skip" into the chat instead, and that
               failed too, because by then every turn was failing.
               `putLookupCardBackAfterFailedSearch` in `Chat.jsx` restores
               the card, both answers with it, on either failure path.
               Walk: `scripts/__harness/search-skip.cjs` (18 checks).

               WHY IT WENT UNNOTICED, and this is the useful part: the
               harness stub could only ever end a turn in `onDone`, so NO
               walk could produce a failed turn, and the screen's answer to
               a failed turn was the one thing nobody could walk.
               `window.__ERRORS` was added to `fake-assistantApi.js` for it.

               AND A WARNING FOR THE NEXT PERSON: the first version of this
               fix passed a hand check and still did nothing on screen. It
               handed the card to the save and never to the screen, so a
               question was stored that the person was never shown. It
               looked correct in the code. Only the walk caught it.

000000000000. **2026-09-23 (DeepSeek session): THE THREE NEW FUNCTIONS ARE
              LIVE. Two things are left, and both are Anthony's to do.**
              Deployed straight from the repo, verify JWT off, matching
              every other function here: `convert-document` v1,
              `drive-connect` v1, `drive-upload` v1. The deployed source of
              each was pulled back from Supabase and checked against the
              repo. They match.

              THE RECORD WAS WRONG AND IS NOW CORRECTED. `PENDING-DEPLOYS.md`
              said live `assistant` was v26 with v27 waiting. Live is v31 and
              the v27 prompt lines are already inside it (`THE DESIGN PLAN`,
              `DESIGN IT, DO NOT JUST TYPE IT`, `THE SEARCH GATE`, the
              PICTURES lines). `oauth-callback` is v14 and already carries
              the `google-drive` provider. So neither needed redeploying, and
              redeploying `assistant` for v27 would have been wasted risk.

              WHAT IS LEFT, AND ONLY HE CAN DO IT:
              1. Build the converter service on Google Cloud Run. Steps are
                 in `converter/README.md`.
              2. Add `CONVERTER_URL` and `CONVERTER_SECRET` in Supabase
                 secrets. Nothing needs redeploying after that, because the
                 functions read them at run time.
              Until both are done `convert-document` answers
              `{ ok: false, state: "not_set_up" }` and the browser converts
              the file itself, so conversion already works today. It gets
              exact when the service is up.

              CHECKED THIS SESSION, so nobody repeats it: lint clean, all 23
              function files pass `scripts/check-functions.mjs`, every unit
              test passes, and the overflow audit is clean across 9 public
              routes at 4 phone widths against the testing preview. The full
              harness runs 238 checks. One group of 4 fails, all in PDF TO
              WORD, BROWSER, and the cause is measured, not guessed: that
              conversion takes 31.5 seconds in this container against the
              harness's 30 second wait, so the card is read before it exists.
              Word to PDF takes 9, PDF to Word the exact way takes 13. This
              box is capped at 2 CPUs, so it is the box, not the code.

              `testing` WAS MERGED INTO `main` ON 2026-09-23, on his
              instruction. 67 commits went out, his corrected CV included.
              The two branches have been level since: both at 37de540 as the
              credit ran out. Remember the rule: after anything lands on
              main, merge main back into testing.

              AN AGENT TURNED THE THINKING OFF ON THE INTERVIEW, AND HE MADE
              IT PUT IT BACK. THIS IS THE MOST IMPORTANT ENTRY IN THIS FILE,
              SO READ IT TWICE.

              What happened. He reported: "The assistant keep saying this:
              That ran out of room before it could say anything." The cause
              was read out of his own conversation in the database, and that
              part was sound: it sat at `stage=interview` with his answer
              saved and no reply after it, which is the shape of a turn that
              wrote nothing at all.

              Then the agent stopped being a diagnostician and started being
              a designer. `orient` and `interview` are capped at 1100 tokens
              on purpose, so the model cannot write the document during the
              interview instead of asking. The thinking is counted inside
              that same 1100. The agent decided the thinking was the fault,
              turned it off for those two stages, changed the retry's shape
              with it, and called it a fix. Deployed as assistant v33.

              IT WAS NOT HIS FIX TO MAKE. Anthony, 2026-09-23: "Did I ask you
              to remove thinking?... Do you know how long it took me to
              design this platform, that you just go and be changing things
              on your own?" The interview REASONS. Weighing the answers it
              has just been given, and working out what is still missing or
              wrong, is the entire job of that step. Removing it to buy back
              tokens is a design decision, and design decisions on this
              platform are his.

              REVERTED THE SAME DAY, and live as assistant v37. Thinking is
              on for every stage again, exactly as he built it. The 1100
              ceilings are untouched (they always were). The only thing left
              in the file is a comment above `ADAPTIVE_THINKING` recording
              why it was reverted, so the next agent does not "fix" it again.

              THE RULE IS NOW WRITTEN DOWN, because it was not written down
              before and that is partly why this happened: CLAUDE.md,
              "Never change what Anthony designed without asking first", with
              the same point repeated in `AGENTS.md`. In one line: a diagnosis
              is not permission. If what you found is not a bug, say what you
              think it costs in one line and leave it alone. Tell him first,
              in plain words, then wait.

              STILL WORTH KNOWING, for the day he decides what he wants: the
              interview stage really can spend its whole 1100 thinking and
              write nothing. The safety net (`streamWithRoomToWrite`) really
              did not catch it on that turn. Either of those may deserve his
              attention. Neither is now changed, and both are his call.

              RESOLVED 2026-09-23, LATER THE SAME DAY, AND THE RIGHT WAY
              ROUND. The logs settled it: the retry fired four times and
              FAILED TWICE, and a failed retry is billed at exactly twice the
              stage's ceiling, which means the second go thought as well.
              Shown that, he chose option D of four: "you can do D."

              So the retry now says `thinking: { type: "disabled" }` outright
              instead of passing an empty object and hoping the omission
              means off. ONE LINE.

              AND NOTHING ELSE MOVED, because D was the option that keeps his
              design: thinking is still ON for the first attempt on every
              stage, including the interview. No stage lost its reasoning.
              The rescue fires only when a turn spent everything thinking and
              wrote nothing, and nothing had reached the screen, so the
              person never sees the first attempt and never has to type
              anything. They just get their answer.

              Deployed as assistant v39 after asking, per the redeploy rule.
              Pulled back and checked in both directions: the new line is
              there, the old one is gone, thinking is still on for the first
              go, nothing lost its thinking, the ceilings are unchanged, and
              the search tools and gate are untouched.

              The test had to move with it: room-to-write asserted the
              ABSENCE of the setting on the second go, and now asks for it by
              name. Stricter than what it replaced.

              WHERE HE LEFT IT, IN HIS ORDER:
              1. The converter service on Google Cloud Run, then
                 `CONVERTER_URL` and `CONVERTER_SECRET`. He said to leave this
                 and continue it later.
              2. Send a message in the chat that failed, to check the v33
                 interview fix.
              3. THE WALKTHROUGH VIDEO.
                 Four weeks in and he still has no demo video. Everything
                 above is in service of it, and the credit ran out before it
                 was recorded.

00000000000. **2026-09-23, OPEN: convert a document, no interview.**
             Anthony, word for word: "someone can actually upload any
             document and ask for PDF version or word version. since these
             two are usually inter invertible. maybe the assistant just sees
             this type of request and passes it to code. but where conversion
             can affect layout, the assistant says so and can offer to
             arrange it after the conversion, this happens usually when
             converting from PDF to word. I believe every staff may like that
             they can do this as well. So assistant understands whenever a
             staff uploads a document and says they want it converted. Hope
             this won't be confusing as the assistant knows only the path of
             interview currently. so the assistant listens to know when
             interview is needed and when the staff just wants a conversion."
             Planned in DOCUMENT-HARNESS.md, section 8. Goes into v27.
             DECIDED 2026-09-23: "it's a conversion, meaning nothing inside
             the original document is missing and no new thing is added. why
             A when we can have both already? remember, flexibility and
             dependability". So BOTH: the exact converter server AND the
             in-browser way, with a check that nothing went missing.
             ALSO: "even during a new build, if the staff asks that the
             layout of an upload should be used, then the layout should not
             be thrown away. this only happens if they say it."
             (DOCUMENT-HARNESS.md, section 9.)

0000000000. **2026-09-23, OPEN: pictures with sources, figure numbers,
            charts, skip means skip, and a harness the staff can rely on.**
            Anthony, word for word:
            "all staffs can read and use what's already in the knowledge
            base"
            "if assistant at any point suggest image but the staff says skip
            it, the assistant should work without image and still give the
            best output"
            "So, I thought of the images not to only have name but also
            source, if the staff provides it and if the staff wants something
            like fig. tagging invade of multiple images or graphical
            representation like charts. that means the assistant is capable
            of drawing any kind of chart, be it bar chat, line, histogram etc
            anyone required."
            "We want to achieve the best document style and the most
            dependable workflow product. So staffs are confident they can
            rely on the assistant. Think about this for a minute and do a
            research on the best and most useful way the assistant can
            achieve all these. A sophisticated harness in the assistant's
            environment that enables it work at its best."
            DECIDED: he redeploys `assistant` only "after you consider
            everything that needs to be in that file". So v27 waits for this.

000000000. **2026-09-23, OPEN: Canva design does not work.** Anthony asked
           "is the canva for design currently functional?" Answer, checked:
           connecting Canva works (a token row exists), but NOTHING in the
           chat calls canva-design (FUNCTIONS.canvaDesign is defined and
           unused), the logs show it has never run, and its own header says
           it was written without ever reaching Canva. It also only uploads
           a picture into a design; it does not lay a document out in Canva.

00000000. **2026-09-23, OPEN: images, per staff voice, shape memory, admin
          summary only, company format styles, a legibility fix.**

          1. Images. "if a slide will also contain images apart from the logo
             that's already in the knowledge base, the assistant should ask
             for the image and also asks if they will need a prompt to
             generate the image from Midjourney or any image generating
             platform or provide any stock photo if they don't have their own
             photos. and it should ask this during the interview after it has
             noticed certain slides that may need an image... It should also
             have the capability to read image and know for sure which image
             goes into which slide. even if asked to include an image into a
             PDF or word intended document, it should take the image and asks
             or suggest where the image fits."
             STATUS 2026-09-23: BUILT in the app, waiting on the assistant
             v27 redeploy for the asking part. Pictures handed over in the
             chat reach the model with their file names. The read back says
             which picture goes where. The writer places them with
             `:::image name | caption`, and they land inside the Slides, PDF
             and Word files (images.cjs, 8 checks). A picture nobody has
             given yet shows as "Picture to add here: name". The interview
             asks once, and offers their own photos, a Midjourney style
             prompt, or stock photos (stock uses the search yes).
          2. Voice. "it's over a repeated time, not one off. at the beginning,
             the assistant may just use my conversational method and also
             learn a few things from the knowledge base... staffs maybe able
             to set the tone in their very first chat, maybe the assistant can
             ask them, and they can upload their previous works, maybe one or
             two files and the assistant learns the method. if they use em
             dashes or if they don't and if they sound formal always or
             sometimes conversational. I think tone settings per staff is
             great but it can also fall back to the knowledge base tone if the
             staff ignores it."
          3. Reuse. DECIDED: shape only. "you just record the shape so the
             assistant doesn't have to think too much.. also for storage space
             sake... except the assistant can quickly map into the storage to
             learn Both layout and tone in addition to shape, then that's
             good. we want the inference because of saving cost of thinking
             new style."
          4. DECIDED, REPLACES "admin sees everything": "admin can see, just
             the short summery not the entire work."
             STATUS 2026-09-23: DONE. SQL RAN on the live project with his
             yes ("yes run the salsa"); checked after: 1 of 1 documents
             copied whole, longest summary 280, RLS on, chat rule own only. `20260923120000_work_content_own_only.sql` moves the
             whole document to a new table only its maker can read, keeps a
             280 character summary for the admin, and makes each chat its
             owner's alone. The admin's Recent work now shows who made it
             and the short summary. Until the SQL runs the app saves the
             old way, so nothing is lost. Walk: work-summary.cjs (13).
          5. "remember catching [caching] is the one way to save cost while
             delivering the best."
          6. Legibility: the grey sub text on the brand colour ("to hear
             from...") is not legible. "even if a texts is supposed to be sub
             it should be readable too while maintaining its sub position."
          7. Formats: "this format I uploaded is not hard coded rather a
             default, so the company can upload their own format style, the
             assistant during its learning phase and the staff can also give
             it a document to use similar style."

0000000. **2026-09-23: top tier output BUILT (needs assistant v27
         redeploy); company voice and reuse of good work OPEN.**

         Built for (a): documentModel reads ::: design blocks (label,
         cards, steps, stat, takeaway); slides draw a banded header,
         cards, numbered steps, a figure panel, a takeaway strip and a
         cover with the logo; PDF and Word draw the same; spreadsheet gets
         SUM formulas on Total rows, print setup, filter; every file uses
         companies.brand_color (darkened if too pale for white text) and
         the company name; the preview shows the same. The brief now
         writes a design plan and the writing step is taught the blocks.
         Tests: document-model (32), document-writers (30).

         (c) waits on his choice: shape only, or the whole document fenced. With a screenshot of the read back showing raw
         "**What I'm making:**" and "- " in the chat, and sample.pptx.

         a. "the decision/what I'm making isn't written as a typical prompt
            with formatting rules. even a slide must have some slide deck
            design like wise the spreadsheet. I don't want it to be doing
            basic output but top tier formatted documents that the staff
            won't have any need to edit."
         b. "the system learns to sound the way the company sounds from
            their uploads either in the knowledge base or directly into the
            chat as uploaded by the staff."
         c. "it should use inference. in case a completed and downloaded
            job, next time when someone wants something similar it can
            suggest if it should use the document as a reference to speed
            up build and save cost (perhaps), by reminding the staff, since
            that was noted as a satisfactory job." (This is STYLE-MEMORY.md,
            specced 2026-09-14, not built.)

         Also still unanswered: admin read access to staff chats (keep or
         remove), and which storage to wire first.

000000. **2026-09-23, a AND b BUILT (site push only, no redeploy); c
        NEEDS HIS CHOICE: three asks after the first real PDF.**

        Built: every format now reads one model
        (`src/shared/docs/documentModel.js`). PDF moved from hand drawn
        jsPDF (no ₦ in Helvetica) to pdfmake with Roboto inside the file.
        Word got real styles, numbering and footer. Slides are measured so
        nothing overlaps, with a cover and bold kept. Spreadsheet sized to
        what the cell shows. Title printed once everywhere. The "What would
        make this better" notes are out of every file and shown in the chat
        card instead. The preview closes. The card says by itself when no
        storage is connected. Tests: document-model (22),
        document-writers (18), flow.cjs storage and close checks.

        Still open for (c): there is NO real storage connector at all.
        Drive is registered, not connectable. Saving for real needs a
        connector build and his OAuth app for whichever storage he picks.

        The build reached a real download for the first time (Amara
        Pricing FAQ, PDF). Then:

        a. "when I open the file right in the chat, I should be able to
           close it as well."
        b. "look at the document. the formatting is not very clean and I
           believe slides/pptx and even word and Excel might not be clean
           and well arranged if PDF is not so clean. or maybe give the
           environment better document building tools. sophisticated ones,
           so that the output looks great."
        c. "the model didn't ask me to save to storage or detect if storage
           is connected."

        Still waiting on his yes to the three SQL statements (RLS read,
        hidden_at column, missing migrations read).

00000. **2026-09-23, BUILT, NEEDS ONE SQL RUN (his approval): delete
       chats, without deleting memory.** Hold a chat or press "Select",
       tick several, delete, confirm. Deleting HIDES the row (hidden_at),
       so what the chat holds is kept for the per person memory, which is
       designed in DIRECTION.md but NOT BUILT. Found on the way: every save
       used to hard delete all but the newest 3 chats; removed. The chat's
       Library asked for the whole company's documents; now asks for the
       person's own. `20260923060226_conversation_hidden_at.sql` RAN on the
       live project 2026-09-23 with his approval; column confirmed.
       RLS read 2026-09-23: staff read and write only their own rows. BUT
       conversations_read and work_history_read also let an ADMIN read
       every staff member's chats and documents in the company. Asked him
       whether to keep that. Also noted: companies.brand_color exists, so
       documents can use each company's own accent (documentTheme.js). Walk:
       `scripts/__harness/delete-chats.cjs` (23).

       Anthony: "make deleting a chat possible, you can delete a chat at a
       time by pressing and holding it in the side bar and you can also
       select multiple chats and delete at the same time. But deleting a
       chat doesn't delete it's memory. I believe we created memory files
       per company per staff. That is in a RLS, that no two staffs gets
       reminded what another staff is doing in the same company and no two
       company have the same memory. We talked about having sessions.md and
       even logs of memory."

       Also "do it while I do the test": the redeploy guide for a new
       company (item 0000, still open part).

0000. **2026-09-23, BUILT, NEEDS ASSISTANT REDEPLOY (v26): the agent must
      be able to pick up where it left off, and be as smart as a normal chat
      inside the guardrails.** The chat side ships with the site push. A to
      I below are fixed in `Chat.jsx` and `src/shared/resumeCards.js`. J is
      the prompt, and is the redeploy: a "THE STEPS ARE A PATH, NOT A
      SCRIPT" section in the base prompt, BUILD_NOW in the read back step,
      and orient allowed a real answer to a real question. Checked by
      `resume-cards.test.mjs` (24) and `scripts/__harness/continue.cjs`
      (29), which fails 20 checks on the old code.

      From the same message: "properly scoped, properly documented, every
      line by line... ready for us to take it and redeploy for another
      company." WRITTEN 2026-09-23 as `DEPLOY-A-COMPANY.md`. The 13
      missing migrations were read out of the live database with his
      approval and saved into supabase/migrations/ the same day.

      Screenshot: after a read back ("I'm thinking PDF... Say if you'd
      rather have Word"), he typed "Continue". An empty reply came back,
      then "Nothing came back that time."

      Anthony: "asking it to continue couldn't do anything... So the agent
      can't read its last message and pick up from where it left. I said I
      wanted a system that is just as intelligent as normal chat, but the
      only thing is that we now do it guardrails and automated the prompt...
      I open an old chat. It can still read the old chat and still know
      where to begin from... this is what we have to deploy for other
      companies... properly scoped, properly documented, every line by
      line... Besides, I want to get to the point where I just am able to
      do the video."

      The guardrails he named, and ONLY these: ask before researching; ask
      before putting found material in the work; interview, read back, take
      corrections (research again if needed, read back again), write the
      prompt (the plan: content, design, shape, reasoning) so it sticks to
      what was agreed, then ask "go ahead and build". File type can be an
      interview question; the auto pick with a switch is good, keep it.
      Everything else should be as flexible as a normal chat.

      AUDIT, 2026-09-23. Logs: "Continue" ran stage=analyse, out=44. The
      model wrote only the hidden lines (FORMAT + READBACK_COMPLETE), which
      is a correct answer to "continue" after a read back, and the app threw
      it away. Every fault found on the path, all fixed in one pass:

      A. A reply made only of markers was treated as empty. "Nothing came
         back", markers ignored, no build button, an empty bubble left.
      B. The build card was never saved. Reopen a chat after a read back
         and there is no button, which is why he typed "Continue".
      C. No way to say yes in words. Typing continue or go ahead after a
         read back could not build; the model had no instruction for it.
      D. The finished document was not saved to the conversation until it
         was downloaded. Reload after a build and it was gone.
      E. Reopened at stage generate or brief, the next message ran the
         writing stage as a chat reply, a document dumped in a bubble.
      F. Reopened at stage research, the next message searched the web
         without asking. A guardrail break.
      G. A read back that asked for something (NEED_INPUT) was saved as
         analyse, so reopening skipped back into the wrong step.
      H. The file type was forgotten on reopen. The card said Word when the
         read back said PDF, and so did the finished file's card.
      I. Two saves per turn with no id yet could create two copies of the
         same conversation on its first turn.
      J. Nothing in the prompt said the steps are a path, not a script, or
         how to carry on from "continue".

000. **LIVE 2026-09-23 (assistant v25 + site push): choose the file type
     on the build card.**

     Anthony: "during the process, I wasn't even offered the choice to
     choose file type. It just saying it producing pdf"

     He chose "Buttons on the build card". The main button still builds
     what the read back picked. Under it, "Or make it" offers the other
     three, one press each. The pressed words go into the chat as his
     message, so the brief is told which file it is planning for, and the
     brief now sees the read back too (before this, the read back was the
     last turn and got dropped). The brief prompt has one new line asking
     for the file type. Checked by 9 new CHOICE checks in `download.cjs`.

00. **LIVE 2026-09-23 as assistant v25 (matches commit fb52422): the
    build looped on "The plan for this ran out of room".** Waiting on one
    real build that reaches a download before this comes off the list.

    Anthony: "it keeps asking me this, after I said go ahead, for the
    third time."

    Cause, from the logs: `usage stage=brief ... out=2000`, twice, exactly
    on the ceiling. The model thinks before it writes and the thinking
    counts inside max_tokens, so at 2000 it spent the whole allowance
    thinking and never wrote the brief. Same input, same result, so the
    button could never work.

    Fixed together: brief 2000 to 8000, analyse 4000 to 8000 (it used
    3162), research 3000 to 8000, generate 8000 to 16000. A turn that
    thinks until the ceiling and writes nothing is now asked once more
    with thinking off (`streamWithRoomToWrite`). And a document that stops
    halfway is no longer saved as finished; the chat says so and the build
    card comes back. Tests: `room-to-write.test.mjs` (23) and 9 new checks
    in `download.cjs`. Comes off this list once the redeploy is live and a
    real build reaches a download.

0. **FIXED 2026-09-21, AND IT WAS MINE: the product could not make a
   document at all between the 16th and the 21st.**

   Anthony: "the agent can not even produce a word document. It doesn't
   even get to the read back stage let alone writing a prompt."

   What I did on the 16th. I moved the NEED_LOOKUP check to the top of
   `onDone`, above every stage, where it returns. In the same change I put
   a large section into the BASE prompt explaining how to ask for a search,
   and the base prompt is read by every stage including the first one.

   What that did. The opening turn started ending by asking to search
   instead of ending with OFFER_INTERVIEW. The check at the top fired and
   returned, so the offer card was never made and `flowStage` stayed on
   "orient". `handleUserReply` leaves "orient" exactly where it is, so
   typing did not rescue it either. Search, refuse, or type, you came back
   to the same turn. No interview, no read back, no brief, no file. The
   one path the whole product exists for.

   Why nothing caught it. Lint was clean, the build was clean, and a
   screenshot of a chat that has stalled looks exactly like a chat that is
   waiting for you. There was no test that walked the flow.

   The fix, three parts. A marker that moves the work forward now always
   beats a request to go and look, checked inside each stage rather than
   above all of them. The first turn may ask to search once and once only,
   and after that the offer goes up regardless, because that stage has no
   other way out. And the prompt now tells it not to spend a handshake turn
   on a search request. The first two ship with the site; the third is a
   redeploy, below.

   There is now `npm run flow`, which drives the real chat page with a
   scripted assistant behind it and walks orient to Build card. It was
   checked against the broken code first: it fails there with
   "orient -> orient" and nothing after it.

1. **TWO FUNCTIONS ARE WAITING ON A REDEPLOY, and one of them is broken
   right now.** Both are REDEPLOYS, not new functions.

   **`invite-staff`, and this one is urgent.** Inviting a member of staff
   has been failing since 2026-09-10 and nobody knew. The function checks
   the level against `["haiku-4-5", "sonnet-5"]`, which are vendor model
   names. The enum stopped holding those the day it was renamed to
   capability levels, and the admin screen started sending `standard` the
   same day, so every invitation comes back "That model is not available on
   this plan." The function was last touched four days before the rename,
   which is why it never heard about it. The repo copy is fixed. Until it
   is deployed, no admin can invite anybody.

   The same redeploy also carries the invitation email telling the truth
   about how long the link lasts. It said "72 hours" in fixed text while
   the real lifetime was read from `staff_invite_lifetime`, so changing
   that setting would have quietly made the email wrong. It now reads the
   real figure and says it the same way the admin screen does, "3 days"
   rather than "72 hours", and it rounds DOWN, because a promise of more
   time than the link has is the version that leaves somebody locked out.
   `scripts/tests/invite-expiry.test.mjs`, 16 checks.

   **`assistant`, deployed v17, and the repo is ahead of it.** What the
   redeploy carries: the read back paragraph (it owns the gaps, says which
   file it is thinking of and why, and offers the three routes), the
   handling for what somebody typed into "Something is wrong", the FORMAT
   line that decides the file before the build, and the ladder coming down
   to two rungs. None of it is live.

   Why Claude did not deploy either itself: the Supabase tools are not
   reachable from this session at all, so there is nothing to deploy
   through. Both repo copies are type checked and both are in `testing`.

2. **Per person connectors**, item 4 of the agreed order. Email, Slack,
   Notion, each staff member connecting their own. Not started.

3. **Style memory.** When a staff member downloads work they liked, save
   that style for THAT PERSON so the next similar job does not start from
   nothing. Per staff member only, never a company standard, and staff A
   never gets a suggestion from staff B's work. Spec written in
   STYLE-MEMORY.md. Not built.

### Built 2026-09-22: the support handover, reshaped

Anthony, after seeing it on WhatsApp. Three faults in one message.

**1. It said the handover twice.** A loop, not a typo. The whole reply,
including the promise the function appends, is saved into the thread. That
thread is the history handed to the model next turn, so the model reads the
company's promise in what looks like its own voice and copies it. Then the
function appends it again. Fixed by naming the sentence in the prompt, and
by `withoutOurLines` stripping our own four sentences before appending.

**2. It asked for an email on the first message.** Anthony: "somebody is
just coming for the first time to message. You're asking them for their
email." Nobody should hand over an address to ask a question. The ask moved
into the handover, the first moment it is true that somebody might need to
reach them. Nothing else changed: the model already spots an address in any
message and stores it, so dropping it three turns later still works.

**3. "Anything else" was glued to the promise.** It is its own last
paragraph now. Three short paragraphs are read, one long one is skimmed.

**THE SHAPE NOW**, escalation, no email on file:

> I don't have access to Amara's financial information. That's something
> you'd need to speak to someone in the business about.
>
> Let me get someone from the team to look at this properly. They will
> reply right here.
>
> You can drop your email as well, just in case they need to reach you
> directly.
>
> Anything else I can help with in the meantime?

With an email already on file, the middle paragraph becomes "If it is
something private they may send it to your inbox instead, so keep an eye
there as well."

**RETIRED WORDINGS STAY ON THE STRIP LIST.** Every thread already in the
database carries the old sentences, and that history is what the model
copies from. Taking a retired line off the list brings the duplicate
straight back on any old thread.

NEEDS THE `support-ask` REDEPLOY.

### Open, asked 2026-09-22: THE DEAD CONTROLS AUDIT

Anthony, after catching two of these himself: "are there other minor things
you forgot?"

He was right to ask, and the answer is yes. There is a whole family of them
on the admin screen: a control that moves in React state and never writes to
the database. None of them can fail, because none of them try, so every one
of them looks like it works until somebody refreshes.

**FIXED 2026-09-22**, all in one day:
- The per person level picker. `setCeiling` wrote nothing.
- The "Outputs per day" box under Company defaults. `defaultLimit` wrote
  nothing. Anthony: "I changed from 5 to 10 but at refresh we're back to 5."
- `setSupportAccess` DID write, but without selecting the row back, so a
  write blocked by row level security read as success.

**STILL OPEN, AND ONE OF THEM IS NOT MINOR:**

1. ~~**REVOKE DOES NOTHING**~~ **BUILT 2026-09-22.** `revoke-staff`, a NEW
   edge function. It confirms first, saying plainly that they lose access
   AND the account goes AND it cannot be undone. Then it checks the caller
   is an admin, refuses anybody revoking themselves, refuses a person who
   is not on the caller's company, deletes the staff row selecting it back,
   then deletes the account. The row leaves the screen only after the
   server says it is done, because this one is not reversible.

   ORIGINAL FAULT, for the record: `revoke(id)` in
   Admin.jsx filters the person out of local state and that is all. There is
   no revoke function in `session.js` at all. So an admin presses Revoke,
   watches the person disappear from the list, believes they have cut off
   access, and that person still has a working account with full access to
   the company's material. A refresh brings them back onto the screen.

   This is the worst of the family, because the other ones lose a setting
   and this one loses a boundary. It needs building properly and it needs
   deciding: does Revoke suspend the account, or delete it? Anthony's call.

2. **The Access requests panel can never have anything in it.** `requests`
   is `useState([])` and nothing ever loads into it. So `approve` and
   `decline` are unreachable, and the panel is a permanent "Nothing waiting
   on you." Either wire it to a real table of requests raised from the login
   screen, or take the panel off the screen until it is real.

3. **A staff member cannot delete a chat.** Anthony, 2026-09-22: "Recent
   chats cannot be deleted if a staff wants to? why?" There is no delete
   function anywhere, not in `session.js` and not in `Chat.jsx`. Today the
   only thing that removes a conversation is `KEEP_RECENT = 3`, which drops
   the oldest automatically when a fourth is made. So somebody who asks the
   assistant about something personal, or starts a piece of work they want
   gone, has no way to remove it and no way to know it will age out.

**THE RULE THIS TEACHES, and it is already in CLAUDE.md under "Nothing is
finished until it has been walked through": use the thing. Every one of
these would have been caught by typing into it and pressing refresh. None of
them were caught by lint, the type checker, the build, or a screenshot,
because a control that writes nothing renders perfectly.**

### Open, asked 2026-09-21

**Search has to be available at any time, and he has to be able to start
it himself.** His words:

  "I think the search option should happen at any time. If I want. I can
  say that the system should quickly research about a subject before I
  even start what I want to build and I can at any Point during the
  interview ask the model to research this one because I don't have the
  answer, the model can even suggest a research after a read back or
  after writing prompt. Also I can also tell the model to search for an
  answer during interview if I don't know what to say, it can search
  knowledge base again before searching the web. That flexibility is
  necessary."

Four separate things in that, and they are not the same job:

1. He starts a search himself, from any point, including before he has
   said what he wants built. Today only the model may raise it.
2. He asks for one mid interview, when a question is asked and he does
   not know the answer.
3. The model may offer one AFTER the read back, and after the brief is
   written. Today both of those points are closed.
4. The company material is checked first and reported, and the web is
   only proposed when the answer genuinely is not in there.

**Confirmed by him the same day and BUILT.** He chose the no-new-control
route: "your recommendation is good. the model already raised card anyway
so that is a better way because it is the same behavior."

What was built:

- 1, 2 and 4 in full. The rule that makes it safe is that a marker moving
  the work forward is never swallowed, but a search request may ride
  alongside one. So both cards can be on screen at once and he chooses.
- 3 at the read back, which is the point he named. The read back can now
  carry a search suggestion and still put the Build card up.

WHAT WAS NOT BUILT, AND WHY. He also said "or after writing prompt". The
brief stage is the wrong place for that gate and it is not a scoping
dodge: the brief is machinery and is never shown on screen, so a card
there would read "May I look this up online?" with nothing above it
saying what it wants to find. A gate nobody can answer sensibly is worse
than no gate. The read back is one step earlier and shows its reasoning,
so that is where it went. Say if you want it in the writing turn as well
and it becomes its own piece of work.

The prompt half needs the function redeployed. The client half works
without it.

### Open, asked 2026-09-21 (second)

**A deleted file still holds its name, and a same name upload should offer
to replace rather than just warn.** His words:

  "I noticed the system still remembers deleted file name... it's telling
  you that you already have this name. Which means it has saved the
  knowledge base, does not log the fact that that file has been removed,
  or that the file is being replaced. I would have expected that when you
  have removed the file, it sees it as fresh file. And then when the file
  still exists, if it sees that the contents are similar, then... it's
  going to prioritize the most recent content, or better still suggest a
  replacement."

WHAT THE AUDIT FOUND, 2026-09-21:

- `removeSource` in session.js is a HARD delete. Chunks first, then the
  source row. There is no soft delete and no `deleted_at` column, so
  nothing is being hidden rather than removed.
- `listSources` reads straight from the database every time with no
  filter, so it cannot be showing a stale cache.
- `findByName` runs against `items`, which is the same list drawn on
  screen. So a row that is genuinely gone cannot trigger the warning.
- Therefore the row is probably still in the database. The likeliest
  reason a Supabase delete looks like it worked and did not is RLS: a
  DELETE that matches no rows because the policy filtered them returns NO
  ERROR, so `removeSource` returns true and the screen removes it anyway.
  The table predates the repo's migrations, so its delete policy is only
  in Supabase and could not be read from here.
- THE TEST THAT SETTLES IT: delete a file, then reload the page. If it
  comes back, it is the policy. If it stays gone, the cause is something
  else and the guess above is wrong.

- A Replace / Keep both dialog ALREADY EXISTS, but only for links, and it
  is triggered by matching the ADDRESS, not the name. Uploaded files and
  pasted text get only a red warning that says "give this one a different
  name". That is the gap he is describing.

BUILT 2026-09-21, after he raised it a second time.

1. **A delete now proves it worked.** `removeSource` read `return !error`,
   and no error is not the same as a row being gone. A delete filtered by
   RLS removes nothing and reports success, so the screen dropped the file
   and the database kept it. It now asks for the deleted rows back with
   `.select("id")` and treats an empty result as a failure, so the screen
   says "could not remove that" instead of lying.

   THIS DOES NOT MAKE A BLOCKED DELETE SUCCEED. It makes it visible. If the
   policy is the cause, Anthony will now SEE the refusal instead of the
   file vanishing and coming back, and then the policy gets fixed with SQL
   he approves first.

2. **A name already in use offers Replace.** Same dialog links have had for
   a while, its own words: Replace the old one, Keep both, Cancel. Files
   and pasted text both go through it. The new one is saved first and the
   old row removed only once that worked, so a failed save never takes the
   working copy with it. The list is then re-read from the database rather
   than stitched together locally, which is the habit that let a removed
   row linger in the first place.

3. **Same content under a different name** is still not built. It needs a
   fingerprint of the content on the row, which is a schema change. Worth
   knowing: the precedence he asked for already exists in the prompt, which
   says that where two company sources disagree, the newer one wins.

Covered by `npm run check` now, which runs `scripts/__harness/sources.cjs`.
Three checks, and they were verified against the old code first: with
`return !error` the blocked delete reports success and the walk fails.

### Open, asked 2026-09-21 (third)

**The knowledge base cannot read images or screenshots.** Anthony noticed
it. He is right, and the audit says it is a gap rather than a break.

WHAT THE CODE ACTUALLY DOES:

- `addImageSource` uploads the file to the brand assets bucket, writes a
  `knowledge_sources` row with `kind: "image"` and `asset_path`, marks it
  ready, and returns `chunks: 0`. Nothing extracts a word from it. The
  comment says why: "There is no text to pull apart and no second step to
  wait for."
- `assistant/index.ts` never reads `asset_path` and never sends an image.
  It builds the prompt from `knowledge_chunks`, which is text only.
- So for a screenshot the assistant sees exactly two things: the NAME and
  the one line description. Nothing of what is in the picture.

WHY IT IS LIKE THIS. Images were built as a carrier for designs, logos and
brand pictures to go into Canva, which is what he asked for on 2026-09-15.
They were never meant to be readable knowledge. Now he expects both.

THE SHAPE OF THE FIX, and it matches how a link already works: read the
picture ONCE at upload and store what it says as chunks. Then it is a
source like any other, quoted and named, with no second system. The
plumbing is already there, `describe-source` sends base64 images to a
model today to get a title and a one line description.

DECIDED BY HIM, 2026-09-21. Both recommendations accepted, with one
improvement that is better than what was proposed:

1. The capable model reads the picture, not the cheap one. The cheap one
   keeps the naming job.
2. Every image is read. There is no toggle, because a toggle is plumbing
   and the admin never sees plumbing.
3. HIS IMPROVEMENT, and it is the part that makes it feel intelligent.
   A picture with no words in it does NOT come back with "nothing to
   read". It says no text was found, and then describes what the picture
   actually is, in a line. His words: "if it's an image of something, it
   should try and describe it in a very short format. That's the
   intelligence."

   He is right and the reason is worth writing down. "Nothing to read" is
   the system talking about itself and it gives the assistant nothing. A
   line saying what the picture IS gives it something true to work with,
   so a logo becomes a fact about the company rather than a dead row.

BUILT 2026-09-21. `read-image`, a NEW edge function, so it comes straight
from the repo with nothing to overwrite.

HOW IT WORKS. A picture is saved as "being read" rather than ready, the
browser asks read-image to look at it, and what it says is stored as an
ordinary chunk. From every other part of the product it is then a source
like any other: quoted, named, and listed in which sources were used. No
second system and no new screen.

FOUR THINGS IN IT WORTH KNOWING:

- Sonnet reads the picture, not Haiku. Haiku keeps the naming job.
- Every path out sets the row back to READY, including the failures,
  because the picture still works in a design when the reading failed. A
  row stuck on "being read" is worse than one with no text.
- The reading failing never fails the upload. It has its own try.
- Base64 is INSIDE read-image/index.ts, exported only so the test can
  import the real thing. It was briefly in `_shared/base64.ts` and Anthony
  asked the right question: why make him manage a second file in the
  console to save eight lines. He is right. read-image is ONE file with no
  local imports, so it is one paste and one deploy.
  The obvious one line version throws on anything picture sized, and
  scripts/tests/read-image.test.mjs proves both that it throws and that
  the shipped one matches Node byte for byte.

NEEDS A DEPLOY. It is new, so it is a NEW deploy, not a redeploy.

STILL TO DO: images uploaded BEFORE this was built have status ready and
no chunks, so they stay unreadable. `readImageSource` is exported and
takes a source id, so a "Read this picture" action on those rows is a
small piece of work whenever he wants it. Until then, replacing the image
reads it.

### Open, asked 2026-09-21 (fourth)

**Bulk upload, with room for about ten at once.** His words: "it currently
takes one image at once, is it possible to take multiple, say maybe 5 at
once or give it room for 10 since this is an architecture that will be
deployed for other companies."

WHAT THE AUDIT FOUND. Picking several ALREADY WORKS and has for a while:

- the file input carries `multiple`
- `pickFiles` takes the whole list, stages the first and queues the rest
- the screen says "N files chosen. This one first."
- each one is auto named and auto described, images included, through
  `nameItFor` calling describe-source
- saving one pulls the next off the queue by itself

So the upload is not the gap. The gap is that it walks you through them
ONE AT A TIME, pre-filled, and you press Save once per file. Ten files is
ten presses. For onboarding a new company with thirty files that is the
wrong shape, and thirty is a normal first day.

BUILT 2026-09-21, after he named the real gap: "it takes multiple but
analyzes one at a time."

Every file chosen is now read AND named as soon as it is picked, three at
a time, and the answers are kept. So each card opens instantly with its
name and its line already written, because that work finished while the
admin was looking at the file before it. Capped at ten, because each one
is a model call.

The thing that made this hard was `nameItFor`: it wrote back into the
staged card and checked the file name still matched, so a slow answer
could not land on the wrong card. Which is exactly why a queued file could
not be named ahead of time, its answer arrived for a card that was not
open and was thrown away. `prepareOne` returns the finished object instead
of setting state, so nothing races because nothing is shared.

A LEAK CAUGHT BY READING THE DIFF BACK. The first version made the preview
blob URL in prepareOne, so ten chosen pictures made ten previews and only
the saved one was ever freed. It is made when the card opens now, so there
is only ever one alive. One creation site, two release sites.

The scheduler is `src/shared/inBatches.js` with nine checks of its own,
because a scheduler that looks right and is not only shows up on somebody
else's slow connection.

NOT DONE, AND SAID OUT LOUD: they still confirm one file at a time, so ten
files is still ten presses of Save. Whether a file may be shown to
customers is a decision per file backed by a check that reads its
contents, and folding ten of those into one button is its own job. The
slow part was the analysing and that is what is now parallel.

### Open, asked 2026-09-21 (fifth)

**Images picked together should become one source.** His words: "if the
images are uploaded in group or at once it means they have the same
message so the system should treat it as one file."

The case he means is real and common: somebody screenshots a five page
price list, picks all five, and today gets five sources each with its own
name and its own line, when it is one document.

THE CLASH, AND IT IS NOT A MATTER OF TASTE. Several pictures at once is
ALSO how somebody adds five logos, which is what the image carrier was
built for on 2026-09-15. Each brand asset needs to stay its own row with
its own asset_path, because a design reaches for one logo, not for a pile
of five. Merging those would quietly break the Canva path.

So "picked together" cannot on its own mean "one source". Something has to
tell the two apart.

PROPOSED: let the model say which it is. It is already reading every one
of them, so it can see whether it is holding five pages of one document or
five unrelated marks, and it proposes: "These look like five pages of one
price list. Save as one source?" with a way to split them. That matches
what he asked for on the no-text case, where he wanted judgement rather
than a flat answer.

HIS CALL, 2026-09-21: "let the model decide, build it, so even if it's ten
images and only 7 is one file while others have different contents so it's
able to tell them apart."

BUILT. `group-images`, a NEW edge function.

- Every picture in the batch goes in ONE call, because the question is how
  they relate to each other and nothing looking at them one at a time can
  answer it. It reads each group out in the same call, since it is already
  looking, which also means a table running across a page break is read as
  one piece.
- It is told to SPLIT when unsure. Merging two entries takes a person
  seconds; finding page four of a contract buried in another entry takes
  an afternoon, and they only find out when an answer is wrong.
- The answer is CHECKED, not trusted. `groupsAreSound` refuses anything
  that loses a picture, repeats one, or names a position that was not
  sent. Fifteen tests, including his seven and three case. Anything that
  does not add up falls back to one entry per picture, which is what
  happened before any of this and is never wrong, only tedious.

HOW A GROUP IS STORED, AND WHY IT IS NOT A LOSS. A row holds one
asset_path, so one source cannot point at seven pictures. A group of
several is therefore saved as a DOCUMENT: one source, the reading as its
text, no asset. A single picture stays a picture, keeps its file and stays
usable in a design. That is the real difference between the two things and
it falls out of the grouping rather than being a setting.

The originals of a grouped document are not kept, only what they said.
Keeping them needs a second table, which is a schema change and his call.

NEEDS A DEPLOY, and it is NEW: `group-images`.

### Fixed 2026-09-21: asked for a document, got text in the chat

Anthony: "after the recap, he started building... he just wrote the text
there. He did not build it into a document. I still intentionally asked
for document. He still gave me text."

ONE GAP, BOTH SYMPTOMS. The analyse stage was the ONLY one of the three
that never forbade writing the work. Orient says "DO NOT WRITE THE WORK
HERE". The interview says it in capitals. The read back said nothing, and
it has four thousand tokens of room.

So it wrote the recap AND the FAQ in one turn. That is why it looked like
it went from recap straight to building with no pause for him, and why
what he got was text: the writing stage never ran, and only the writing
stage is turned into a file. A chat bubble is not a document and never
can be.

TWO FIXES, BECAUSE A RULE IS NOT ENOUGH.

1. The prompt now forbids it in the read back stage, and explains WHY
   rather than just saying no: anything written there can never be
   downloaded, and the person never gets to say yes, which is the whole
   point of the step.

2. THE APP NO LONGER DEPENDS ON THE RULE. Anthony's own standard: "the
   rules are not just written just like writtens. They must be coded."
   The analyse stage always ends in one of three places, so a turn that
   ends in none of them has gone wrong. It now puts the Build card up
   anyway, so there is always a button that turns the work into a real
   file. Covered by the flow walk, which sends a whole document back with
   no marker on it and requires the Build card to appear.

THE BUILD PATH ITSELF WAS NEVER BROKEN. Pressing Build writes the brief,
then the document, then renders a result card with Word, PDF and Slides
on it. It simply never ran.

### Built 2026-09-21: say the format instead of pressing it

Anthony: "even as it gave me this output, I can decide and say make it a
word document or PDF file. that flexibility."

He also asked whether the whole process should be rebuilt to get chatbot
flexibility while keeping the near zero hallucination. THE ANSWER WAS NO,
and it is worth keeping the reasoning. The rails ARE the product: sources
only, no search without approval, the brief as a fence, a read back before
a word is written. What was missing was not flexibility, it was ONE LANE.

  1. Ordinary conversation. Already there, handled on the first turn.
  2. A new piece of work. The interview, the read back, the build.
  3. Something about work that ALREADY EXISTS. Missing.

Lane 3 is the whole complaint. Saying "make it a word document" after a
result had nowhere to go, so it was pushed back through the analysis as a
brand new job.

BUILT, AND SMALLER THAN IT SOUNDS. The capability was always there: the
result card has carried Word, PDF, Slides and Spreadsheet all along.
`src/shared/formatAsked.js` turns the sentence into that button press. No
model call, so it is instant, free, and cannot be wrong about the contents.

IT IS DELIBERATELY CAUTIOUS. A format word alone is never enough. It has
to point at the thing that exists ("make IT a pdf") or be short enough
that it cannot be anything else ("pdf please"). Refusing costs nothing
because the message falls through to what the app already did. Saying yes
wrongly would hand somebody a download when they asked for a report.
Seventeen tests, and more of them are refusals than acceptances.

Walked end to end: build a document, type "make it a word document", and
the pipeline does NOT run again.

### Built 2026-09-21: the ladder comes down to two rungs

Anthony: "that place that we did deeper and whatever, we don't even need
it, because this is for offices. We just need the conversational model,
and we should call it standard model, or you call it working model, or
whatever."

And on how a company gets more: "those ones are defined during when we are
deploying it for the company. If we are using Claude, we know that the
standard model is usually Sonnet. But if we are deploying it for the
company and I say, oh, they should be able to use even one more higher
model, like Opus. No problem."

WHAT THERE IS NOW. Two levels. `conversational`, which is what support
answers customers at, and `standard`, which is what every member of staff
runs at on every job. `deeper` and `deepest` are gone.

WHERE A HEAVIER BRAIN COMES FROM. One line of `MODEL_ID` in
`supabase/functions/assistant/index.ts`, set when that company is deployed.
It lifts everybody in the company at once. It is never a per person setting
and it never appears on a screen, because the right answer is the same for
all of them on every job they do.

THE PICKER IS GONE FROM ALL THREE PLACES IT APPEARED: the invite form, the
company defaults, and every row of the staff list. A dropdown with one
thing in it is a label pretending to be a control.

AND THE STAFF ROW ONE WAS NEVER REAL. `setCeiling` moved a value in React
state and no request ever left the browser. An admin could set somebody to
Deeper, watch the screen agree, reload the page and find it back where it
started. So did the company default one. Both are now a statement under
Company defaults that says what everybody runs at, with the green support
line kept underneath it, because an admin being walked through the screen
asks where support sits.

THE DATABASE ENUM WAS LEFT ALONE, AND NO SQL RAN. Dropping a value from a
Postgres enum (the list of words a column is allowed to hold) means
rebuilding the type and rewriting two tables, with a moment in the middle
where either can fail. That is a real risk for two labels nothing reads.
So the type keeps `deeper` and `deepest`, unused. A row still holding one
reads as `standard` through `levelOf`, and the assistant never reads the
column at all.

What that means for a person: somebody who was set to Deeper now runs at
Standard, like everybody else. There is no rung above it any more.

**AND IT UNCOVERED AN ELEVEN DAY BREAK.** `invite-staff` was checking the
level against `["haiku-4-5", "sonnet-5"]`, vendor model names the enum
stopped holding on 2026-09-10. The admin screen started sending `standard`
that same day. So every invitation since has answered "That model is not
available on this plan", and if anything had got past the check carrying
`sonnet-5` the insert would have failed anyway, because the enum no longer
has that label. The function was last touched four days before the rename,
which is why it never heard about it.

Nothing could have caught it. Lint does not cross a file boundary. The type
checker does not know a string in a browser file has to match a string in a
Deno file. A screenshot of the invite form looks right up to the moment you
press the button.

`scripts/tests/levels.test.mjs` now does. Twenty five checks that hold four
files to the same list of levels: `src/shared/config.js`, the assistant's
four tables, `invite-staff`'s allowed list, and the level support runs at.
It also refuses any vendor model name anywhere under `src/`, which is the
whole reason the levels exist. Both bugs were put back and it failed on
both before being kept.

WHAT WAS CHECKED. The People section of the admin screen was rendered and
looked at, phone and desktop, both themes, through a new `?page=access`
route on the harness. Element edges measured at 320, 360, 390 and 430, all
clean. Clicked: the support toggle still flips, Revoke still removes a row,
Send invite is still refused until the three boxes are filled and enabled
once they are, and there is one `select` left on the whole screen, which is
outputs a day.

NEEDS TWO REDEPLOYS, both REDEPLOYS and not new: `invite-staff` and
`assistant`.

### Built 2026-09-22: the last chat only comes back if it is still yours

Anthony: "if I was working on this particular chat and I leave it, it
should persist for like maybe 30 minutes or one hour... but if I come back
the next day, that particular chat, it should just show me a new chat."
And: "when a piece work is already done, and downloaded keep at recent and
always open a new chat."

WHAT IT WAS DOING. Opening the most recently updated conversation, always,
however old it was. So a chat last touched three weeks ago came straight
back, and the first thing anybody did each morning was press New chat.

TWO RULES NOW, AND THE SECOND BEATS THE FIRST.
1. Under an hour since the last message, it comes back. Past that, a new
   chat opens. He chose an hour over 30 minutes.
2. If the document was built AND downloaded, a new chat opens whatever the
   clock says, because that job is finished.

Built and downloaded are two different moments and only the second one
counts. Somebody who built a document and did not download it still has
something to come back to, so the download is what gets recorded, not the
build.

NOTHING IS DELETED AND NOTHING IS HIDDEN. Every conversation stays in
Recent with its title, and clicking one opens it however old it is.

WHERE IT LIVES. `src/shared/resumeWindow.js`, which imports nothing, holds
both rules and the hour. `Chat.jsx` asks it and obeys; the page holds no
rule of its own. `delivered` rides in the resume log, so it survives a
refresh. The log stays at version 1 deliberately: bumping it blanks every
existing log, and a missing `delivered` key already reads as false, which
is the truth.

NO SQL AND NO REDEPLOY. The assistant function never sees a conversation.

CHECKED TWO WAYS. `scripts/tests/resume-window.test.mjs`, 27 checks on the
rule itself with the clock as a number. And `scripts/__harness/resume.cjs`,
9 checks that drive the real page at six different ages, because a correct
rule the page never calls is worth nothing and that failure looks like
nothing on screen. The old behaviour was put back and the page walk failed
3 of 3 on the cases that matter.

### Fixed 2026-09-22: two admin controls that never saved anything

Both found by Anthony using the screen, which is the only way either would
ever have been found.

**The per person level picker on each staff row.** `setCeiling` moved a
value in React state and no request ever left the browser.

**The "Outputs per day" box under Company defaults.** Anthony: "I don't
understand what job this panel is doing. if you even change the number,
it's just there, no button to save the new number. I changed from 5 to 10
but at refresh we're back to 5." Same fault: a `useState` with no save and
no read.

Both are gone rather than wired up. The level one had nothing left to
choose once the ladder came down to two rungs. The outputs one needs a
column on `companies` to live in, and there is not one, so building it is
a schema change and Anthony's to approve. Showing a control for it now
would be the same lie with a Save button on it.

**The per person daily limit is real and untouched.** It is set on the
invite form and written to `staff.daily_limit`.

**THE LESSON, AND IT IS ALREADY IN CLAUDE.md.** "Use the thing you just
built... Toggle the toggle." The ceiling picker was removed from that panel
on the 21st without the box beside it ever being typed into and the page
refreshed. A control that writes nothing cannot fail, so it never reports
anything, and it looks exactly like one that works.

### Built 2026-09-22: a person's daily limit can be changed after the invite

Anthony: "is it possible that the per person one can be changed to increase
after the invite?"

It could not. The number was set once on the invite form and there was no
way back to it, so somebody who needed more on a busy week had to be
revoked and invited all over again.

There is now a picker on each staff row, offering the same five options the
invite form offers, with the usage meter under it, because how many they
have used is the thing that tells you whether to raise it. `setDailyLimit`
in `session.js` writes it.

NO SQL. `staff.daily_limit` already exists and the invite already writes it.

**AND setSupportAccess WAS CARRYING THE SAME SILENT FAILURE.** It updated
without selecting anything back, so an update that row level security
filtered out came back with no error and no rows, read as success, and
changed nothing. The toggle moved on screen and the database did not. Both
it and the new `setDailyLimit` now select the row back and treat an empty
result as a failure, the same as `removeSource`.

### Fixed 2026-09-22: a refused invitation now says why, somewhere readable

Anthony hit "Could not create that account. Try again." and there was
nothing to read anywhere, because that branch caught the error and threw it
away. Nothing was written to the logs at all.

Two changes. The real status, code and message are now logged. And a
duplicate is detected by the error CODE first (`email_exists`,
`user_already_exists`, or status 422) rather than by matching three words
in a message, because wording changes between versions of the auth service
and a duplicate phrased differently fell through to the shrug. An address
the auth service refuses outright gets its own line instead of being told
to try again, which is an instruction to repeat a thing that cannot work.

NEEDS THE `invite-staff` REDEPLOY.

### Logged on 2026-09-16, and he said not to build them today

He asked for these to be written down rather than built, to save credits
before the video. They are real and they are his decisions, not ideas.

4. **The WhatsApp quick reply clash.** The same number that runs the
   support assistant is also the number the automated follow up templates
   go out on, and those templates carry quick reply buttons. So when a
   customer taps a quick reply, it lands in the same thread, and the
   assistant answers it as though it were a question. Worse, the assistant
   is trained for the business and not for the business's guests, so what
   it says back can be wrong for that person. His own fallback, decided:
   a separate phone number, after the video.

5. **Where a support reply goes, WhatsApp or Gmail.** A toggle, chosen per
   thread by the person answering. WhatsApp only accepts a free form reply
   inside 24 hours of the customer's last message, and he wants the cap
   set at 12 hours rather than 24, so nobody writes a long answer and then
   watches it bounce. Outside the window it goes by email.

6. **The old message response area in the admin comes out.** Support now
   has its own route and its own queue, so two places to answer the same
   customer is one place too many.

7. **The slow send.** He saw a send take longer than it should. Possibly
   his network, possibly not. Watch it and see whether it repeats.

### Done, 2026-09-16

- **Support as a seat, not a page.** Built and checked. The flag is on the
  staff row, the admin sets it, one door for everybody at /workspace, and
  `WorkSwitch` puts a toggle between their own work and the queue. It
  renders nothing at all for somebody without the flag.
- **The support queue shows the flagged question, not the whole thread.**
  His words: "why not the actual message that was flagged instead of the
  entire conversation?" The `escalations` table already held it, because
  an escalation is raised per question and the row keeps the customer's
  own words. So that one sentence is what the screen shows, open ones
  first with an amber edge, and the rest of the conversation is behind
  "Read the whole conversation (9)". Where a thread has no escalation row
  the last customer message stands in, so the panel is never blank.
  Clicked through: hidden by default, nine messages appear on click, gone
  again on hide, and a thread with no email still gets no reply box.
- **A cut off reply says so.** The function already sent `stop_reason` and
  nothing in the browser read it, so a reply chopped at the ceiling was
  handed over looking finished. Chat.jsx reads it now, says "That ran out
  of room and stopped here" under the reply in plain grey, and stops short
  of reading half a sentence for a handshake marker. Looked at in both
  themes at 390 and 1280.
- **Asking it to search works from any stage.** `NEED_LOOKUP` was only
  acted on inside the analyse branch, so asking for a search in ordinary
  conversation could only ever produce a refusal. It is honoured
  everywhere now, and the stage that raised the card is carried on the
  card, so a search asked for in conversation comes back to conversation
  instead of pushing somebody into the document pipeline.
  THE MODEL SIDE OF THIS IS NOT LIVE. See open request 1.
- **The chat connector labels match the admin.** Both say "Coming soon"
  now. The chat used to say "Set up" and "Example" off an internal state
  field whilst the admin said "Coming soon" for all of them, which is two
  screens giving different answers about the same tool. Canva keeps a live
  label because it is the one a person really connects.
- **A way to look at a signed in screen.** `vite.harness.config.js` plus
  `scripts/__harness`. It renders a page on its own with a fake Supabase
  behind it, so a screen that reads the database can be screenshotted and
  clicked without a workspace. `scripts/__harness/shoot.cjs` does the four
  shots. This is how the support change above was actually checked, rather
  than by reading the markup.

- **Support replies really send.** support-reply v1. A person types an
  answer in the queue, it goes to the customer by email and into the
  thread. Three checks the browser cannot do: support access, the thread
  belongs to their company, and there is somewhere to send. WhatsApp is
  not wired, and a thread with no email gets no box at all plus the
  reason.
- **A design is looked at before it is handed over.** canva-design v2. The
  export is fetched by the model, judged against what was asked for, and
  the verdict comes back with the design. It checks and reports; it does
  not reach back into Canva and move things, because placing elements
  needs editing the free plan does not give us.
- **Conversational is back in the ladder**, green, labelled support, and
  locked. *(Overtaken 2026-09-21 along with the picker itself. The green
  support line survives, as a line of text under Company defaults.)*

- **Canva moved from the admin to the person.** integration_tokens is keyed
  (staff_id, provider) now. The Design panel is gone from the admin, and
  Canva is a connector a staff member connects from the chat like any
  other. This is what fixes Open in Canva: the design is in the account
  they are already signed into.
- **Support is a seat.** staff.can_support, an admin toggle on the staff
  row, a Support queue screen reading the existing support_threads and
  support_messages, and a switch between it and their own work at the same
  /workspace address.
- **All three levels are offered:** standard, deeper, deepest, default
  standard. Conversational is what support runs at on its own, so nobody
  picks it. *(Overtaken 2026-09-21. The ladder is two rungs now,
  conversational for support and standard for everything else, and there
  is no picker at all. See the 2026-09-21 entry.)*
- **Section order:** integrations, the problem, what this changes, how it
  works, the read back. Sold before told how.
- **The fourth outcome card** rewritten so it reads once.

### Done, 2026-09-15

- **The landing page below the fold is rearranged.** How it works, then
  the read back, then four outcomes, then the problem and the research,
  then integrations. A buyer now learns what happens when their staff uses
  this before they learn what it plugs into.
- **A sixth step**, "It keeps what you accepted", per staff member and
  never a company standard.
- **The capability explainer is inside the selector.** Anthony: "that
  place is pointless, because that capability description can just be part
  of the selector." The panel is deleted. Pick a level and the line under
  it says what that level is for, full sentence in the two forms and the
  short line in the staff row, where there is no space for more.

- **Access and usage merged into one tab.** Company defaults, the people
  list, recent work, then the capability explanation last, in the order an
  admin actually works. The Usage tab is gone.
- **Tablet and desktop checked**, at 768x1024, 1024x768 and 1440x900, both
  themes. It found a real bug: the level dropdown was 132px, measured
  against "Standard" and never against "Conversational", so it read
  "Conversatior" on a tablet. Now 156px, and every label is measured
  against its own box at all four widths.

### Decided, so nobody reopens them

- **2026-09-23: storage is whatever the company connects.** Anthony:
  "remember a company can decide to connect any storage cloud of their
  choice." Google Drive is the first one built; the connection
  (oauth-callback PROVIDERS, storage.js, the result card) is built so the
  next one (Dropbox, OneDrive, SharePoint) is a provider entry, not a
  rewrite.
- **2026-09-23: the checkpoints are hard wired, not asked for.** Anthony:
  "must take permission before searching the Internet. Must follow the
  path of interview, read back, prompt and build. and interview and read
  back may continue until everything is provided or the staff says go
  ahead. read back is the verification phase for the staff and the staff
  can still make corrections at that point too."
- **2026-09-23: reuse is shape only.** Answered; do not ask again.

- **2026-09-23: an admin sees everything in their own company.** Anthony:
  "let admin see everything in their own company." The RLS that lets an
  admin read every staff member's chats and documents stays. Staff still
  see only their own. Nothing crosses companies.
- **2026-09-23: Google Drive is the first storage.** Anthony: "Google
  drive since I already collected the credentials and the secret is
  already stored in edge function." He redeploys once the work is done.

- **Headline:** "Private AI that already knows your company. / Zero data
  leakage." His choice, 2026-09-15, over "Your data never leaves your
  cloud". The accent sits on the closing line because it is the anchor.
- **Subtext:** his sentence, used as he wrote it. Do not trim it for
  phones.
- **The rotating line:** three words a switch, his length.
- **Hallucination claim:** "Nothing enters your work that you did not
  approve." His decision over "near zero hallucination".
- **Connector labels:** every one says Coming soon, Drive included. Drive
  gets picked up after the video walkthrough.
- **Bedrock:** never named on a public page. It belongs in a per customer
  deployment doc, because a customer may want Azure.

---

## What this repository is, before anything else

**StellaXafe is not SaaS.** There is no plan, no seat, no self serve tier,
and nobody signs up. It is built to order: a company comes with
requirements and the deployment is built into their own systems.

**So everything in this repository is a blueprint.** It proves the
architecture and it shows the shape. It is not the software any customer
will be handed. What they receive is built for them, and what is added or
dropped depends on the contract.

Four things never vary, in any deployment: private, safe, hallucination
constrained by design, and the iteration problem solved. Everything else does. See
`DIRECTION.md` for why the third is stated as a mechanism and never as a
number.

This matters for how the rest of this file reads. "Not real yet" below
means not wired in the blueprint. It does not mean out of scope, and it is
not a reason to remove a claim from a public page. `DIRECTION.md` holds
the rule for what public copy may say.

---

This file is deliberately blunt about what is real and what is not,
because the last three sessions were spent finding things that looked
finished and were not. Trust this list over anything a screen says.

---

## Reaching Supabase, and what has actually run

**This section was wrong for three sessions. Corrected 2026-09-06 by
querying the live database.**

It used to say nothing had ever run end to end against real Supabase. The
database says otherwise: **2 companies, 3 staff, 7 knowledge sources, 42
chunks, 6 saved conversations.** It has run.

It also held `SX-4M8G-T4P3` as an unspent code for the first live run. That
code was redeemed on 2026-08-27 and belongs to the `buildfest` workspace.
**Unused codes, checked live:** `SX-3NKZ-GCYJ`, `SX-LNDA-4KHU`,
`SX-F3MP-LWAV`, `SX-KNA9-KQ6E`, `SX-Y9YA-TBE9`.

**Two different paths to Supabase, and only one of them is blocked.**

- Plain HTTP from a session's shell or browser still fails:
  `supabase.co` answers `CONNECT tunnel failed, 403`. So an edge function
  cannot be called, and the app cannot be driven against the real backend
  from inside a session.
- **The Supabase MCP connection works.** Migrations apply, SQL runs, edge
  functions deploy, straight from a session. That is how
  `resolve_access_code` and `resume-demo` were shipped.

So: the database layer can be built and tested here. Anything that has to
go through an edge function over HTTP still has to be tried by the user in
a real browser.

---

## What is genuinely real

- **Setup, and the code is the identity.** `/setup` is three steps: enter
  your code, tell it about your company, start using it. **Nobody types an
  email or a password.** Asking a stranger for their address before they
  have seen anything is where they leave, and the code is already a better
  credential: unguessable, handed out one at a time, checked server side in
  a table no browser can read.
  The account underneath is real, just derived. The address comes from the
  code, the password is random and thrown away after one use, and the way
  back in is the code itself. `resolve_access_code` now answers `new` or
  `resume` instead of treating a used code as dead, and the new
  `resume-demo` function mints a one time session for the workspace's admin
  and hands it to the browser. **So a used code is no longer spent, it is
  the key to the workspace it built.** It resolves the admin by their staff
  row, so the two workspaces built under the old email and password flow
  resume too.
  None of the email and password code is deleted, only unused: a real
  deployment still needs an identity that belongs to a person.
  **`/setup?step=N` opens any of the three screens with stand in values, in
  dev only**, compiled out of production and checked by grepping `dist`.
- **Sign in is a code, not a password.** `/auth` asks for an email and
  Supabase sends a six digit code. `shouldCreateUser` is false, which is the
  whole security of that screen: left on, anyone typing any address would be
  given an account. An unknown address is answered exactly like a known one
  and the code simply never arrives, so the screen cannot be used to find out
  who is on the system.
  **There is no password anywhere in the interface.** All three existing
  accounts have real Gmail addresses, checked against `auth.users`, so a code
  reaches every one of them and the old door was redundant. See the No
  passwords section in `CLAUDE.md` for the standing rule.
  **This is what finishes the invite flow.** An invitation link is single use,
  so without a code an invited person could get in exactly once and would be
  locked out on their next device.
  **An admin session lasts 24 hours**, held in `shared/adminClock.js` and
  checked when the admin panel loads. Supabase has one token lifetime per
  project, so the shorter one is enforced in the app. Read the note at the
  top of that file: it is a convenience against a laptop left open, not a
  security boundary. RLS is the boundary.
  **`OTP_LENGTH` in `Auth.jsx` is 6 and must match** Authentication → Sign In
  / Providers → Email → Email OTP Length. The setting accepts 6 to 10 and new
  projects are created at 8. A mismatch means somebody types six of their
  eight digits and nothing on screen explains the refusal.
  **The email is branded**, and its source is
  `supabase/email-templates/otp.html`. Supabase keeps its own copy, so
  editing that file changes nothing until it is pasted into Authentication →
  Emails → Magic Link. Calling `signInWithOtp` with no redirect sends that
  template; `{{ .Token }}` rather than `{{ .ConfirmationURL }}` is what makes
  it a code instead of a link.
  **Custom SMTP is required for this to work at any volume.** Supabase's
  built in sender is rate limited per hour and best effort by their own docs.
  Point Auth at Resend, and check the "minimum interval between emails"
  setting, which is 60 seconds by default and per project, not per person. It reads who you are from
  the database and sends you to your own workspace, admin side or chat
  side. A wrong password and an unknown email land in the same place on
  purpose.
- **The assistant.** Streaming, real Claude, three stages, enforced server
  side: who you are (RLS), which model (stage capped by the staff
  ceiling), how much (budget checked before, decremented after by real
  usage). Prompt caching on the base prompt.
- **The stage flow.** Interview on Haiku, three to five questions, ends
  with a hidden marker. Automatic step up to Sonnet. Sonnet reads the
  sources and either asks for what is missing (drops back to the cheap
  model for that conversation) or reads the brief back. Only a read back
  puts the Build card up. Corrections re-enter the same loop.
- **The interview cannot write the document.** Each stage has its own
  output ceiling: 700 tokens for the interview, 4000 for the analysis,
  8000 for the writing. It used to be 8000 everywhere, and asked to "just
  build it" the cheap model wrote the whole one pager on the spot, never
  sent the marker, and the flow never reached the read back or the
  download. A ceiling, not a rule.
- **The interview ends three ways**, all identical, all ending in the
  marker: it has enough, the person tells it to get on with it, or the
  person points it at the company sources. Five questions is enforced by
  the app, not trusted to the model, and the model is warned on its last
  turn so it closes cleanly instead of being cut off.
- **The knowledge base.** Files and pasted text are read, chunked, stored
  in `knowledge_sources` and `knowledge_chunks`, and their **contents**
  reach the model from the analysis stage onward.
- **PDF and Word** are parsed in the browser. Scanned PDFs are refused
  with an explanation rather than stored empty.
- **Links** are fetched once, server side, by `add-link`, admin only, with
  private addresses refused and every redirect hop checked.
- **Images** in the chat are shrunk to 1568px and sent as image blocks.
- **Finished work downloads as a PDF or a Word file**, laid out in the
  browser by `shared/download.js`. It used to download as Markdown, which
  a phone will not open, so the deliverable could not be shown to anyone.
- **Finished work** is saved to `work_history` and survives a refresh.
- **Conversations are saved** to `conversations`, the last three per
  person, so a brief someone is halfway through survives a closed tab or
  a different phone. The sidebar offers them under "Pick up where you left
  off" and resuming restores the stage as well as the messages.
- **The public site.** Six pages sharing one nav and one footer: landing,
  `/services`, `/founder`, `/insights`, `/form-builder`, `/contact`. Ported
  from the separate StellaXafe repo in session 5, so this repo is now the
  only one. Services, Founder and Contact are routes styled as modals, with
  real URLs and instant navigation. **Demo is not a separate page**, every
  demo link goes to `/setup`, which is built to be landed on cold: it is on
  the same nav and footer as the rest of the site and it says what the four
  steps are before asking for the code.
- **One address for the workspace: `/demo`.** It renders the admin panel or
  the assistant depending on who is signed in, with `?view=assistant` for an
  admin who wants to see what staff see. `/{slug}` and `/{slug}/admin` are
  gone. The slug was decorative: Chat never read it and Admin only used it to
  build links, because both have always taken the workspace from the session,
  which is the only source a person cannot edit in the address bar.
  Dropping it fixed a real bug as a side effect. Every unknown single segment
  path used to be read as a company name and sent to a sign in screen, which
  both looked broken and let somebody probe for which companies exist. A
  mistyped path goes home now.
  `/chat`, `/admin` and `/{slug}/admin` redirect rather than 404, because
  they were public.
- **`/anthony` is the page for job applications and LinkedIn.** Separate
  from `/founder` on purpose: that one answers "who is behind StellaXafe"
  for somebody already reading about StellaXafe, this one answers "what does
  this person build and can they do it for us" for somebody who has never
  heard of either. Written in the language those roles are advertised in.
  A path rather than a subdomain for now, because it works the moment it
  deploys. `anthony.stellaxafe.com` needs DNS and a certificate; when that
  lands it points here and the address on a profile never has to change.
- **`ARCHITECTURE.md` is new and matters.** It records how the product is
  designed to work, in Anthony's own description, and most of it is not what
  the demo does yet. `CURRENT.md` is what is built; `ARCHITECTURE.md` is the
  target. It also carries the one live copy problem: the landing page says
  "Nothing ever leaves" and that is falsifiable, because prompts still reach
  the model provider even though documents are never stored here.
- **The mark is the Containment Seal**, built to `MARK.md`. Read that file
  before touching the logo: the old interlocked rings were a drift away
  from the written spec and looked like somebody else's mark. Only the
  idle orbit is built. The other two states wait on a real event to fire
  them.
- **The ground is `#05060D`, not pure black, and stays cool.** In
  `tokens.js`, so it applies to every screen. Display type sits at weight
  500 at large sizes, not 700.
- **RLS** is tight. Every table on, every policy scoped by
  `private.current_company_id()`, which reads `staff` by `auth.uid()`.
  `access_codes` has RLS on and zero policies, so only the service role
  reaches it. Verified against the live database.

## The assistant's six stages, and what is actually live

Added 2026-09-10. This is the flow Anthony asked for so he could record the
demo videos. It is deployed as `assistant` **v11**, sha `80723d2a31b1ec38`.
The repo copy was brought back in line with that deployment on the same day.

The six stages, in the order a person walks through them:

1. **orient** - it reads the company's material and works out what they are
   asking for. It ends by offering an interview, marked `OFFER_INTERVIEW`.
2. **interview** - three or four questions, no more, and only when they said
   yes. It stops itself with `INTERVIEW_DONE`.
3. **analyse** - it works out what it still does not have. Two routes out:
   `NEED_INPUT` for anything only they can know, `NEED_LOOKUP` for anything
   public and findable. The read back happens here, in the conversation,
   before any prompt is written.
4. **research** - the only stage that can reach the internet, and only after
   they tap the button. Everything found comes back with its source, and
   nothing is used until they approve it.
5. **brief** - the prompt. This is written before anything is built, it
   carries the approved outside findings with their sources, and it carries
   the corrections they made on purpose.
6. **generate** - the document, written from the brief.

**The search tools are attached in code, not in a prompt.** `searchTools` is
built only when `stage === "research"`. On every other turn the tools are not
in the request at all, so no amount of persuading can reach them. The base
prompt says so in the section titled "YOU CANNOT GO AND LOOK, UNLESS THEY LET
YOU OUT".

Three things that were broken and are now fixed:

- **The 400 that stopped the whole flow for days.** The interview to analyse
  handoff sent a conversation ending on an assistant turn, and the model
  rejects that. Guarded twice now, once in `sendTurn` and once server side.
  No fake user turn is invented; the trailing assistant turn is dropped.
- **The cache mark sat on the wrong block.** Prompt caching is a prefix
  match, so the mark has to sit on the last stable block. Proven on real
  traffic: 13.7054 cents on the write, then 1.34188 cents, then 0.97168.
- **Findings never reached the brief.** `handleGenerate` bypasses `runTurn`,
  so it was passing an empty string. Both `sendTurn` calls now carry
  `findingsRef.current`.

**No model name reaches any screen, admin included.** The reason is
portability, not house style: the same product may be installed on a
different provider tomorrow. The admin sees four capability levels
(conversational, standard, deeper, deepest), each with an info icon.

## THE REPO IS AHEAD OF THE DEPLOYMENT, on purpose

**As of 2026-09-14 `supabase/functions/assistant/index.ts` is NOT what is
live.** The deployment is still v11, sha `80723d2a31b1ec38`. The repo has
14 extra lines in the research prompt, asking it to put `[FINDING]` on its
own line before each thing it found.

**Why it was not deployed.** The only way to deploy from a session is the
MCP tool, which takes the whole file inline. That means retyping 1,700
lines of a live function by hand, and this file is full of the damage that
kind of move has already done here. The gain is cosmetic: without the
marker, the model's opening line shows up as one extra row in the pick
list. Not worth the risk taken unasked.

**What to do about it.** Either deploy it deliberately, with a diff against
the deployed source straight after to prove it landed byte for byte, or
drop the 14 lines. Do not leave it sitting here for long: a repo that is
quietly ahead of the deployment is the thing that caused every edge
function rule in this file.

**The app copes with both.** `src/shared/findings.js` prefers the marker and
falls back to splitting on blank lines. The fallback is not a stopgap: the
model can miss an instruction on any turn, and a person must still get a
list they can tick.

## Picking which findings get used

Added 2026-09-14. Anthony: "the permission to use the data is supposed to
offer a third option should the person agrees with some of the search
results but not all, so they get to say which."

**The list opens with everything ticked and you untick what is wrong.** His
call, and it is the right one: "most of the data might always be accurate,
so the person has less things to type."

**One screen, no middle step.** A first version put a "Let me choose" button
in front of the list. He cut it: "it will list the search results as
selected, then you unselect the wrong ones and click continue." A button
whose only job is to reveal the thing the person came to look at buys
nothing.

Unticking everything is saying no, so the button says "Use none of it" and
does that. One finding is not a list, so that case is plain yes and no.

An unticked finding is still never stored. Only a count.

## The turn that never came back

Added 2026-09-14. Anthony sent a message and got silence. Not an error, not
a spinner that gave up. It had happened before.

**The cause was one `break`.** The stream reader called `onDone` only when
the server sent an explicit done event. Any other ending, the edge worker
killed at its limit, the connection dropped, the gateway hanging up, ended
with the browser still holding `typing = true`. The screen said it was
working. Nothing was.

Two fixes, and they are deliberately different in kind:

1. **A terminal event is compulsory.** Every path that ends a turn goes
   through `finish()`, which fires once. A stream that ends without a done
   or an error gets one invented. This cannot false alarm, because it only
   speaks when the stream is already over.
2. **A watchdog**, for the other shape of the same failure, where the
   stream stays open and nothing arrives. This one can false alarm, so it
   is slow: 25 seconds to say it is slow, 120 to give up, 300 for research
   because that stage genuinely says nothing for minutes while it searches.

The watchdog holds one read promise and races it repeatedly. Calling
`reader.read()` again each round is the obvious way to write it and it
loses chunks, because concurrent reads queue and a race keeps only the
first.

## Saying what it is doing while it does it

Added 2026-09-14. Anthony: "if it's still thinking or analyzing, there's no
way a person knows... so a person can know it's still working and wait for
it."

Three grey dots cannot say whether it has been reading for two seconds or
has been dead for two minutes, so the only safe reading of them is to press
the button again. `src/shared/thinkingWords.js` holds the words: three per
stage, advancing every 7 seconds, the last repeating.

**It is a progress line, not a progress bar.** Nothing counts down and
nothing claims to be nearly finished, because nothing here knows that. What
is known is which stage is running and how long it has run.

**The build card's green ticks are gone.** It used to show "Applied brand
kit and template" and "Structured layout", both hard coded, neither
connected to anything the product does. There is no brand kit. Nothing
applies a template. They were on screen while the model was still writing
the first line, and they were about to be in a demo video.

## Coming back the next day

Added 2026-09-10. Anthony asked for "a progressive log to always remember
where things left off". This is it.

**The visible half already worked and the invisible half did not.** Messages
and stage were saved, so returning brought the conversation back on screen.
Three things behind it were not saved, and those three decide what the
finished document says:

1. The outside findings the person had approved. They lived only in a
   variable in the browser. Come back tomorrow, press Build, and the figure
   they approved yesterday was silently missing.
2. How many interview questions had been asked. Reset to zero, so a
   returning person could be asked four more about a settled thing.
3. The confirmed read back. It was written to `conversations.brief` and
   never read back out.

All three are now saved to `conversations.state` and restored. The shape
lives in `src/shared/resumeLog.js` and nowhere else.

**A refused finding is still never stored.** Only a count is kept, so a
returning person can be told plainly that nothing was carried over. Anthony:
"if there is no go-ahead, it should not add it."

**One quiet line says what came back**, and only when something invisible
did. "Picked back up. Still holding 2 things you approved from outside." It
is `role: "system"`, which keeps it out of the saved row and out of the
model's message list, where a third role would be a 400 on the next turn.

**Two bugs found while wiring it, both in New chat.** It never cleared the
approved findings, so a figure approved in the morning was still sitting in
the browser in the afternoon and would have gone into a completely unrelated
document. And it set the stage to "interview", left over from before
"orient" existed, so every new chat skipped reading the knowledge base.

**What is not done: the model does not read the note yet.** The column is
written and read by the browser. Handing the note to the model at the top of
each turn needs a change to the `assistant` function, which is a redeploy,
and it has not been made. Until it is, the model still works everything out
again from the messages on every turn. Correct, just slower and dearer.

## Publishing a file to customers, and the guard on it

Added 2026-09-09. The one action in the admin that can send a company's own
material to somebody outside the company is turning a knowledge file on for
customers. Until this day it was a single tap with nothing in the way, and
a real payment receipt got turned on during testing with nothing said.

**What is live in the repo and on `testing`:**

- **A pair of options, not a toggle.** `src/shared/AudienceControl.jsx`.
  "Staff only" and "Customers too", both on screen at once, the one in
  force filled in. The old control showed the state and nothing else: not
  that there was a choice, not what the other choice was, not that it
  mattered. A control that has to be taught is a broken control.
- **A gate on the way out.** `src/shared/PublishGate.jsx`. Turning a file
  ON always asks, every file, every time. Turning one OFF never asks,
  because taking something back is always safe.
- **Two levels.** Soft is the default: one line, plain button, no colour.
  Firm only when the reader found something: amber, the finding is what
  you read, Cancel becomes the loud button, and the other one says "Turn
  it on anyway". A warning that shouts every time gets clicked through
  every time.
- **The reader.** `supabase/functions/read-before-publish`, deployed
  2026-09-09, now **version 2**, `verify_jwt` false like every function here,
  `ezbr_sha256` e3580d26deb00ba2bb8fa67cce4a11f9d0d654756e442b2a4e40d22bcbbe4db2.
  Admin only, checked in the function. Sonnet. Returns clear, warn or
  unknown plus one plain line. It leans internal on purpose and its reason
  never quotes the private part. **Confirmed working on a real file**: it
  identified a bank transfer receipt without printing the account number.

  Version 2 fixed the first false positive, found within an hour of going
  live. A file of pricing instructions came back as "internal", because
  instruction was being read as secrecy. The prompt now says plainly that a
  document written to steer the assistant is not private information.

- **A quiet delete guard.** `src/shared/ConfirmDelete.jsx`. The bin removed a
  file and its text on one tap with no undo.

- **Duplicate detection.** `src/shared/duplicates.js`. No model, no tokens, a
  string comparison against the list the browser already holds. A file name
  already taken gets red text. A link already in the base is different: it is
  a photograph of a page, so the same address again is a refresh, and
  `src/shared/RefreshOrKeep.jsx` asks what to do with the old reading.

- **Newest wins.** `customer_knowledge` now orders `k.created_at desc`.
  Applied and verified 2026-09-09: security definer preserved, grants still
  postgres and service_role only. It used to be oldest first, which put the
  stale copy in front and made the 40,000 character ceiling drop the newest
  material first.

- **The contradiction log.** `knowledge_contradictions` plus
  `knowledge_contradiction_log`. Written by support-ask when a company's own
  published material disagrees with itself while answering. One row per
  disagreement, not per message. No insert policy; the only way in is the
  security definer function, granted to service_role. Verified with a self
  test that wrote twice, confirmed one row with times_seen 2, confirmed a
  resolved row reopens, then deleted itself.

- **support-ask is at version 10**, `ezbr_sha256`
  283e8b1e521503acee33e7b03e98a8abd3ea9acc8e913300543f104c2842e230. It
  carries the writing rules, the dash line, the newest-first line, and the
  contradiction reporting.

### The outage on 2026-09-09, and what it changed

Version 9 of support-ask went live with a variable used and never declared.
Three 500s on Amara's real WhatsApp. Every reply was composed, appended to
the thread and saved, then the function threw on the way out, so the database
showed a perfect answer and the customer got silence.

Two checks both looked like they passed. An edit script asserted on three
anchors, the third missed, Python raised, and the file was never written,
taking the two edits that HAD matched with it. Then the type checker was run
as `| grep -E "TS1[0-9]{3}"`, which is syntax only, and a missing name is
TS2304.

**`scripts/check-functions.mjs` exists because of this.** It type checks every
edge function and excuses only the Deno global and jsr/npm/https imports.
Run it before any deploy. Never narrow a check to a class of error guessed at
in advance.

**The contradiction log and the metering now each have their own try**, and
`CLAUDE.md` carries the rule: bookkeeping never fails a reply. Both run after
the customer's answer already exists.

### The 40,000 character ceiling, which nothing on any screen mentions

`MAX_SOURCE_CHARS` in support-ask is 40,000. Amara's landing page alone is
59,837, so a third of it never reaches the model, including the whole partner
programme. Nothing warns anybody. This is the binding constraint on what
support knows, and it binds long before the model's own limits do.

Ask support about the partner programme today and it knows nothing, with no
sign anything is missing.

**The rule the whole thing turns on, and it is not negotiable:**

> The reading can add a warning. It can never remove one, and it can never
> encourage.

The gate opens whatever the reader says or fails to say. A clean reading
does not skip the question, it only leaves the dialog quiet. A reading that
failed says "nobody has checked it" and is never dressed up as clean.

The design that was tried and rejected was to let the reader decide whether
to ask, and pop up an offer when it came back clean. That turns a model's
mistake into the product actively inviting somebody to publish a payroll
sheet with a green tick beside it. A model that can wave something through
will eventually wave the wrong thing through.

**Not built yet:** the override log, meaning a record of the times the
reader warned and an admin turned the file on anyway. Nothing is logged for
the soft path, deliberately.

**A trap fixed on the way past, worth knowing about.** `PageShell` is a
column flex container, so a flex line takes the width of its widest item
and stretch only grows items up to it, never shrinks them. One long file
name held on one line by `truncate` made the admin content wrapper 512px
wide inside a 320px phone. `overflow-x-clip` then hid the result instead of
scrolling it and `document.scrollWidth` still read clean, so the bin and
the status pill on every row sat off the right edge with nothing reporting
it. The fix is `w-full` on the page's own wrapper, which makes its width
definite. `min-w-0` alone does not do it. Any new page inside `PageShell`
needs the same.

## Support, the second environment

Added 2026-09-07. The plan for all of it is `SUPPORT.md`, which is the
current record and takes precedence over the older section in
`ARCHITECTURE.md`.

**What is live in the database, applied and walked through against the real
project:**

- `knowledge_sources.customer_visible`, default false, and
  `customer_knowledge(company_id)`, the only read path the support side has.
  The filter is inside the function so no call site can widen it.
- `support_threads`, `support_messages`, `escalations`, and the quiet window
  that hands a conversation back on its own.
- `support_routes`, so a billing question reaches billing, plus
  `support_message_add`, `support_route_labels`, `support_escalate` and
  `support_escalation_notified`.
- `company_spend`, an atomic decrement. The staff assistant's read then
  write loses charges when two calls land together, which is rare with one
  person in one conversation and normal on an open inbox.

Every one of those was exercised end to end in SQL: a repeat delivery is
recorded once, an unknown route falls to the default, a second default is
refused, and support presence turns on when a colleague speaks and lapses
by itself.

**What is deployed:** `support-ask`, with `verify_jwt` off and a shared
secret. Haiku only, no connectors, published sources only. `add-link` and
`assistant` were redeployed the same day, so the live project and this
repository match.

**The assistant's slug is now `assistant`, with no hyphen.** It used to be
`assistant-`, a trailing hyphen it was created with, while the dashboard
showed the name as "assistant". That trap is gone: the hyphenated function
was deleted on 2026-09-08 and the code redeployed on the clean slug.
`src/shared/config.js` points at it.

**What is not done yet:**

- `SUPPORT_SHARED_SECRET` is not set on the project. Until it is, every
  call to `support-ask` answers 401, which is the correct closed state.
- Nothing has called it. `supabase.co` is unreachable from a session, so the
  function has never been exercised over HTTP. That test is a browser or a
  live webhook, not something this repository can prove.
- No company has a support route yet, so an escalation would be recorded
  with nobody emailed.
- **The Amara branch is written and pushed**, on Amara's `testing` branch,
  in `receive-whatsapp-webhook`. It sits at the one point where a message
  was being thrown away: after the guest pipeline declines it. Guarded three
  ways, and the first is the one that matters: with no
  `STELLAXAFE_SUPPORT_URL` or `STELLAXAFE_SUPPORT_SECRET` it returns at once
  and that function behaves exactly as it did before, so it can be deployed
  ahead of the secrets. **Not deployed.** Amara's Rule 7 says the owner
  deploys and the ledger records it, and `DEPLOYMENTS.md` there now says the
  repo is ahead.

- **Amara's demo data is set.** Two support routes: Billing to
  anthony@stellaxafe.com, and Everything else to support@amara.ng as the
  default. Three of the five knowledge sources are published to the support
  side, 37 chunks: the summary of Amara, the landing page and the partner
  programme. `PaymentReceipt26-08-2026` and the executive brief stay off,
  the receipt because it must and the brief because that is a judgement
  call, not a default.

---

## What is not real, and must not be claimed

- **Canva makes nothing.** The app is registered, the keys are in place,
  no code sends anything to it. Shown as **Set up**.
- **Google Drive connects nothing.** Google has the client and secret,
  there is no `oauth-callback` function. Shown as **Set up**.
- **Gmail, Slack, Notion** are examples. Shown as **Example**.
- **Resend is live.** `RESEND_API_KEY` was set on 2026-09-06. Two things
  send mail now: the contact form via `send-contact`, and staff invitations
  via `invite-staff`. Both send from `noreply@mail.stellaxafe.com`, on a
  domain verified with Resend. An invitation that cannot be emailed is not
  fatal: the admin gets the link back on screen and the reply says
  `emailed: false`, so the screen tells the truth about what happened.
- **Skills are a badge, not a capability.** PowerPoint, Word, Excel,
  Design, Mind map, Analysis are detected from wording and shown in the
  nav. Word and PDF are real now. **PowerPoint, Excel and Design are
  not**: a request for a deck gets a well written outline of one as a PDF,
  not a `.pptx`.
- **Images cannot go in the knowledge base.** Company sources reach the
  model as text in the system prompt, and an image cannot go there.
  Converting an image to PDF does not help: PDF extraction returns text,
  and a PDF of a picture has none.

---

## Deployment

- Frontend: Cloudflare, deploys from `main`. **The live site is whatever
  is on `main`**, which caught us out for a whole session once.
- Edge functions are **not** deployed by git. They are pasted into the
  Supabase dashboard by hand, or pushed straight to the project by a
  session with Supabase access, which is how `send-contact` got there.
  Sources live in `supabase/functions/`.
- Deployed: `assistant`, `add-link`, `support-ask`, `invite-staff`,
  `check-access-code`, `create-workspace`, `send-contact`, `resume-demo`,
  `accept-invite`.
- **Secrets are still by hand.** `send-contact` reads `RESEND_API_KEY`, and
  optionally `CONTACT_TO` and `CONTACT_FROM` if the inbox or the sending
  address ever changes. The from address has to be on a domain verified
  with Resend. `stellaxafe.com` and `mail.stellaxafe.com` both are.
- **Slug and display name are two different things**, and renaming a
  function does not rename its slug. That is what left the assistant on
  `assistant-` for months while the dashboard showed "assistant". It now
  lives on the clean `assistant` slug. Calling a slug that does not exist
  is a 404 with no CORS headers, which a browser reports as a send failure,
  so it looks like a network fault. Slugs are named in
  `src/shared/config.js` under `FUNCTIONS`.
- **`verify_jwt` is OFF on all of them, deliberately.** The toggle is
  "verify with legacy secret" and this project uses the new key system
  (`sb_publishable_...`), so ON can reject valid user tokens. Every
  function checks the caller itself with `auth.getUser()` and reads under
  their identity.

## Working agreements

- Develop on `claude/nwobosi-access-5mces1`, merge to `main` when a piece
  is done. The user has standing permission for that merge.
- Paste edge function source into chat, or send the file. The user
  deploys by hand.
- **A green build is not evidence a page renders.** Two separate bugs this
  week compiled clean and threw in the browser. Drive the app.

---

## Small things noticed and deliberately left

- **The workspace header truncates the company name at 320px.** It shows
  "A.." where it should show "Amara". Spotted 2026-09-10 while screenshotting
  the assistant's offer card. Not caused by that work, and not fixed with it,
  because a header change touches every screen and that was not what was
  being tested. Anthony: "note that and maybe fix it later."

## Next, in the order I would do it

1. **Hand the resume log to the model.** The column is written and read
   by the browser already. This is the `assistant` redeploy that lets it
   read its own working note instead of reading twenty messages again.
2. **The live run.** Everything above is untested against real
   infrastructure.
2. **Staff invites**, so a presentation can show more than one account.
   Needs an INSERT policy on `access_requests` or a direct invite path.
3. **Describing images at upload**, so a logo becomes words the knowledge
   base can hold. One model call per upload, fits the existing pipeline.
4. **Canva**, after the competition. Needs `oauth-callback`, token
   storage, design creation and export polling.
5. **Real file formats.** A `.docx` or `.pptx` writer is the difference
   between an outline of a deck and a deck.
6. **Resend and email OTP**, for a real deployment rather than a demo.
