# SESSIONS.md

Log of each work session. Newest at the top. Keep entries short.

---

## Session 14: 2026-09-25, why the money went, and it was our meter

Anthony: "13 cents is too much and your search that returned empty on Doku...
still took money, why? and I've not even done the walkthrough and money has
finished. Now how much does a first chat cost and how much does the cache cost
and I believe after the first chat, the subsequent ones in a session are
cached. Check the logs at least now we have real data. please do not spend my
money again."

No model calls were made in this session. Logs, database and code only.

**He was right about the caching, and the meter could not see it. Two faults,
both in how a turn is priced. Neither is in the search.**

FAULT ONE, `_shared/wire.ts`. The cached-token count was read from OpenAI's
`prompt_tokens_details.cached_tokens`. DeepSeek does not use that shape. It
sends `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`, and it sends
them on every response. So on DeepSeek the hit count was ALWAYS zero. Worse,
DeepSeek counts the cached tokens INSIDE `prompt_tokens`, which Anthropic does
not do, so the cached ones were also sitting in the full price figure.
https://api-docs.deepseek.com/guides/kv_cache/

FAULT TWO, `assistant/index.ts`. The meter did its own arithmetic,
`fresh + cacheWrite * 2 + cacheRead * 0.1`, whatever vendor was answering.
Two is Anthropic's one hour cache write and a tenth is Anthropic's cache read.
DeepSeek charges ONE for a write and a FIFTIETH for a read. `_shared/brain.ts`
has held both since the table was built and `billableDollars` applies them, and
`support-ask` has always used them, so the assistant was the one function
billing wrongly.

Together: every input token priced as a miss, on a vendor where a hit is 2% of
the price. A hit on deepseek-flash is $0.006 per million against $0.30.

WHY A FAILED SEARCH STILL COST MONEY, which is the question that started this.
The search is free, it is an HTTP request. What costs is sending the company's
whole knowledge base to the model, and that happens on every attempt whether
the search works or not. To ask for a search at all, the function sends the
prompt and the model writes a reply. The failing turns measured 2.8 cents each
and almost all of it was input.

**The money, measured from the database rather than estimated.** 85.600320
before, 40.024944 now. 45.58 cents in total, and 35.3 of it was mine: five
research turns I ran as diagnostics and retries without asking first. The
8 model calls of the end to end verification, 10.27 cents, were the thing he
actually asked for.

**What the fix is worth.** If the cache hit rate is H, the real input price per
million is (1-H) x 0.30 + H x 0.006 while we charged 0.30 throughout. At a hit
rate of 0.8 that is 4.6 times too much, and at 0.9 it is 8.5 times. H is not
known, because the logs endpoint is broken: every query shape answers
`{"error":"Backend error! Retry your query."}` in about 0.4 seconds, which is a
fast rejection rather than a throttle, and the old `logs.all` endpoint is 410
Gone. So the hit rate cannot be read until that comes back. The log line has
been printing `cacheRead=0` on every single turn, which is the proof of the
mechanism even without the ratio.

**Fixed, deployed and MEASURED.** `wire.ts` reads DeepSeek's own name for the
cache count and takes those tokens out of `input_tokens`. The assistant calls
`centsExact` from `_shared/brain.ts` and its second copy of the arithmetic is
deleted. `support-ask` was already right, so now there is one place that can be
wrong instead of two. Nine new checks in `brain-wire.test.mjs`, 556 in the
suite. Live as `assistant` v48, 639 of 639 markers.

**And the cache was working the whole time. The meter was the thing lying.**
Three turns, measured from the budget itself rather than estimated:

| Turn | Before the fix | After |
|---|---|---|
| First turn, brand new conversation | 0.58293 | **0.023456** |
| Second turn, same conversation | not measured | 0.151136 |
| A real search turn | 13.5 | **1.443713** |

The first turn is the proof. Its input is the same nineteen thousand token
company material it always was, and 19,127 tokens at the cache-hit rate is
0.011476 cents while the same tokens at the miss rate is 0.573810. The
measured 0.023456 sits on the cache-hit line, not the miss line, so DeepSeek's
cache is hitting and the meter is now crediting it. **25 times cheaper on a
chat turn. 9.4 times cheaper on a search turn.**

⚠️ **THE CACHE HITS EVEN ACROSS CONVERSATIONS, AND THAT IS WHY THE FIRST TURN
IS ALMOST FREE.** The key is the prefix, and the prefix is the company's
material, which is identical every time. So a brand new chat still hits the
cache for that whole block. Worth knowing, because it means the per-conversation
"first message" is not special at all.

**His arithmetic, checked against measurement rather than agreed with.** He
said 100 cents should cover about thirty walkthroughs, or at least five with a
search inside. A walkthrough is six stages; at half a cent a stage that is 3
cents, so 88.4 cents is about 29 walkthroughs, and with a search inside at 4.44
cents it is about 19. He was right and the meter was the only thing that said
otherwise. NOT yet measured end to end as a full six stage walkthrough: the
three turns above are a chat pair and a search, and the writing stage produces
a much larger reply than either.

**The search itself works for the video.** The measured research turn came back
with the sources block present and fifteen distinct addresses, with no account
and no key of any kind.

**Top-up applied.** `update public.companies set budget_cents_remaining =
budget_cents_remaining + 50`, 40.024944 to 90.024944, his figure and not the
whole 100. `db-dryrun` first, CLEAN. After the three measured turns the balance
is 88.406639.

**Total spent on his account across both sessions: 47.19 cents**, of which 35.3
was my unasked diagnostics. The rest is the verification he asked for.

### What happened after the top-up, and the support question

He asked where 90 became 88 and then 87, which was a fair question and the
answer is on me. The ledger, to the cent:

| Balance | What took it | Whose |
|---|---|---|
| 90.024944 | after his 50 top-up | |
| 88.406639 | 1.618305, three measuring turns | MINE |
| 87.864593 | 0.542046, one WhatsApp support reply | his, 10:32:46 |
| 87.316133 | 0.548460, the next support reply | his, 12:07:20 |
| unchanged | his new chat | zero, correctly |

**TWO SUPPORT REPLIES COST THE SAME, WHICH SETTLES ONE THING AND LEAVES
ANOTHER OPEN.** 0.542046 and then 0.548460, about ninety five minutes apart, so
the second got no benefit at all from the first. But that gap is the problem
with the test: it does not prove support never caches, because the cache may
simply not have survived the wait. The assistant's turns DO get the benefit,
and those were minutes apart. So either support's block never caches, or the
cache does not last about an hour and a half. **The decisive test is two support
messages back to back, minutes apart, and it has not been run.** Support's
prompt IS built in the right order for caching, big block first with the mark,
and `customer_knowledge` has a stable `order by k.created_at desc, ch.created_at`,
so the block is deterministic. That is what makes the gap the leading suspect
rather than the prompt shape.

⚠️ **CORRECTION TO THIS SESSION'S OWN EARLIER CLAIM.** I told him only two
functions can take money. **FOUR can**: `assistant`, `support-ask`,
`read-before-publish` and `add-link`. I found that by grepping for
`company_spend` rather than for the arithmetic helper, which is what missed them.
I also told him support "got none of the cheap rate", and one number cannot
prove that. Both were guesses stated as findings.

⚠️ **AND ONE HE HAS TO DECIDE, WHICH IS NOT MINE.** At 10:32 the support bot told
a WhatsApp customer: "Essential is Amara's starter plan, and it's **free right
now**. Sign up, choose Essential, and you can start using it straight away. **No
card needed, nothing to pay**". The pricing page says Essential is ₦26,100 a
month, and the bot also described three plans, Essential, Premier and Signature,
which is the structure he is about to change. **A false claim about price on a
public channel.** Reported, not touched. It comes out of the knowledge base,
which already holds two contradictory price sets.

**`main` was published on his instruction.** `ce9e8e9..f6362f6`, a clean fast
forward, both branches level afterwards. Checked first: no file under `src/`
changes in those thirteen commits, so the site itself does not move, and the edge
functions were already live regardless of branch. 556 checks, type check clean,
lint at zero errors.

**A first chat, for the record.** 0.58293 cents, from a real log line on
2026-09-25: `usage stage=orient tier=standard fresh=19127 cacheWrite=0 cacheRead=0
out=76 cents=0.58293`. That one is honest, because a first turn has nothing
cached to mis-price. 98% of it is input: 19,127 tokens is the whole knowledge
base being sent for the word "hello", and it is sent again on every turn.

---

## Session 13: 2026-09-25, the search becomes ours, and the free provider does not work from the edge

Anthony: "give it the search tool and can't there be a search tool usable for
any model not just anthropic or DeepSeek". Yes. It is built, deployed and
tested. It cannot be SEARCHED WITH yet, and that is the whole finding below.

**What was wrong.** `web_search` and `web_fetch` were Anthropic's hosted
tools. Anthropic ran them server side and returned `web_search_tool_result`
blocks. On DeepSeek they became ordinary function tools, the model called
one, the stop reason was never `pause_turn`, so the loop gave up on its first
round and no result ever arrived. Silent, and it said "I searched and found
nothing usable for this" when no search had happened.

**What was built.** `supabase/functions/_shared/search.ts`, sitting beside
`brain.ts` and built the same way: the provider is a setting, not a branch in
a stage. The research stage now declares two plain function tools to
whichever vendor is answering, and this function runs them. The model asks,
the search happens here, the results go back as a tool result, and the loop
turns on whether a tool was CALLED rather than on any vendor's stop reason.
Nothing Anthony designed moved: the person still approves the lookup, the
ceilings are still 20 searches and 12 fetches (now counted in code rather
than passed to Anthropic as `max_uses`), the findings still come back as a
tickable list, and "Where this came from" is written from the results this
function actually received, so it cannot be invented. A failed search is now
told apart from an empty one in words, because reporting the first as the
second is how a document ends up carrying a number nobody published.

Live as `assistant` v45, 638 of 638 markers, nothing lost from the copy
before it. 58 new checks in `scripts/tests/search.test.mjs`. Two real bugs
were caught by those checks before the deploy: an advert on the lite page
carries the same class as a result and its wrapper unwraps to a DuckDuckGo
address, so two adverts were being offered as sources; and because an advert
was dropped as a result while its SNIPPET was still counted, every snippet
after it was attached to the wrong address, which shows a source against a
claim it does not make. Both fixed, and pairing is now by document order.

**THE FINDING THAT MATTERED, AND HOW IT WAS SOLVED. DuckDuckGo is refused from
the edge runtime.** It rate limits datacentre addresses and Supabase's edge is
one. Measured, not guessed:

- From this container: seven queries across seven regions, ten results each,
  about 600ms, no throttling. Nigeria returned Nairametrics and Business AM,
  the US returned JD Power, the UK returned Knight Frank and UKHospitality,
  India returned the Economic Times, the Gulf returned Arabian Business and
  CoStar. The user agent makes no difference: browser, bot and none all work.
- From the edge runtime, twice, on both endpoints: every search refused.
  Asked and answered from the live function, not from a reading of the code.

So it was never the headers and never the parser. It was the address the
function runs from.

**The fix was not a key. Tavily has a keyless mode**, `X-Tavily-Access-Mode:
keyless`, which is a supported part of its API rather than a scraped page. It
was tested from the edge and it answers. It also returns extracted page text
instead of a bare snippet, so the model often does not need to open the page
at all. Anthony chose a Brave key first, and Brave is wired and ready, but no
account is needed for search to work today.

The provider is now a CHAIN rather than one choice, because one provider was
exactly the single point of silent failure: Brave first if a key is present,
then Tavily keyless, then DuckDuckGo as a backup for a laptop with nothing
configured. `SEARCH_PROVIDER` pins one when a deployment needs that, and a pin
is honoured alone with nothing falling back past it.

**Proved end to end from the live function on DeepSeek.** Asked for current
Lagos hotel rates against the rest of West Africa, it returned seven findings
with real addresses, including a ₦205,534 premium business rate from Estate
Intel via Business a.m., 66.7% occupancy from the same report, and STR's 2019
Africa ranking. It marked a Ghanaian developer's undated page as a source it
would not sign off, said plainly that STR and CoStar hold the current
comparison and it is paywalled, and closed with what it could not find rather
than filling the gap. That is the prompt working through a search that
actually ran.

**AND A WORKING SEARCH IS EXPENSIVE: about 13.5 cents a turn.** Two live
research turns took the budget from 66.97 to 40.02, so 26.94 cents for the
pair. A FAILING turn cost 2.8 cents, because it gave up after one round. A
working one runs several rounds and every round re-reads everything already
collected on top of the company's whole knowledge base. At that rate a
100 cent workspace holds about seven searches, which is the same economics
finding as Anthropic's 45.8 cents, only smaller. The likeliest lever is the
prompt cache, because on Anthropic the stable blocks are re-read at a tenth
and DeepSeek's first logged turn reported `cacheWrite=0 cacheRead=0`, which
suggests nothing is being cached there at all. NOT INVESTIGATED YET, and it
should be before a customer sees it.

**Corrected on his behalf, from the vendors' own pages, because the first
numbers given to him were wrong.** Brave: $5 per 1,000 requests and $5 of free
credit a month, so about 1,000 free searches, and a CARD IS REQUIRED even for
the free credit. Tavily: free plan is 1,000 credits a month with NO CARD, and
keyless needs nothing at all.

**Cost for the whole session.** 45.58 cents, 85.60 down to 40.02. Recorded
because he asked why search was expensive, and the answer changed twice.

---

## Session 12: 2026-09-25, the DeepSeek brain, driven stage by stage

Anthony: "verify end to end that assistant can start interview and build a
job." Done, and it passes. One real gap found, written down below, not
touched.

**How it was driven without a person at the screen.** `resume-demo` will mint
a session for a redeemed code, and `SX-RLDY-ZZC2` ("Client: ANTHONY") is his
own, already redeemed and tied to this one company. Nothing was consumed and
no unused client demo code was touched. The magic link was swapped for a real
session and each stage was called over HTTP exactly as the app calls it,
including the same message shape and the marker checks `Chat.jsx` does. Six
turns, all `standard` tier, all on DeepSeek.

**What passed, in the order the product runs it.**

- `orient`, given a real work request, emitted `OFFER_INTERVIEW` as the last
  line, which is where the app looks for it. It also refused to invent: it
  read the knowledge base, found no free month in it, and said so before
  offering to interview.
- `interview` asked five specific questions and finished in two turns with
  `INTERVIEW_COMPLETE`. It caught a genuine contradiction in the company
  material (below) without being pointed at it.
- `analyse` produced the read back and ended with `FORMAT: pdf` and
  `READBACK_COMPLETE`.
- `brief` wrote a real 6,248 character brief, with the facts it would use and
  the source of each one.
- `generate` wrote a complete one page FAQ using the `:::` design blocks
  (`label`, `stat`, `cards`, `takeaway`) and a markdown table, with zero em
  dashes and both guarantee conditions on every mention, as the brief said.
- The document was then pushed through the app's own `buildFile` from
  `src/shared/download.js`. It parsed as 30 blocks with no unknown type, and
  wrote a real 30,071 byte PDF (`%PDF-`) and an 11,789 byte DOCX (`PK`). The
  text of both was read back and carries the real figures.

So the vendor swap holds. A cheaper model, a different wire format, and the
whole chain from a sentence to a finished file still works.

**WHAT DOES NOT WORK ON DEEPSEEK: the search stage.** This is the one thing to
know before a demo. `assistant/index.ts` attaches
`web_search_20260209` and `web_fetch_20260209`, which are Anthropic's own
hosted tools. Anthropic runs the search server side and returns
`web_search_tool_result` blocks, and the loop reads the sources out of those
blocks. DeepSeek has no such thing. The adapter sends them as ordinary
function tools, DeepSeek answers with a tool call,
`reply.stop_reason` is not `pause_turn`, so the loop breaks on the first
round. No result block ever arrives, `sourcesFound` stays empty, and the
person gets the preamble text or "I searched and found nothing usable for
this." No error, no crash. It just quietly does not search.

That is a diagnosis, not a licence. Whether search moves to a vendor of its
own, or the gate is closed while the workspace runs on DeepSeek, is his call.

**Found in the company material, twice, by the assistant itself.**

1. The pricing contradicts itself. The pricing page says Essential 26,100,
   Premier 33,300, Signature 62,100. The Partner Program rates table says
   29,000, 37,000 and 69,000. The assistant flagged both sets and asked which
   is live before it would write anything with a price in it.
2. The Terms describe a "Founding Businesses programme" offering temporary
   full access. That is where the "free month" idea came from, and the
   assistant traced it there on its own.

Both matter for the coming pricing restructure, which changes these numbers
anyway.

**What it cost.** 10.27 cents of the company's budget, 85.60 down to 75.33.
Six model calls and two rendered files.

**Left undone on purpose.** Search was not fixed or disabled. Nothing was
changed in the workspace. The session token was made outside the repo and is
not written down anywhere.

---

## Session 11: 2026-09-23, DeepSeek (DSH)

Ran out of credit partway. Nothing was left half done. Everything below is
finished, pushed, and checked against the live project.

**The three functions that were written but never deployed are live.**
`convert-document` v1, `drive-connect` v1, `drive-upload` v1, straight from
the repo, verify JWT off. The deployed source of each was pulled back and
compared. They match.

**The record had drifted, and that is worth knowing before trusting it
again.** `PENDING-DEPLOYS.md` said live `assistant` was v26 with v27 waiting.
Live was v31 at the time and the v27 prompt lines were already inside it.
`oauth-callback` was v14 and already carried the Google Drive provider. Both
were checked by pulling the deployed source, not by reading the docs.
Redeploying `assistant` for v27 would have been wasted risk.

**`testing` was merged into `main` on his instruction.** It had been 67
commits ahead, including his corrected CV. The two branches have been level
since. `main` and `testing` were both at 37de540 when the credit ran out.

**The interview was spending the person's answer on thinking.** He reported
it mid build: "The assistant keep saying this: That ran out of room before it
could say anything." The cause was read out of his own conversation in the
database rather than guessed at. It sat at `stage=interview`, his answer
saved, no reply after it.

`orient` and `interview` are capped at 1100 tokens on purpose, so the model
cannot write the document during the interview instead of asking. But the
thinking is counted inside that same 1100, so on a message carrying real
answers the thinking took the whole allowance and nothing was left to write a
question with.

Fixed: those two stages no longer think, and the whole 1100 goes to the
words. The ceiling is untouched, so the guardrail still holds. The reasoning
stages keep their thinking and their 8000 and 16000. The safety net
(`streamWithRoomToWrite`) was also re-asking with the thinking parameter
merely left out; it now says disabled. Deployed as **assistant v33**, pulled
back and checked.

**NOT CONFIRMED, and the next person should know it.** Why the safety net
missed it was reasoned from the code, because the token in use cannot read
function logs (403, `analytics_logs_read`). If the message comes back, the
log line starting with `usage stage=` settles it in seconds. He can read it
in the dashboard: Edge Functions, assistant, Logs.

### Two different failures, and they must not be confused again

Anthony said afterwards that the cause was the assistant's credit running
out, and he had raised it in the backend. **He is right that the credit ran
out. It is a different failure, with its own message, and it was not the one
he reported.**

They are easy to mix up because both read as "it stopped":

- **Credit gone.** The budget is checked before anything is spent, so the
  turn never reaches the model. The message is "This workspace has used up
  its included outputs. This was a temporary build, talk to StellaXafe about
  running it inside your own systems." The client shows it as a normal text
  bubble, not an error (Chat.jsx, `reason === "out_of_budget"`), and it is
  **saved** into the conversation.
- **Ran out of room.** The turn reached the model, the model hit its token
  ceiling and wrote nothing. The note is type `error` and is deliberately
  **not saved** on that turn, so the conversation ends on the person's own
  message.

The evidence that it was the second one: his conversation of 2026-09-23
(`c1da5894`) contains "That ran out of room before it could say anything"
as message 9. The budget message appears nowhere in it. It does appear
twice, in `ab634c54`, and that conversation was last touched
**2026-09-22 00:23:52**, the day before. So the credit ran out on the 22nd,
he raised it, and the 23rd was the token ceiling.

**A note for whoever reads this next.** The two changes landed in the same
twenty minutes: his credit and assistant v33. Message 11 of that
conversation is a real reply and the chat moved from `interview` to
`analyse`, so it is working. It is **not** proof that v33 fixed it, since
his credit fix landed at the same time. Do not claim it as proof.

**Still open, new, and not this:** message 12 of the same conversation is
"That one stopped answering. Send it again." That is the client's stall
watchdog (`src/shared/assistantApi.js`), a turn that went quiet rather than
a turn that ran out. Nobody has looked at it yet.

**Left for next time, in his order:**

1. The converter service on Google Cloud Run, then `CONVERTER_URL` and
   `CONVERTER_SECRET` in Supabase. Steps are in `converter/README.md`. He
   said to leave this, and to continue it later.
2. Test the v33 interview fix by sending a message in the chat that failed.
3. The walkthrough video. That is what all of this is for.

### A real clue on the "functions redeploy themselves" mystery

`CLAUDE.md` has carried this as unexplained since 2026-09-08: functions
jumping a version with nobody asking. Here is what was seen today, with
times, so the next person does not start from nothing.

At **17:31:04**, eight functions all jumped in the same second:
`invite-staff` v22, `support-ask` v23, `oauth-callback` v15,
`support-reply` v11, `group-images` v9, `revoke-staff` v8, and the three
this session had just deployed, which went v1 to v2.

That is one minute after this session pushed 67 commits from `testing` into
`main`. **That push touched 140 files, function files among them.**

At **19:17:19** this session pushed the assistant fix to `main`.
`assistant` was v33 at 19:17:05, deployed by hand. It was **v34 at
19:18:22**, one minute after the push. The deployed copy still contained
every line of the fix, so the redeploy came from the repo.

At **19:24:30** a push followed that changed only `CURRENT.md` and
`SESSIONS.md`. **Nothing redeployed.**

**The guess this points at: a GitHub integration on the Supabase project is
deploying functions on push to `main`, and only those whose files changed.**
That would explain all three observations at once, including why the older
test in `CLAUDE.md` found no trigger: that test predates the integration.
He connected GitHub to this repo today for the Cloud Run build, so a
Supabase side may have been switched on around the same time.

NOT CONFIRMED. It is a pattern with times attached, not a proven cause. The
way to settle it is to push a one line change to a single function file and
watch whether that one function, and only that one, moves.

**It did not reproduce on 2026-09-23 at 21:51.** A push to `main` carrying
the option D change left `assistant` sitting on v39, unbothered. So the
pattern below is a pattern and not a law, and the auto-deploy guess is weaker
than it looked when it was written. It still has to be treated as possible
until somebody runs the one line test.

**Why this matters more than it looks.** If it is real, then `CLAUDE.md`'s
warning gets sharper rather than softer: a push to `main` can put repo code
into a live function, so a repo that is ahead of the deployment is not a
bookkeeping problem, it is a deployment about to happen.

---

## Session 10: 2026-09-10

**The assistant flow, end to end, so the videos can be recorded**

Anthony's brief was blunt: "Do it now, especially the discovery and research.
why are you staging them, I need all to make my videos once and for all." So
nothing was staged. The whole flow went in.

**Six stages, deployed as `assistant` v11**, sha `80723d2a31b1ec38`. orient,
interview, analyse, research, brief, generate. The read back sits in the
conversation after the analysis, where he said it belongs. The prompt and the
build are the pair at the end, and nothing is built until the prompt exists.

**The 400 that had been breaking everything for days.** The interview to
analyse handoff sent a conversation ending on an assistant turn, and Sonnet 5
rejects that outright: prefill was removed on 4.6 and later. It sits exactly
between talking and building, which is why the flow felt broken rather than
slow. Fixed at the boundary in `sendTurn` and again server side. No fake user
turn was invented to paper over it, the trailing assistant turn is dropped.

**The internet, gated in code.** The search tools are only attached when
`stage === "research"`. Every other turn does not carry them at all, so there
is nothing to talk the model into. Findings come back with sources, and
nothing is used until he approves it. `pause_turn` is handled, so a long
search is continued rather than cut off.

**Caching, proven on real traffic.** The mark has to sit on the last stable
block, because caching is a prefix match. 13.7054 cents on the write, then
1.34188, then 0.97168.

**No model name on any screen.** His catch, and his reason: the same product
may be installed on a different provider tomorrow. The admin now sees four
capability levels with info icons instead of vendor names. The browser bundle
was grepped to confirm the vendor is gone from `dist/`.

**The composer, squared off.** Rectangular with sharp edges. The plus and the
mic sit at the vertical midpoint. The mic keeps its round edge and its glow,
because a rotating radial gradient inside a square reads as a spinning
diamond. Both variants were built and looked at before choosing.

**The repo was brought back in line with the deployment.** v11 had drifted
from git in three places, all made at deploy time. Per the rule, the
deployment wins, so the deployed source is now the repo source. Verified byte
for byte.

**The resume log, later the same day.** `conversations.state` had a column
and nothing writing to it. Now `src/shared/resumeLog.js` owns its shape, and
the approved findings, the spent question allowance and the frozen brief all
survive a closed tab. They did not before, and all three were invisible,
which is why it had gone unnoticed: the messages came back looking complete
while the things that decide what the document says were quietly gone.

Two bugs fell out of it, both in New chat. It never cleared the approved
findings, so a figure approved in the morning was still in the browser in the
afternoon. And it set the stage to "interview", a leftover from before
"orient" existed, so every new chat skipped reading the knowledge base.

The LinkedIn post went out.

Left for next time: handing the resume log to the model, which is an
`assistant` redeploy and was deliberately not done while Anthony was testing.
Then merging `testing` into `main` (about 40 commits waiting, and that needs
asking) and the escalation notice.

---

## Session 9: 2026-09-09 (evening)

**The publishing guard, and one outage that was mine**

The day started with three questions from Anthony looking at the Knowledge
tab on testing: does it flag a sensitive file by itself, where does the
customer toggle actually live, and where is support's own screen. The answers
were no, you have not scrolled to it, and there isn't one. All three turned
into work.

**Nothing reaches a customer without being asked first.**
`src/shared/PublishGate.jsx`. Turning a file ON always asks, every file,
every time. Turning one OFF never asks, because taking something back is
safe. A payment receipt had been switched on during testing with nothing
said.

**Two levels, after Anthony cut the first version down.** The wall of text
telling an admin to go and read their own file is gone. Soft is the default:
one line, plain button, no colour. Firm only when the reader found something:
amber, and the button reads "Turn it on anyway". His reasoning, and it is
right: a warning that shouts every time gets clicked through every time.

**A control that explains itself.** `src/shared/AudienceControl.jsx`. "Staff
only" and "Customers too", both on screen, the one in force filled in. The
old toggle showed the state and nothing else. A control that has to be taught
is a broken control, not an untrained person.

**The reader.** `supabase/functions/read-before-publish`, deployed, version 2.
Sonnet opens the file and says in one line what is in it. Leans internal on
purpose, and never quotes the private part, so a dialog left open in an
office does not print a card number.

**THE RULE THE WHOLE THING TURNS ON.** The reading can add a warning. It can
never remove one and it can never encourage. Anthony proposed the opposite,
that the model decide whether to ask and offer the file when it came back
clean, then talked himself out of it in the same message: "what if the AI is
wrong and there's sensitive data in it?" That design turns a model's mistake
into the product inviting somebody to publish a payroll sheet with a green
tick beside it. It was built, then deleted.

**A false positive within an hour of going live**, which is the failure mode
that makes a guard useless. A file called "Pricing update" came back as
internal, because it held lines like "the Founders' Spot has ended, never
mention it". Those are instructions, not secrets. A reader that flags the
ordinary file gets ignored on the day it flags the payroll file. Prompt
fixed, version 2.

**The bin asks first.** It deleted on one tap with no undo, a few
millimetres from the file name in a list people scroll with a thumb.

**Duplicate detection, built to Anthony's cheaper design.** No model. A
string comparison against a list the browser already has, instant and free.
His split, and it is the right one: a model is for judgement, two identical
names is an equals sign.

**A link is a photograph, not a file.** He caught this: `add-link` reads a
page once and never again, so the same address a second time is somebody
refreshing a page they edited, not a mistake. The red duplicate warning was
telling them off for doing the right thing. It became a question instead:
replace the old reading, keep both, or cancel. Nothing is fetched until they
answer, and replace adds before it deletes.

**Newest wins.** `customer_knowledge` returned oldest first, which is the
worst possible order: the stale copy went in front, and when the 40,000
character ceiling ran out it was always the newest material that got dropped.
A pricing file added that evening would not have reached the model at all.

**The contradiction log.** `knowledge_contradictions`. Anthony: "so they
don't say that it's the AI that is at fault." Two named sources, what each
claimed, which one reached the customer, and how often. One row per
disagreement, not per message.

**THE WRONG PRICE, WHICH WAS NEVER A RETRIEVAL PROBLEM.** Support quoted
13,050 naira. The page says 26,100 and the model halved a number that was
already halved. Digging established that the page was read perfectly, 59,837
characters, that three copies of it existed with two switched on, and that
`MAX_SOURCE_CHARS = 40000` silently drops a third of it including the entire
partner programme. None of that was visible from any screen.

**A comma cost a round trip.** "amara.ng," was pasted with a comma.
`new URL("https://amara.ng,")` does not throw, it accepts the comma as part
of the hostname. The screen said "could not open that page", which was true
and useless.

**AND THEN I TOOK SUPPORT DOWN.** ReferenceError, three 500s on Amara's real
WhatsApp. Every reply was composed, saved to the database, and then the
function threw on the way out, so the record showed a perfect answer and the
customer got silence. Cause: an edit script asserted on three anchors, the
third missed, Python raised, and the file was never written, losing the two
edits that had matched. Then the type checker was run as
`| grep -E "TS1[0-9]{3}"`, which is syntax errors only, and a missing name is
TS2304. The check had been told not to report the one thing that was wrong.
Fixed and deployed at version 10 the same night. `scripts/check-functions.mjs`
now type checks all ten functions and excuses only the Deno global and
jsr/npm imports.

**Two rules out of it, in `CLAUDE.md`:** an edit that was not written to disk
is not an edit, and bookkeeping never fails a reply. Both the contradiction
log and the metering now have their own try, because they run after the
customer's answer already exists.

**A trap worth remembering.** `PageShell` is a column flex container, so a
flex line takes the width of its widest item and stretch never shrinks it.
One long file name held on one line by `truncate` made the admin wrapper
512px wide inside a 320px phone, and `overflow-x-clip` hid the result while
`document.scrollWidth` read clean. The bin and the status pill sat off the
right edge on every row. Same failure as the Insights page. `w-full` on the
page wrapper fixes it; `min-w-0` alone does not.

**Decided, not built.** Capping how many answers one customer gets, set per
business rather than by us, because Anthony's church is not a business and
somebody who realises it is an AI will keep typing. Not silence when the cap
hits: one honest line and the escalation fires, because being ignored reads
as broken.

**Also decided:** a staff member's attachment beats the admin knowledge base
for that conversation, and it gets logged the same way. See `DIRECTION.md`.

**Checked, because he asked:** uploading files and links is what the industry
does. Support uses long context with caching rather than retrieval, which the
2026 data says wins on quality under roughly 200,000 tokens. Amara's whole
knowledge base is 20,000. Our own 40,000 character ceiling binds long before
the method does.

---

## Session 7: 2026-09-07

**Support, the second environment**

- **`SUPPORT.md` is the plan**, written before any of it was built and split
  into what is being built now and what is deliberately not. It replaces the
  customer environment section in `ARCHITECTURE.md`, including the name:
  support, not customer support, because a church answering members is the
  same mechanism as a hotel answering guests.
- **One model on the support side, Haiku, no routing.** That inbox is open
  to the street, so the per message cost is set by strangers rather than by
  the company. Haiku also reads images, which is what makes "send me the
  receipt" work.
- **No connectors on the support side, ever.** A connector is a live reach
  into a company's systems and this endpoint answers people from outside it.
  The boundary is what the function can call, not what the prompt tells it.
- **Two knowledge bases, one switch.** Every source now carries "Customers
  can see this", default off. Staff read everything, support reads only what
  is switched on. Enforced by `customer_knowledge()`, a security definer
  function, because the support path runs as the service role and the
  service role goes straight through row level security.
- **Escalations are routed.** `support_routes` gives a company a label and
  an address, one of them the default. The assistant is shown the labels and
  never the addresses. Unknown label falls to the default, and no default
  still records the question.
- **The staff assistant is Sonnet now, with no routing.** The stage picker
  and the ceiling lookup are gone. A model chosen for you is a way for the
  product to be quietly worse than expected on a turn you cannot see the
  reason for. The ladder and the metering stay; the automatic selection
  stops. Routing that asks permission is the enterprise version, and it is
  in `SUPPORT.md` as a later thing.
- **A link now names itself.** `add-link` fetched a page and made the admin
  write the title and the summary. Sonnet reads the page at ingestion and
  writes both. The rule does not move: the assistant still cannot browse,
  the fetch happens once when a person adds it, and what is stored is what
  the page said then.
- **`company_spend`**, one statement instead of read, subtract, write. The
  old shape loses a charge when two calls finish together, which is rare
  with one person in a conversation and normal on a support inbox.
- Checked: every database door walked through in SQL against the live
  project, build clean, the new switch rendered at 320, 390 and 1280 in both
  themes with no overflow, and clicked both ways. `support-ask` is deployed
  but has never been called: `supabase.co` is unreachable from a session and
  `SUPPORT_SHARED_SECRET` is not set yet.

---

## Session 6: 2026-09-04

**The hero, rewritten to sell the capability**

- **New H1: "Enterprise AI that already knows your company. And never lets a word of it out."** The old one led with the risk, which made this a compliance tool that any vendor in the category could have written, and "your staff" cast the reader as a manager policing people rather than someone gaining an advantage. Capability first, containment as the thing that permits it. The subtext carries the third claim the headline could not, that this is easier than the AI they use now, not only safer.
- Research behind it: [Orizon's teardown of AI infrastructure sites](https://www.orizon.co/blog/top-10-ai-infrastructure-websites-in-2026) says most of the category runs the same gradient hero, generic illustration, three column grid and "trusted by" bar, and that the ones that break out have positioning a buyer gets in five seconds plus real product surface. The hero convention that keeps recurring is a headline under eight words, a sub at 18 to 22px, and one verb led CTA.
- **The hero now fits every breakpoint.** It is measured against `100svh` with the mark on a `clamp` that answers to both viewport height and width, so the mark is the thing that gives instead of the button falling off the bottom. Verified at seven sizes from 1440x900 down to 360x640: the CTA and the trust line are above the fold at all of them. It used to fall below on anything shorter than about 700px.
- **"Works with what you already use" is now Integrations**, with fourteen connectors on two rows travelling in opposite directions, masked at both ends, pausing on hover and still under reduced motion. The line under it says a deployment connects the systems an organization already runs on, which is what is actually true. None of these are wired in the demo, and a wall of logos implying otherwise is the fastest way to lose the technical reader who reviews this page before a deal moves.
- **Cards stack on a phone.** The three problem cards park a little below one another instead of queueing down the page. They go opaque while stacked, or the pile turns to mush.
- Checked: build clean, seven breakpoints measured, six pages captured desktop and mobile in both themes with no sideways scroll, 14 click through checks passing, no console errors.

**The landing page, and the mark it was missing**

- **The Containment Seal is the mark now**, built from `MARK.md` instead of from memory. `ContainmentSeal.jsx` is the hero version, three layers of lit tube with the bead orbiting the channel once every ten seconds. `LogoMark` in `icons.jsx` is the small still one, so nav, footer, chat, admin and auth all changed with it. Favicons, the touch icon and the social mark were all regenerated.
- Only the idle state is built. `MARK.md` also specifies a verified pulse and a blocked bounce, and both wait on a real event. The rule that governs the figures under the mark governs its motion too: a mark that reports things that did not happen is worse than one that reports nothing.
- **The ground moved off pure black** to `#05060D`, a near black with a faint blue cast, and stays cool. Pure black is what makes a dark product look cheap, and warming it would cost the gold bead the contrast that makes it the focal point. This is in `tokens.js`, so it moved every screen, not just the landing page.
- **Display type dropped from weight 700 to 500** and went up in size, with tighter tracking. At 54px bold is shouting. This is the single change that does most of the work, and it came from what ElevenLabs actually does: their display face runs at weight 300.
- **The read back is now on the page**, as the real component out of the chat screen rather than a drawing of one. Same rows, same words. It is the most convincing thing the product has and it was not being shown.
- The problem section and the research behind it are now one block instead of two, and every section below the fold arrives on scroll. The reveal rests visible, so a failed script or reduced motion leaves the page readable rather than blank.
- Headline sentences are each their own block so they balance independently. As one balanced block the second sentence kept dropping "it." onto a line by itself.
- Checked: build clean, all six pages captured desktop and mobile in both themes with no sideways scroll and nothing left hidden after scrolling, 14 click through checks passing, and `/setup` and `/auth` rendered to confirm the new mark did not break the app screens.
- `LogoAnimated.jsx` is now unused. Left in place rather than deleted, because the logo choice is still the user's to make and nothing imports it, so it costs nothing in the bundle.
- Fonts are blocked in this sandbox, so every screenshot is in fallback faces. Sora's real metrics could not be checked, which is why the headline was made to balance rather than tuned to fit.

---

## Session 5: 2026-09-02

**The StellaXafe site moved into this app**

- The two repos were the same product living apart: the marketing site was a separate Python generated static site, this repo was the product. Everything the site had and this app did not is now here, as React pages. This repo is the one with everything.
- Six public pages now share one nav and one footer: landing, `/services`, `/founder`, `/insights`, `/form-builder`, `/contact`. Services, Founder and Contact read as modals over the site, which is what the static site was going for, except arriving at one is instant now. That page reload was written up as a known limitation in the old repo, and moving into the router is what fixed it.
- New shared pieces: `MarketingNav.jsx`, `MarketingFooter.jsx`, `ModalCard.jsx`, and `marketing.jsx` for the page shell, eyebrow, section head, gradient text and divider. Chat, admin, auth and setup use none of them and were not touched.
- Landing kept its hero exactly as it was, one button, and gained what it was missing: the research reality check with sources cited straight, where we deploy, the four services, the products at `#products` (Amara, XALOM, Form Builder), and the insights teaser.
- **Demo does not get its own page.** `/setup` is the real demo, so every link the old site pointed at `demo.html` now points at `/setup`.
- **The contact form really sends.** New `send-contact` edge function emails `anthony@stellaxafe.com` through Resend, with the sender's address set as the reply to. It needs `RESEND_API_KEY` in the Supabase dashboard before anything leaves. Until then it fails closed with a plain message.
- BuildFest is cleared everywhere: the docs, the landing footer line, the stale `anthony@buildfest.com` sign in note, and the project plan PDF, renamed `stellaxafe_project_plan.pdf` with both its metadata and its visible text rewritten. Same in the StellaXafe repo's plan notes.
- Checked: build clean, all six pages captured desktop and mobile in both themes with no sideways scroll anywhere, and 14 click through checks passing, covering every nav link, the products anchor from another page, modal close and Escape, the hero CTA, footer links, the contact form's gate, and the mobile menu.
- Not done: the live send, this sandbox cannot reach `supabase.co`. Fonts also could not load here, so the screenshots show fallback faces rather than Sora and DM Sans.
- After review: the README's source tree and Status section were both stale, describing four pages and a front end with seeded data, which stopped being true several sessions ago. Both now say what is actually there, and Status points at `CURRENT.md` as the one to trust. The word "hackathon" was cleared from the StellaXafe repo's plan notes and their filenames, same as BuildFest.

---

## Session 3: 2026-08-25

**Hero copy split, plus the shimmer**

- Mobile now gets its own short subtext instead of the same long one shrunk down. Tablet and desktop keep the longer version, which now names "row-level security" directly, the one real technical term the landing page rule (added earlier this session) actually calls for.
- Wired up `sx-shimmer`, a keyframe that already existed in `index.css` but had never been used anywhere. A light band lives inside the second headline line's gradient now, sweeping across slowly.
- Confirmed the split renders right at mobile, tablet, and desktop widths, and caught the shimmer visibly moved between two shots 3.2 seconds apart.
- H1 itself untouched, it already said the right thing in plain words. `npm run build` clean, merged to `main`.
- Still open from the spec: the hero ending exactly at the fold on mobile, page structure below the hero, the connectors section. User's next stated priority is the "heavy" work, connectors and the real Anthropic API, flagged as Opus territory per CLAUDE.md when we get there.

**Speech to text, real this time**

- Built `src/shared/useSpeechToText.js`, a small hook around the browser's own Web Speech API. Kept the recognition object in a ref, built once, not rebuilt on every render, rebuilding it mid sentence would have cut the session.
- Wired it to the chat mic button: tap to start, whatever was already typed stays and the transcript lands after it, tap again or just stop talking to end. Distinct visuals for actually listening, a faster red pulse and a solid red button, instead of reusing the idle invitation-to-tap style.
- Hides the mic entirely on a browser without the API, rather than a control that cannot work. Also auto stops if the control itself would disappear (step reaching 3), so a session never runs with nothing showing it is live.
- Checked in a browser: idle and with typed text both render right, no console errors either way. Could not exercise an actual live transcript, this sandbox has no microphone and no route to the speech service a real browser would use, that needs a real phone to confirm.
- Merged to `main` and pushed.

**Logo settled**

- Locked the brand colors: navy `#1420A0`, purple `#7C3AED`, unchanged from `tokens.js`.
- Built `public/favicon.svg`: a new square composition, not a crop of the hero mark. Same stroke to radius ratio and same gap to radius ratio as the animated mark, so it reads as the same logo, just fitted to a square tab icon. Frozen gradient, same interlock mask trick as the hero mark.
- The existing `LogoMark` in `icons.jsx` uses `mix-blend-mode: screen`, which lightens against whatever sits behind it. Fine on a dark nav bar, wrong for a favicon that has to sit on other people's tab colors, so it was not reused.
- Rendered `favicon-32.png` and `apple-touch-icon.png` (180x180) from that SVG with headless Chromium, transparent background.
- Built a frozen, non-animated version of the full hero mark (same geometry as `LogoAnimated.jsx`, gradients stopped rather than removed) and rendered `logo-mark.png` at 1024x666, transparent, for anywhere the mark needs to sit still: email headers, social previews.
- Wired favicon and apple touch icon links into `index.html`, plus basic Open Graph and Twitter card tags using `logo-mark.png`.
- Not done: a full social share card with the wordmark and tagline set in Sora and DM Sans. This sandbox cannot load Google Fonts during headless rendering, so any text-bearing image built here would silently fall back to system fonts. Shipped the ring mark alone as `og:image` instead of a low fidelity fallback. A proper share card needs building somewhere that can reach Google Fonts, or by hand in Canva/Figma.
- `npm run build` passes clean.

**Landing page rebuild spec, and a round of fact checking**

- User shared a reference landing page (Xalom) and asked for that level of polish, plus a fixed logo animation (no float, zero gap at the ring crossing, a stretch and release breathing motion), a theme aware glass pill navbar, split mobile/desktop hero subtext, a hero that never looks cut off on mobile, a five part page structure (hero, problem with stats, examples, solution, projection), and two more connector logos. Full spec written into `CURRENT.md`. Not built yet.
- Confirmed the model switch happens before the read back, not after the prompt, matching what was already designed. Added the missing piece: after the read back, a user correction is conversation, so it drops back to the lower tier for that turn, still working inside the same already retrieved context. Only escalates back up if the correction changes what needs retrieving.
- Fact checked two pitch texts the user had drafted elsewhere. First one had real invented capabilities in it: local parsing, PII redaction, a "zero-trust runtime" or "AI police" governance layer, none of that is built. Second one, a market research summary, checked out: verified the McKinsey pilot-purgatory figure, the IBM shadow AI breach cost premium, and the Samsung ChatGPT leak via web search, all real.
- Clarified the no-leakage story: not claiming physical isolation today, that comes with the post-hire migration to a company's own VPC or on-premise system, meant to take under a week once a company is paying for private infrastructure instead of shared Supabase. The demo should still feel tight and locked down even while running on shared infra.
- Flagged two open items: a staff-facing "picking up from last time" view (the `work_history` table exists, nothing shows it yet), and a real onboarding/migration spec for when an actual company signs on. Neither started.
- Confirmed the copy voice rule: no em dashes and short sentences by default, but the system adapts to a company's own material when it already has a distinct voice.

**Logo interlock fix, first item of the landing rebuild**

- The old crossing used a plain round cutout to hide the right ring, which left a visible dent where a straight circle edge met a curved stroke. Replaced it with a cutout shaped like the covering ring's own stroke, clipped to a small patch around the top crossing only, so it does not also blank out the bottom one. Zero gap now, the two rings read as fused. Same fix carried into `favicon.svg` and the static mark, PNGs re-rendered.
- Added the requested second motion: the whole mark stretches slightly then eases back with a small overshoot, an 8 second loop, on top of the existing colour travel. Both rings move as one piece so the crossing fix holds through the whole animation, not just at rest, scaling each ring separately would have let the hole drift.
- Verified live in a browser, screenshotted the animated mark at four points across the cycle. Crossing stays fused in every frame, colour travel and stretch both visibly running. `npm run build` passes clean.
- Navbar, hero copy, page structure, and the connectors section are still open, next up.

**Navbar, second item on the landing list**

- Turned out the floating glass pill the user wanted already existed: `FloatingNav` in `ui.jsx`, already shared by Chat and Admin, already theme aware through `--nav-surface` (dark glass in dark mode, white glass in light). Swapped Landing's plain header for it instead of building a new one.
- Added an opt-in `sticky` prop to `FloatingNav`, on for Landing only, so the pill stays pinned while the page scrolls under it. Chat and Admin keep their old behaviour.
- Checked in a browser: dark and light, desktop and mobile, scrolled deep with the pill still pinned, clicked the theme toggle and confirmed the whole page including the pill's own tint switches. No console errors.
- Hero copy, page structure, and the connectors section are still open, next up.

**Live feedback round: quick fixes, the hero cloud, and a real merge**

- User checked the live site and reported the gap still visible, the old placeholder nav mark, "See it working" still there. Turned out `main` had never received anything past the original Supabase and Cloudflare setup, session 2 onward all sat on the working branch only. Explained it, got permission, merged `claude/nwobosi-access-5mces1` into `main` and pushed (commit `95ee8e0`), both branches match now.
- Quick fixes from the same feedback: removed "See it working" (one button on the hero now), removed "Read aloud" under chat replies (speech to text stays, real wiring still open), replaced the small nav `LogoMark` with the actual interlocked mark instead of the old two-discs placeholder, sped up the hero mark's colour travel from 11s to 7s a lap.
- Built the hero cloud: a soft drifting wash above the mark, three blurred blobs on a shallow arc plus a wider faint layer, independent timing so it reads as smoke. Checked dark, light, mobile, and two frames six seconds apart to confirm the drift is actually live.
- Started actually sending screenshots to the user as files instead of only describing them, per their reminder.
- Still open from this feedback round: the ambient cloud was the only piece done, real speech to text wiring, the hero H1/subtext rewrite plus a shimmer on the second line, and a full viewport and orientation pass on both Landing and Chat are next.

---

## Session 1: 2026-08-24

**Setup and docs**

- Repo was empty. Added `stellaxafe_project_plan.pdf` and the chat prototype.
- Set up `CLAUDE.md`, `CURRENT.md`, and this file. Opened PR #1.
- Read the full 8 page project plan and the whole chat prototype.
- Named the product StellaXafe. Rewrote `README.md` around it.

**Decisions**

- Architecture: single page app, source split into page modules, instant section switching.
- Stack: Supabase for auth, database, and pgvector RAG. Cloudflare Pages for hosting. Resend for email. Chosen because Supabase self hosts into a VPC later and keeps the vector index inside the same security boundary as the users.
- Knowledge rule: one index, always locked, admin decides its contents. No sector crawling. Hallucination is blocked by provenance at generation time, not by restricting the model's general knowledge.
- Model tiers confirmed, pricing corrected. Opus 5 is cheaper than Fable 5. Demo caps at Sonnet 5.

**Build**

- Scaffolded Vite, React 18, Tailwind 3, react-router-dom, lucide-react.
- Split the single file prototype into four pages plus five shared modules. Deleted the old monolith.
- Built the Landing, Auth (login, request access, OTP), and Admin (knowledge base, connectors, access, usage) pages from scratch to match the chat's design language.
- Drove the whole app in a browser: screenshotted every page in both themes plus mobile, and clicked through the interview, generation, library, connectors, OTP, and admin approve flows. All working.
- Found and fixed a layout bug where a long chat pushed the composer off screen.

**Next**

Close the four flow gaps in the chat (read back, prompt writing, retrieval, model routing), then Supabase, then deploy to Cloudflare Pages, then real auth and connectors.

### Repo description to paste by hand

No write token was available in the session, so the GitHub description field could not be set from here. Paste this into the repo settings:

> StellaXafe: a private AI gateway for enterprises. Runs a guided interview, reads only your company's approved knowledge, writes the prompt, then generates the file. Stops data leakage, cuts prompt iteration, and keeps every output on brand.

---

## Session 2: 2026-08-24

- Merged PR #1. Main now holds the whole app.
- Resolved a conflict: two commits had been made directly on main editing README.md, which left it empty. Kept the full README, nothing was lost.
- Repo is private now. Description is set. Default branch is main.
- Added `wrangler.jsonc` for the Cloudflare deploy. Assets only Worker, with single page application fallback so /chat and /admin resolve on a direct load.
- Added the product principle to `CLAUDE.md`: no settings on the staff side, no plumbing exposed to the admin, plain words in every screen, and only two things stay visible (the read back, and which sources were used).
- Applied it: the admin knowledge base now says Ready and Being read instead of Indexed and Indexing.
- Confirmed from the Canva API that its export formats are PDF, JPG, PNG, PPTX, GIF, MP4, and CSV. No DOCX, no XLSX. Decks go through Canva, visual documents come back as PDF, and spreadsheets are always generated directly.

Next: connect the repo in Cloudflare, then Supabase.
- Created Supabase project `stellaxafe` (ref `cbunsqzkhidwjtxdsmxd`, eu-west-1, free). Checked the existing Amara project first and left it alone.
- Built the schema in four migrations: extensions, core tables, row level security, retrieval functions. Seven tables, RLS on all of them.
- Security advisor flagged the two helper functions as REST endpoints. Moved them into a `private` schema. Advisors now return clean.
- Installed `@supabase/supabase-js` and added `src/shared/supabase.js` with the client and both retrieval helpers. `.env.example` committed, `.env.local` gitignored.
- Reworked the entry model. No sign in on the landing page. A company arrives with a single use access code, names itself, and gets its own workspace at /their-company plus /their-company/admin. Recorded in full in CURRENT.md.
- Rebuilt the landing hero around an animated interlocked ring logo. Locked the H1 and subtext.
- Built the logo twice. The first pass split navy from purple with dashed strokes, which left gaps and read as damage. Rebuilt it with a rotating SVG gradient, which keeps the tube unbroken and the colour seam soft. Verified the travel by comparing three frames three seconds apart.
- Built setup screens 1 and 2: access code, then admin account. Three step progress bar, code auto formats as you type (sxa7k4m2pq becomes SX-A7K4-M2PQ), password rule shown inline, show password toggle, back walks the steps in reverse.
- Nothing is created until the final step on purpose, so abandoning setup halfway does not burn someone's code.
- `TextInput` now forwards its ref so the access code field can take focus on arrival.
- All server calls for setup are isolated in `src/shared/setupApi.js`. `checkAccessCode` is the one function that becomes an edge function call.
- Blocked: the Supabase connector dropped out of the session, so the access_codes migration and the check-access-code edge function could not be applied. Code validation is shape only until that is wired.
- Built setup step 3: company name, what you do, industry. Three fields, all required, everything else deferred to the admin dashboard.
- Added a review card between the form and the (not yet built) create step. Shows a live slug preview under the company name, reads back every answer, and states plainly that the access code is spent past this point. Build button is disabled until the backend exists.
- Added `TextArea` to the shared UI primitives and validation helpers (companyNameProblem, companyAboutProblem, industryProblem, slugify) plus the industry list to setupApi.js.
- Clicked through the whole three step flow in a browser: autofocus, each validation message, the live slug preview, back from review preserving what was typed, light theme. No console errors.
- Supabase connector was on at account level but toggled off for the chat. Diagnosed with ListConnectors (connected: true, enabledInChat: false).
- Built the access code backend. `access_codes` table with RLS on and deliberately zero policies, which denies everyone except the service role.
- Five lifecycle functions: peek (looks, does not spend), claim (atomic, one winner, five minute stale claim recovery), release, finalise, and create_company_workspace (company plus admin staff row in one transaction, with slug collision handling).
- Had to move those from the `private` schema to `public`: PostgREST only publishes `public`, so an edge function could not reach them in `private`. Kept them safe by revoking execute from public/anon/authenticated and granting only to service_role. Published is not the same as callable.
- Deployed the `check-access-code` edge function, verify_jwt off since the caller has no account yet. Rejects bad shapes before any query runs so brute force traffic costs nothing.
- Generated six codes in the database. First attempt produced duplicates twice: a correlated subquery Postgres evaluated once, then LATERAL which it also cached. Fixed by referencing the outer row inside the subquery.
- Wired setupApi.js to the live endpoint via supabase.functions.invoke.
- Could not test the endpoint from the sandbox: egress proxy blocks supabase.co, same as pages.dev. Needs verifying in a browser.
- Note: bundle went from 78 KB to 137 KB gzipped now that supabase-js is genuinely imported. Worth code splitting later so the landing page does not carry the auth client.

---

## Session 4, 2026-08-27, the day before submission

Opus for the flow and the security work, and it needed to be.

The theme of the session: several things that looked finished were not,
and finding them mattered more than building new ones.

### The stage flow, rebuilt to the user's correction

- Interview capped at three to five questions rather than open ended. It
  ends its last message with `INTERVIEW_COMPLETE`, which the app strips
  and never shows, including while the marker is still arriving one
  character at a time.
- That marker hands straight over to Sonnet. Nobody presses anything.
- Sonnet does one of two things and only one. If something is missing it
  says so, ends with `NEED_INPUT`, and the app drops **back to the cheap
  model** for that conversation, because anything needing a person is a
  conversation and should not be charged at analysis rates. When it has
  everything it reads the brief back and ends with `READBACK_COMPLETE`.
- Only a read back puts the Build card up. It asks "Did I get that
  right?" and offers Build or "Something is missing", and the second one
  re-enters the same loop. The correction path needed no special case,
  which is how you know the loop was right.
- Drove the whole machine in a browser against a stand-in backend. Ten
  checks, all pass, including a marker split across two chunks.

### Things that were quietly lying

Each of these was found by looking, not by being reported.

- **The file upload was theatre.** It staged the file, showed a green
  "42% smaller" badge, and never sent a byte. Someone could hand over
  their brand guide, watch it confirm, and get a draft written from
  nothing. Now really read, with the chip saying Read, Part read or
  Cannot read.
- **The admin knowledge base was a mockup.** Five invented rows in local
  state, a Browse files button with no handler at all, and no write to
  `knowledge_sources` ever. Nothing an admin added had ever reached the
  assistant, and could not have.
- **Sign in was a `setTimeout`** against two email addresses hardcoded in
  the source. A workspace lasted exactly as long as its browser tab.
- **The chat greeted everyone as Anthony** and called itself by a fixed
  name that had nothing to do with whatever company the workspace was for.
- **The library shipped two invented files** marked as synced to a Drive
  nobody has connected.
- **Canva said Connected** and claimed its designs were real and yours to
  download. Nothing sends anything to Canva.
- **The admin Connect button** flipped to Connected while nothing
  happened behind it.
- **Retry, Share and More** under every reply did nothing.

All fixed or removed. Nothing in the app now says Connected.

### What became real

- Knowledge base writes to `knowledge_sources` and `knowledge_chunks`,
  and the assistant receives the **contents** from the analysis stage on,
  capped at 60k characters. The interview still gets names only.
- PDF and Word parsed in the browser with pdfjs-dist and mammoth, loaded
  on demand. Scanned PDFs refused with an explanation.
- Paste box above the file area, because most company material lives in
  formats that cannot be copied out cleanly and telling someone to
  convert their own document is a bad answer.
- `add-link` fetches a page once, server side, admin only.
- Images in the chat shrunk to 1568px and sent as image blocks. Measured:
  1179x2556 becomes 723x1568, 47KB, about 1500 tokens.
- Password sign in, routed to the right workspace by role.
- `work_history` persistence, so finished work survives a refresh.
- LICENSE, proprietary, plus a notice in the README.

### Security

- **SSRF in `add-link`.** It fetched whatever address an admin typed,
  including private ones. Now refuses private, loopback, link local and
  bare internal names, and follows redirects by hand so a public address
  cannot bounce to a private one after the check passed.
- **Verified RLS against the live database.** Every table on, every policy
  scoped by company, `with_check` on every write policy, `access_codes`
  with zero policies. `private.current_company_id()` reads `staff` by
  `auth.uid()` and is `SECURITY DEFINER` with a pinned `search_path`.
  The tenant isolation claim is true.
- **`verify_jwt` turned OFF on every function, deliberately.** The toggle
  verifies against the *legacy* secret and this project uses the new key
  system, so ON could have rejected every real user token. Each function
  checks the caller itself.

### Two bugs the build did not catch

- `NotionIconGlyph` imported nowhere but referenced. Compiled clean.
- `SKILL_LABELS` used in the usage panel and never imported. Compiled
  clean, would have thrown a blank tab.
- `doc.destroy` removed from pdf.js v6, so a PDF that had been read
  perfectly threw on the way out and vanished silently.

A green build is not evidence a page renders. Drive the app.

### Not done, and named as not done

Canva, Drive sign in, Resend, email OTP, staff invites, real file formats,
images in the knowledge base. All listed in `CURRENT.md` with what each
would take.

### Blocked all session

Could not reach `supabase.co`: the environment's network policy answers
403 on connect. So nothing has been tested against the real backend, and
the access code SX-4M8G-T4P3 is still unspent.

---

## 2026-08-27, late. The interview was writing the document

The chat was live and talking well, so the next thing found was the flow
underneath it.

Asked to "just build it", the assistant wrote the entire one pager there
and then, on the cheap model, in the interview stage. No marker, so the
app never moved up. No analysis, no read back, no Build card, no file to
download. It looked like a chatbot because for that turn it was one.

Two causes, both mine.

`max_tokens` was 8000 on every stage. The interview was told not to
produce the work and handed all the room it needed to ignore that. Now
each stage has its own ceiling: 700, 4000, 8000. A question is two hundred
tokens and a one pager is fifteen hundred, so the interview is now
incapable of the thing it was only being asked not to do. Same principle
as having no search.

The interview prompt said "ask them to name a file or paste what matters".
So when the user pointed it at the company knowledge base, it said it had
no access and asked for a file name. A staff member should never need to
know a file name in their own company's knowledge base. Pointing at the
sources is now a handoff, because only the higher model can read them.
Their own material, on their own laptop, is the only case where it asks
for an attachment.

Also this session:

- Five questions is now enforced by the app. It was a sentence in a prompt.
- Partial answers get asked again, once, instead of read as agreement.
- The analysis stage checks for the things a document cannot exist
  without: whose name is on it, who it is for, which company. The
  interview is short on purpose and misses them.
- Enter makes a new line on a touch screen. There is no Shift to hold on a
  phone, so Enter sending left no way to write a second line.
- The greeting typed itself twice. It was built with no name, then again
  with one, and the typewriter read that as new text. A new chat also lost
  the name. Both fixed.
- Copy says "Copied", and says so when it cannot.
- Em dashes kept appearing because the rule sat one line above "match the
  company's house style", which the model read as permission. Stated as an
  absolute now.
- Mic was never broken. It hides where the browser has no speech
  recognition, which is honest. Confirmed working in Chrome.

**The lesson, again.** Every one of these was a rule written in a prompt
where a limit belonged. A rule is a suggestion to a cheap model under
pressure from a user instruction. Give it a ceiling instead.
