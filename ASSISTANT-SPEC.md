# The assistant, specified

Written 2026-09-10, out of Anthony's brief. Nothing here is built yet.
Read `DIRECTION.md` first, this is that direction turned into work.

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
Everything after it is charged at full price, every single turn.

`sourceContents` is after it. So the company's whole knowledge base is billed
at full input price on every analysis turn and every writing turn.

The comment in the file says "every turn after, cached, about 1 cent". That is
what was intended. It is not what the code does. At 200,000 characters on
Sonnet that is about 10 cents a turn, not 1.

### There is no written prompt

`DIRECTION.md` step 5 says: on approval it writes one detailed prompt, and
that prompt is the second guardrail. There is no such thing in the code. The
stages go interview, analyse, generate. The read back is shown and then thrown
away. Nothing carries the approved brief into the writing stage as a
constraint.

Your words: "when it's writing the prompt and it's asked not to use a certain
number, maybe it can correct." Today there is nowhere for that correction to
live.

---

## 2. What you asked for

Set down in your own words, so the build can be checked against it.

- "The person doesn't need to point at admin's own document. They only point
  at their own documents."
- "The reason we left the admin's own knowledge that the model can read
  everything is because it can decide to check, to know if there's anything
  company data, colours, stuff like that."
- "Based on content, the model basically uses what the staff uploads as
  preference."
- "If it has gotten all the information that it needs, it can also ask
  questions of style. How do you want it?"
- "When files cannot be uploaded, it can suggest, okay, so and so link, so and
  so platform. It can search online, pull out a number, and then put the
  source, and then ask the person to verify."
- "If they are giving a go-ahead, it can add the information and use it.
  Otherwise, if there is no go-ahead, it should not add it."
- "Let it be as intelligent as it can be."
- "I want the model to just remain as intelligent as it is, but with those
  form of constraints to avoid hallucination."

The shape of that: take the fences off the intelligence, keep the fences on
the facts.

---

## 3. Phase 1: the flow

This is the whole of the first build. It is edge function work plus a small
amount of chat work. No new tables except one.

### 1.1 The interview can see everything

Delete the stage test on line 599. The company material rides on every turn,
interview included.

Why this is right and not just expensive: the person should never have to know
what is in the knowledge base. That is your rule. An interview that cannot see
it has to ask them about things the company already answered, which is exactly
the prompt engineering the product exists to remove.

### 1.2 Move the cache mark, and hold it for an hour

The mark moves to the last block that does not change:

    { type: "text", text: base },
    { type: "text", text: sourceContents, cache_control: { type: "ephemeral", ttl: "1h" } },
    { type: "text", text: stageInstruction },

Two changes in one line.

**The mark moves down**, so the company material is inside the cached prefix
instead of after it.

**The life goes from 5 minutes to 1 hour.** A cache entry (a stored copy of
the prompt the model keeps, so it does not have to read it again) normally
dies after 5 minutes. A person reading a question and thinking about their
answer takes longer than that, so today's 5 minute life would expire in the
middle of nearly every real interview and charge the full write again. An hour
covers a whole session.

The money, for a company that fills the whole 200,000 character ceiling:

| | today | after |
|---|---|---|
| first turn | about 0.8 cents | about 20 cents |
| every turn after | about 0.8 cents on interview, 10 cents on analyse and generate | about 1 cent |
| a session of 5 questions, an analysis and a write | about 24 cents | about 26 cents |

Almost the same money, and the interview stops being blind. For a company the
size of Amara, about 20,000 tokens, divide all of it by ten.

The ceiling is still a ceiling. A company with 30,000 characters sends 30,000
and pays for 30,000.

### 1.3 The precedence rule, written into the prompt

Three sources of company fact, and they rank:

1. **A file the staff member attached in this conversation.** Highest. It is
   the newest and most specific thing anybody has said, handed over by
   somebody who is looking at it.
2. **The company knowledge base**, newest first where two files disagree.
3. **What the person typed.**

The base prompt gains a short block saying this in plain terms. Attachments
already carry their contents into the turn, so nothing new is plumbed, the
model is simply told which one wins.

The knowledge base is still read for everything else: brand, colours, voice,
house style, templates, standing numbers. That does not change. It is only on
a direct contradiction of content that the attachment wins.

When it happens, it gets logged the same way a support contradiction does, in
`knowledge_contradictions`, so nobody wonders later why one draft used a
different number.

### 1.4 Nobody points at an admin document

The interview prompt today tells the model to hand off the moment somebody
mentions the knowledge base, because it cannot read it. Once it can read it,
that whole passage comes out.

The rule that replaces it is one line: the person only ever points at their own
material. Anything the company holds is the assistant's job to find, not
theirs to name.

### 1.5 Style is asked for, but never as an extra round

Your ask: when nothing is missing, ask how they want it.

The rule:

- If the company material shows a house style, use it and say so in the read
  back. Do not ask.
- If it does not, the interview spends its last question on style. Length,
  tone, format, who signs it.
- Never a separate round after the read back. That is a round the person did
  not agree to.

### 1.6 The written prompt becomes real

A new stage between the read back and the writing, and it is not a stage the
person waits through.

1. The analysis reads the material and reads back what it understood. This
   already happens.
2. The person confirms, or corrects.
3. **A correction rewrites the brief.** Not the conversation, the brief. "Do
   not use that number" lands in the brief as a line, and the brief is what
   the writing stage is handed.
4. On confirmation the brief is frozen and sent to the writing stage as an
   approved brief that it may not exceed.

The brief is stored on the conversation row. One new column, `brief text`.
Nothing else.

This is the second guardrail from `DIRECTION.md`, and it is the difference
between a read back that is theatre and one that binds.

### 1.7 Caps move off the constants and onto the company

Two numbers are hard coded today and both change per deployment:

- `MAX_SOURCE_CHARS` in the function, 200,000.
- `MAX_FILES_PER_MESSAGE` in the chat.

Your point: "if we are deploying in somebody's VPC, it can change." A VPC is a
private slice of a cloud that the company controls, so their limits are theirs,
not ours.

Both move to columns on `companies`, with today's numbers as the default. No
admin screen. It is set at deployment and never seen.

SQL is written and shown before it runs, as always.

---

## 4. Phase 2: the files it cannot read today

Three separate problems that all look like "it did not read my file".

### 2.1 Images

`readFile.js` already knows what an image is. `fileKind` returns `"image"`.
`canBecomeText` then excludes it:

    return ["text", "pdf", "docx"].includes(fileKind(name));

Sonnet can see images. It has always been able to. The exclusion is ours.

**In the chat**, an attached image is sent as an image, not turned into text.
The model looks at it.

**In the knowledge base**, an image is read once at upload and what it holds is
stored as the text of that source. Everything downstream expects text and this
keeps that true. The image itself is kept too, so a later phase can hand the
real picture to the writing stage when it matters.

### 2.2 Shrink and convert, in the browser

Your ask, and it is right. A phone photograph is 4 megabytes and most of that
is resolution the model cannot use.

At the moment of choosing the file, before anything is sent:

- longest edge capped at 1568 pixels, which is the size above which the model
  gains nothing
- converted to WebP (a smaller image format that keeps the quality), quality
  0.8
- HEIC (the format iPhones use) converted on the way

A typical photo goes from about 4 megabytes to about 200 kilobytes. All of it
happens on their device. Nothing extra leaves it.

### 2.3 PDFs that are pictures of pages

A scanned PDF has no text in it to find, so pdf.js returns almost nothing and
the source stores as empty.

The fix: when a PDF yields under a threshold of text, render its pages to
images and read those instead. Same path as 2.1 once the pages are pictures.

Capped at 20 pages, because 100 pages of images is real money and a person
should be told rather than billed.

---

## 5. Phase 3: search, with permission at both ends

Only after phases 1 and 2. It is the biggest piece and it is the one that can
put an unapproved fact in somebody's document.

The sequence is already decided in `DIRECTION.md` and your brief matches it:

1. It says what it wants to look at, and why.
2. **It asks before it looks.** Two buttons. Look it up. Do not.
3. It looks, and finds the specific thing.
4. **It shows what it found, with the source, and asks again.** Add this. Do
   not add this.
5. Only what was added enters the brief.

Nothing skips step 2 and nothing skips step 4. A person opening their finished
document and finding a number they never approved is the failure this whole
product exists to prevent.

The base prompt today says flatly "you cannot go and look". That passage
becomes conditional on the company having search turned on, and stays exactly
as it is for those that do not.

---

## 6. Phase 4: memory

Per person, from `DIRECTION.md`. What was asked, what was decided, which
sources were used. It is a security boundary, not a convenience: one person's
memory must never reach another, for the same reason one company's documents
must never reach another.

Not specified further here. It needs its own spec when the flow above is
working.

---

## 7. Canva, parked

What you want: your own account, free plan, connected once, and anybody using
the platform designs with it and downloads immediately.

One honest blocker, and it needs checking before any work starts. Canva's API
authorises a person, not an app. One shared account used by many people is not
what that authorisation is for, and the free plan has no seats to share.

So this is a question for Canva's terms before it is a question for the code.
It is not a small integration with a licensing footnote, the licensing decides
whether it can be built at all.

Your other note is worth keeping: "using Canva doesn't reduce the cost, it just
makes the work better." So it is a quality feature, not a saving, and it can
wait behind the flow.

---

## 8. What is not in this spec on purpose

- Retrieval. Under 200,000 tokens the whole knowledge base in the prompt beats
  chopping it up, and it cannot miss the file that held the answer. When a
  company arrives with thousands of documents that changes, and the plumbing
  is half there already.
- A settings screen. The staff side has no settings and the caps in 1.7 are
  set at deployment.
- Any model picker. One model, everywhere, still.
