# Review of the document workflow, 2026-11-22

Anthony asked: is this an agentic workflow, how many skills and agents make a
document, how the stages run, where it breaks (the look step that marks
problems in red and fixes nothing, one pagers that will not stay on one page),
references on a QR code, what similar open projects do, whether the model is
the problem, and how I would make it better. Read only. Nothing was changed in
the product.

## 1. What the system is

A staged workflow (a fixed sequence of steps, each with its own instruction),
not a group of free agents. One server function, `supabase/functions/assistant`,
runs every step. One model (DeepSeek `deepseek-flash` for every workspace) plays
every role; only the instruction changes. So there is one "agent" wearing seven
hats, one at a time.

The seven stage instructions, in `supabase/functions/assistant/stages/`:

| Stage | File | Job | Room to answer |
|---|---|---|---|
| 1 Orient | `orient.ts` | chat, read the knowledge map, say "if I understand, this is what you want" | 1,100 tokens |
| 2 Interview | `interview.ts` | the few missing questions in one message, with "should I look online?" | 1,100 |
| 3 Research | `research.ts` | web search, only after a yes the server checks | 8,000 |
| 4 Analyse | `analyse.ts` | the read back (what, who, direction, sources, format), then BUILD_NOW | 8,000 |
| 5 Brief | `brief.ts` | the plan the document is built from; nobody else reads it | 8,000 |
| 6 Generate | `generate.ts` | writes the document as Markdown with design blocks | 16,000 |
| 7 Look | `look.ts` | looks at pictures of the finished PDF or slides, lists problems | 4,000 |

After the model, code (not a model) does the rest, in the browser:
`documentModel.js` reads the Markdown, `pdf.js`, `word.js`, `deck.js` draw the
file, `checkDocument.js` fixes wrong totals and flags numbers with no source,
`askedCount.js` reads "4 slides" or "one pager", and `look/lookAtFile.js`
draws the file as pictures for stage 7.

The four skills in `.claude/skills/` (humanizer, new-migration, screens, ship)
are for the coding agents that build StellaXafe. The product does not use them.

A one pager, end to end: 4 to 7 model calls (orient and interview may take
several turns, research only if asked), then code builds the file, then one
look call.

## 2. Where it breaks

**A. The look step only reports. It never fixes.** By design: `look.ts` says
"It never rewrites anything", and `Chat.jsx` `lookAndReport` puts each problem
on the build card as a red line (`tone: "error"`), then "Tell me what to change,
or download it as it is." No second pass exists. This is exactly what he sees.

**B. Some red lines are false alarms.** The model is asked to look at pictures
and list what is wrong. A model asked to find faults tends to find some. Code's
own measurements (text spilling out of a box, text under 11 point) are reliable;
the model's are not checked against anything. Both go in the same red list.

**C. It may not be seeing the pictures at all.** DeepSeek documents image input
since August 2026, but the model name for it is not consistent across its own
pages, and a model without vision answers with an error. An error here is
silent by design ("not looked at"). Nobody has confirmed from the logs that
`stage=look` on DeepSeek receives the images. To check before building on it.

**D. Word and Excel are never looked at.** Only the first 12 pages or slides of
a PDF or deck are.

**E. One page fit is one retry, then silence.** `pdf.js` builds the file; if it
is over the page count, it builds it once more with spacing cut to 55 per cent.
If that is still over, the longer file is handed over with no word to anyone.
Nothing ever goes back to the writer to say "cut 120 words". The writer is told
"about 250 words", but nothing counts the words before the file is drawn.

**F. References break the one pager.** The 250 word budget never mentions
references, and `generate.ts` says to include them in the agreed style. A list
of five references is 100 to 150 words on its own. There is no references
block, so they land as plain text at the end and push onto page two.

**G. One model judges its own work.** The writer and the inspector are the same
model with a different instruction.

**H. The instructions are long and stacked.** `generate.ts` is about 160 lines,
`brief.ts` 120, plus the shared base. Many rules are dated fixes for one past
incident ("Seen 2026-11-11"). Each is sensible alone. Together they compete,
and a cheaper model follows fewer of them. Most are about wording; the things
that actually break (size, fit) are left to the model's judgement.

**I. Numbers worked out from the sources are flagged.** A difference or a share
is not found word for word in the sources, so it joins "Worth checking".

## 3. What similar open projects do

- **PPTAgent and DeepPresenter** (icip-cas, EMNLP 2025, Feb 2026): start from a
  real reference slide and edit it, rather than drawing from nothing. The newer
  DeepPresenter renders, looks at the result and revises against what it saw,
  which it reports cuts defects after rendering. A loop, not a report.
- **Presenton** (Apache 2.0): designs are fixed HTML and Tailwind templates; the
  model only fills them. Works with any provider, including local models.
- **Anthropic's pptx and docx skills** (already reused here for slide design):
  build, render to pictures, inspect, fix, render again.

The common pattern: **design is fixed by templates with sized slots; the model
fills slots; code measures; the model is sent back with the exact fault.** That
is why small models can do well in these systems.

## 4. Is it the model?

No public test puts DeepSeek against Claude and GPT on documents. A vendor test
(ChatSlide, 2026) puts GPT and Claude Opus on top for single shot slides; the
academic benchmark (PresentBench) scores products, not models. The evidence is
thin. The faults in section 2 are all harness faults (the structure around the
model): none goes away with a better model. A better model would only make the
look step's eye more trustworthy.

What would settle it: five fixed briefs (one pager with references, two page
proposal, 6 slide deck, price sheet, letter), run on DeepSeek, a Claude model
and a Haiku class model, scored the same way: page count kept, overflow count,
false alarms, numbers with no source.

## 5. How I would build it

1. **Code counts before it draws.** Each block has a size in lines, worked out
   from the page. The brief's plan becomes a budget ("cards: 3 cards, 30 words
   each"), handed to the writer as numbers, not adjectives.
2. **A fix loop, at most two rounds.** Draw, measure, and if anything is over,
   send the writer only the fault ("Section 2 is 140 words over the page; cut to
   90 and keep the three cards"), rewrite that section, draw again.
3. **The model's eye confirms; code decides.** The look step is asked only about
   what code cannot measure, and a problem it reports is checked once more
   before it is shown.
4. **Say what was fixed.** The build card shows "Fixed: the pricing card ran
   off the page, shortened" in green, and only what is still wrong in amber.
5. **References as their own block.** `:::references`; on a one pager, or when
   they do not fit, a references page is made separately and a QR code with a
   short link sits in a small Sources card. pdfmake (already in the app, 0.3.11)
   draws QR codes itself (`{ qr: "..." }`, checked in its source); Word and
   slides need the small `qrcode` package to make the picture.
   **Open question for him:** the QR needs a public web address. Company
   sources can be private, so where the references page lives (a public link
   on stellaxafe.com, a link in the company's own Drive, or a second page in
   the same file) is his decision.
6. **Fewer rules in the prompt, more in code.** Keep the writing free (tone,
   phrasing, order inside a section); enforce sizes and structure in code. Move
   each dated incident rule into a test where it can be.
7. **A fixed test set** (section 4) run on every change to a stage, so a fix
   for one fault cannot quietly break another.

Sources: arxiv.org/abs/2501.03936 (PPTAgent), arxiv.org/abs/2602.22839
(DeepPresenter), github.com/presenton/presenton, api-docs.deepseek.com/guides/vision,
presentbench.github.io, chatslide.ai/guides/best-ai-model-for-presentations-benchmark.

## 6. The study of the three, second pass (2026-11-22, his ask 16c)

Read from their own repositories, cloned and read, not from summaries.

| | What it is best at | What we take |
|---|---|---|
| **Anthropic skills** (pptx, docx; Apache 2.0) | Design judgement and QA discipline. A floor for text size ("body 14pt, captions 10pt"); at the floor, cut words, split or enlarge, never shrink further. "Your first render usually has a few real issues... fix those, re-render only the slides you changed, and stop." Look at the pictures with fresh eyes, ideally a separate reviewer. | The fix loop's shape and its stop rule (two rounds). Design rules were already taken for the deck (2026-11-11). It assumes an agent that writes code and runs LibreOffice, which a browser app cannot; we keep our own drawers. |
| **PPTAgent / DeepPresenter** (Apache 2.0) | The review contract. Each finding has a severity (blocker, major, minor), a place, a description and a suggested fix. "A pass with major or blocker issues is rejected." "A missing key or failed visual call is a failed review, never an implicit pass." Delivery is strict unless the person accepts a draft, and then the failed checks are disclosed. It recommends `deepseek-v4-flash-vision` as the reviewer model, a separate name from `deepseek-flash`. | Graded findings (MAJOR / MINOR) with a fix, built 2026-11-22. UNSEEN when the model cannot see the pictures. Next: check which DeepSeek model name takes images, and use that one for the look. |
| **Presenton** (Apache 2.0) | Speed and fit. Each layout is a template with a character limit on every text field (`max_length` 10, 17, 100, 159...). The outline comes first, then every slide is written at the same time, ten at once. | Character limits per block, given to the writer as numbers. Writing a deck slide by slide in parallel is the biggest speed win available. |

So the combination: Presenton's templates and limits for the shape and the
speed, PPTAgent's graded review for the check, Anthropic's design rules and
"fix, re-render, stop" for the quality. Our drawers (`deck.js`, `pdf.js`,
`word.js`) are already templates in Presenton's sense; what is missing is
the limit on each slot and the parallel writing.

## 7. Speed, and a time on screen (his ask 16d)

His target: every stage under two minutes, the build included, with an
estimate on screen, search included.

What is known: the 2026-11-10 live run's search took 87 seconds. No other
stage has a measured time: the server logs tokens per stage, not seconds.

What similar tools do: Presenton writes every slide at once after the
outline; Gamma and similar tools stream the outline first, then fill.
Anthropic's QA re-renders only the slides that changed.

What fits here, in order of payoff:
1. **Measure first.** Each stage's real time, logged by the app and kept,
   so estimates come from real runs, not guesses.
2. **The estimate.** Shown on the working line: "About 40 seconds" before,
   counting down while it works, "Taking longer than usual" past it. From the
   last runs of the same stage and size, with a fixed starting guess until
   there are enough.
3. **The fix loop has a budget.** Built: no new round starts after 75
   seconds of looking and fixing.
4. **Faster building.** Slides written in parallel, section by section, the
   way Presenton does, once the plan (the brief) fixes each slide's layout.
   This is the change that can bring a ten slide deck under two minutes.
5. **The look sees only what changed** on the second pass.

## 8. Built 2026-11-22: the fix loop (16a)

- `stages/look.ts`: each finding graded MAJOR or MINOR, with where and a fix;
  UNSEEN when it cannot see the pictures; told that a clear page is normal.
- `stages/revise.ts`, a new stage: puts the listed faults right, answers with
  only the sections it changed, inside the same approved brief.
- `src/shared/docs/look/fixLoop.js`: reading the look, the page fault (code
  counts the pages against what they asked for), swapping sections in by
  heading, what counts as fixed. Tested in `scripts/tests/fix-loop.test.mjs`.
- `Chat.jsx` `lookAndReport`: look, fix, look again, at most two rounds,
  75 seconds; green "Fixed:" lines, amber "Still worth a look" lines, no red.
  The Library and the database now keep the fixed document, not the draft.
- Walked in `scripts/__harness/look.cjs`: a slide fault fixed, a one page PDF
  over its page cut to fit, a fault that stays shown in amber.
