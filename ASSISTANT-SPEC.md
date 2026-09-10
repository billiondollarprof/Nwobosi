# The assistant, specified

Written 2026-09-10, out of Anthony's brief, revised the same day after his
second brief. Read `DIRECTION.md` first, this is that direction turned into
work.

Phase 1 is approved and is being built. Phases 2 to 4 are not.

---

## 1. Three things wrong today, and one of them costs money

### The interview is blind

`assistant/index.ts` line 599:

    if (stage !== "interview" && readySources.length) {

The interview sees the names and the one line descriptions of the company
material. It never sees a word of what is inside. So it cannot know what is
already answered, and it asks for things the company already told us.

That single line is the reason the flow stalls. It is also why a person ends
up with Markdown in the chat instead of a document: the interview never hands
off cleanly, so the run never reaches the writing stage, and the download
button only appears on writing stage output.

### The company material is not cached, and we are paying full price for it

Line 688:

    system: [
      { type: "text", text: base, cache_control: { type: "ephemeral" } },
      ...(sourceContents ? [{ type: "text", text: sourceContents }] : []),
      { type: "text", text: stageInstruction },
    ],

Caching is a prefix match. The mark sits on `base`, so only `base` is cached.
Everything after it is charged at full price, every turn. `sourceContents` is
after it.

The comment in the file says "every turn after, cached, about 1 cent". That is
what was intended. It is not what the code does.

### There is no written prompt

`DIRECTION.md` step 5 says the written prompt is the second guardrail. It does
not exist. The read back is shown and then thrown away, so a correction after
it has nowhere to live.

---

## 2. How long a session lasts, and what the cache does about it

Checked 2026-09-10, because Anthony asked.

**A real session is 25 to 45 minutes.** Research on document drafting, which
is exactly our case: a writing task that took 80 minutes takes about 25 with
AI. Technical writing goes from 90 minutes to 30 to 45 including editing.

**The cache life slides.** It refreshes every time it is used, and the refresh
is free. So the hour runs from the last message, not from the first. A person
answering a question every ten minutes never loses it. That is true of the
5 minute life too, the difference is only the size of gap it survives.

**An hour therefore covers a whole session with room.** 5 minutes does not,
because a person reading a question and thinking about the answer routinely
takes longer than that.

**Coming back the next day loses the cache, and that is fine.** It costs one
more write. What must survive is the conversation, and that is section 3.

---

## 3. The resume log

Anthony: "is there something like a progressive log to always remember where
things left off and also know that the knowledge base was previously read and
the task is not yet completed since the last read?"

**What already works.** Messages and stage are saved on every turn and
restored when the conversation is opened. The model does see the whole
conversation when somebody comes back. It does not start cold.

**What is missing.** There is no short record of what was settled. The model
re-derives it from twenty messages every turn, which is slow and drifts. And
nothing records which sources it already chose, or what the person declined to
give it.

So a working note is kept on the conversation, and read back to the model at
the top of every turn. Small, a few hundred tokens, never a copy of the chat:

- what is being made, in one line
- the brief so far
- which company sources it picked, by name
- what is still missing
- what the person was asked for and declined

It sits after the cached block, because it changes every turn. It is cheap
enough that this does not matter.

---

## 4. Phase 1: the flow

### 4.1 The model reads first, then offers

The biggest change in the brief, and it flips the order of the whole thing.

Anthony: "The model can even ask the person after they have checked the
knowledge base and see what the person needs. Would you like me to interview
you? To make your output even better."

Today the entry point is a blind interview. It becomes:

1. **Orient.** A new stage, and the entry point. The model reads the request
   and the whole knowledge base. It says what it understood and what it
   already has. Then it offers: I can interview you and the work will be
   better, or I can get on with it.
2. **They say no.** It says plainly what it still needs, and gets on with it.
   No nagging.
3. **They say yes.** It interviews.

### 4.2 The interview asks, then offers to stop

Anthony: "to make the questions not to be too long or boring... between three
to four times asking questions and getting. Can always attach, if you would
want me to continue like this, I can."

After 3 rounds it must offer, not continue. And the offer is informed: it says
what the work looks like with what it has now, and what another round would
add. Then they choose.

The hard ceiling stays at 5. A promise a model can talk itself out of is not
a promise.

### 4.3 Read back, correct, confirm again, then the prompt

Anthony: "correction after read back is one more confirmation with a question
before the prompt is written and it's free to still ask questions."

So a correction is not a silent edit. It goes:

1. It reads back what it understood.
2. They correct it. "Do not use that number."
3. **It confirms the correction back**, and it is free to ask something else
   at this point if the correction opened a question.
4. They say go.
5. **Only then is the prompt written.**

The read back is the brief, in plain words. On go it is frozen and handed to
the writing stage as the thing it may not exceed. That is the second
guardrail from `DIRECTION.md`, made real.

Anthony: "the most important thing is that it doesn't do anything until it
writes that prompt."

### 4.4 When the staff will not give it something

Anthony: "if the model still feels like they still need something, they can
flag it and just go ahead to work with what they have, because the staff said
so. But after they work with what they have, they will still note it down and
let the staff see."

So: flag it, do the work anyway, then under the finished document say what was
missing, what it would have improved, and what to hand over if they want
another pass. Not a refusal, and not silence either.

### 4.5 Agency

Anthony: "the model should have a sense of agency. All the model should care
about the most should be to give them the better output while obeying the
rules."

The base prompt gains a block that says so. It may suggest, advise, disagree,
propose a better shape, and say what it would do differently. It may tell
somebody their idea will not land and why.

The constraints are on two things only: inventing facts, and going outside.
Everything else is its judgement, and it should use it.

### 4.6 The rules are coded, not written

Anthony's sharpest point: "the rules are not just written just like writtens.
They must be coded for the model to always obey them."

He is right, and this is the difference between a prompt and a guarantee. So
each rule gets a mechanism, not a sentence:

| Rule | How it is coded |
|---|---|
| It cannot search without permission | The search tool is not in the request at all until the app sends approval for that specific search. The model cannot talk itself into it, because the ability is not there. |
| Found data cannot enter the work | Results land in a list the model does not control. Only a click moves an item into the brief. |
| Nothing is written before the brief | The writing stage refuses to run without a frozen brief. |
| The interview cannot write the document | The writing ceiling for that stage is 700 tokens. A document does not fit. Already built. |
| The interview cannot run forever | The app counts the turns and moves the work up regardless. Already built. |

### 4.7 The material rides on every turn, and it is cached

Delete the stage test on line 599.

Move the cache mark to the last block that does not change, and give it an
hour:

    { type: "text", text: base },
    { type: "text", text: sourceContents, cache_control: { type: "ephemeral", ttl: "1h" } },
    { type: "text", text: resumeLog },
    { type: "text", text: stageInstruction },

The money, for a company that fills the whole 200,000 character ceiling:

| | today | after |
|---|---|---|
| first turn | about 0.8 cents | about 20 cents |
| every turn after | 0.8 cents interviewing, 10 cents analysing and writing | about 1 cent |
| a full session | about 24 cents | about 26 cents |

Nearly the same money, and the model can see. Amara is about a tenth of that.

The ceiling is still a ceiling. 30,000 characters sends 30,000 and pays for
30,000.

### 4.8 Precedence

Three sources of company fact, and they rank:

1. **A file the staff member attached in this conversation.** Highest. It is
   the newest and most specific thing anybody has said, handed over by
   somebody looking at it.
2. **The company knowledge base**, newest first where two files disagree.
3. **What the person typed.**

The knowledge base is still read for everything else: brand, colours, voice,
house style, templates, standing numbers. It is only on a direct contradiction
of content that the attachment wins. When it happens it is logged in
`knowledge_contradictions`, same as support.

### 4.9 Nobody points at an admin document

Anthony: "the person doesn't need to point at admin's own document. They only
point at their own documents."

The passage telling the interview to hand off whenever somebody mentions the
knowledge base comes out. It can read it now.

### 4.10 Style is asked for, but never as an extra round

- House style visible in the material: use it, say so in the read back, do not
  ask.
- No house style: the interview spends a question on it.
- Never a separate round after the read back.

### 4.11 Caps move onto the company

`MAX_SOURCE_CHARS` and `MAX_FILES_PER_MESSAGE` are constants today. Anthony:
"if we are deploying in somebody's VPC, it can change." A VPC is a private
slice of a cloud that the company controls, so their limits are theirs.

Both become columns on `companies`, defaulting to today's numbers. No admin
screen. Set at deployment, never seen.

---

## 5. Phase 2: the files it cannot read today

### 5.1 Images

`fileKind` already returns `"image"`. `canBecomeText` then excludes it:

    return ["text", "pdf", "docx"].includes(fileKind(name));

Sonnet can see images. It always could. The exclusion is ours.

In the chat, an attached image is sent as an image. In the knowledge base, it
is read once at upload and what it holds is stored as the text of that source,
because everything downstream expects text. The image is kept too.

### 5.2 Shrink and convert, in the browser

Longest edge capped at 1568 pixels, converted to WebP at 0.8 quality, HEIC
converted on the way. About 4MB down to about 200KB. All on their device.

### 5.3 PDFs that are pictures of pages

When a PDF yields almost no text, render its pages to images and read those.
Capped at 20 pages, because 100 pages of images is real money.

---

## 6. Phase 3: search, with permission at both ends

Anthony: "before it does anything outside the environment, it should ask for
permission... and even when it brings the data in, it should show the data and
even write it with a different colour."

1. It says what it wants to look at, and why.
2. **An approval appears on screen.** They click approve. Until that click the
   tool does not exist in the request.
3. It looks, and finds the specific thing.
4. **It shows what it found, with its source, in a distinct colour**, so the
   person can see at a glance that this came from outside.
5. They add it or they do not. Only what was added enters the brief.

The base prompt says flatly "you cannot go and look" today. That becomes
conditional on the company having search on, and stays exactly as it is for
those that do not.

Where search is off, it still helps: it names the platform worth checking, the
search terms, and what a good answer looks like. That is already built.

---

## 7. Phase 4: memory

Per person, from `DIRECTION.md`. What was asked, what was decided, which
sources were used. A security boundary, not a convenience. Its own spec when
the flow above is working.

---

## 8. Canva

Anthony's own account, connected at the back end, used by him for testing and
demos. That is fine and it is what that connection is for.

The licensing question only applies to many customers designing through one
account, which is not intended. It returns the day a customer wants Canva in
their own deployment, and then they connect their own account.

His note worth keeping: "using Canva doesn't reduce the cost, it just makes
the work better." A quality feature, not a saving.

---

## 9. Left out on purpose

- Retrieval. Under 200,000 tokens the whole knowledge base in the prompt beats
  chopping it up, and it cannot miss the file that held the answer. That
  changes when a company arrives with thousands of documents.
- A settings screen. The staff side has no settings.
- A model picker. One model, everywhere.
