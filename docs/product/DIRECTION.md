# Direction

Why this exists, what it is actually for, and where it is going. Read this
before working on product copy or on the assistant flow.

`docs/state/OPEN.md` and `docs/state/LIVE.md` say what is open and what is live. This file says what it is meant to be.
They disagree in places on purpose.

**The demo is a sample, not the specification.** It shows the shape of the
thing. It is not the ceiling, and the landing page is not a description of
it. The landing page describes what a deployment does for a company that
hires us, and a deployment is a larger thing than the demo wires.

So the rule for public copy is not "only claim what the demo does". It is:

- Describe what a deployment does. That is what is being sold and it is
  what we build.
- Never name a specific integration as though it is already connected. The
  systems a deployment connects to are a requirements question asked of
  each organization, not a decision made here.
- Where something is research rather than product, say so on the page. The
  AI Police section is the only part of this file that carries that mark.

---

## What is actually being sold

Read this before writing a word of public copy, because getting it wrong
makes the page sound like a category it is not in.

**This is not SaaS.** Nobody signs up and uses this. There is no plan, no
seat, no self serve tier. It is built to order: a company comes to us, we
take their requirements, and we build this into their system. What they
end up using is theirs, running where they run things. It is not this
instance with their logo on it.

**So the demo is a blueprint.** It shows the direction and it proves the
architecture runs. It is deliberately not the thing anyone is handed. A
buyer driving it is looking at the shape of what they would get, not at
the product they would receive.

**The architecture already existing is the advantage.** We are not
starting from a blank page for each company, and that is the whole reason
a deployment is fast rather than a twelve month project. The code, the
guardrails, the flow and the isolation model are already built and already
work. Reshaping that into what a company actually needs is a different
size of job to inventing it.

### What is constant, and what is not

Four things do not move, in any deployment, ever. They are the problems
being solved, and they are what the page should be built on:

- **Private.** The company's material stays inside boundaries they
  control, and nothing is trained on.
- **Safe.** Approved sources only, per person isolation, a human
  checkpoint before anything is spent.
- **Hallucination is constrained by design.** Every company fact traces
  back to a source the admin approved, the output is constrained by a
  brief that was read back and confirmed, and where something is missing
  it says so rather than filling the gap.

  Use the word. It is the term a buyer recognises and the one they scan
  for, and a page that never says it looks like a page avoiding it.

  Say it as the mechanism. Not "zero hallucination", and not "near zero"
  either, and not "reduces the risk of hallucination", which is the same
  weakness with more words: a hedged verb reads as a vendor who is not
  sure. "By design" is the part a reviewer can check. The absolute is falsifiable in one sitting, by exactly the
  technical reviewer most likely to test the boldest claim on the page,
  and it takes the rest of the page down with it when it fails. It is also
  what every vendor in this category writes, so it reads as noise. Worse,
  a marketing absolute does not stay in marketing: it ends up in a
  procurement questionnaire and then in a contract, warranting something
  nobody can warrant, to hospitals and legal firms. The mechanism is the
  stronger claim, because a reviewer can check it and find it true.
- **The iteration problem solved.** The back and forth happens in cheap
  conversation before anything is generated.

Everything else is contract dependent. Which systems it connects to, where
finished work is written, what is added, what is dropped, what the
assistant looks like and how it carries out the work. None of that should
be stated on a public page as though it were fixed.

### What this rules out of the copy

Anything that reads as self serve. "No setup team", "live in ten minutes",
"start free", a pricing table, a sign up button. They put the page in the
wrong category, and an enterprise buyer who reads one of them discounts
everything above it. Where a claim is about the demo, say it is about the
demo.

---

## Where it started

Anthony watched a friend upload his company's documents into a public
chatbot. Not carelessly. He did it because it produced better output, and
better output was the job. That is the whole problem in one picture: the
leak is not caused by people being reckless, it is caused by the good
version of the work requiring context the tool does not have.

Every company frowns on it. Nobody has given their staff a way to get the
same quality without doing it.

---

## Two separate things, and they must not be confused

### 1. The product: this era

Protection for enterprise data. Companies, schools, legal firms, hospitals.
The staff member gets output that already knows the company, and nothing
leaves. This is what the demo, the app, and the landing page are about.

### 2. The research: the next era

The AI Police. This is Anthony's own thesis and it belongs on the Insights
page, not in the product copy. It is deliberately forward looking and is
not claimed as something the product does today.

The argument runs like this:

- Agents are given tools. That is the era we are in.
- Agents are recursive. They learn, they evolve, and they can modify
  themselves.
- So an agent may reach a tool that was never granted to it, and never
  permitted, **simply because the tool is reachable**. Not by breaking in.
  By being the kind of system that can extend itself toward what it can
  see. Anthony calls this **using tools by proxy**. He is explicit that he
  does not have full research behind this yet. It is a hypothesis, and the
  page should say so.
- This gets worse the closer the field moves to general intelligence.

Why the obvious answers do not work:

- **Blocking every tool call is not viable.** Agents run on auto because
  an agent that waits for a human on every tool is not worth having. The
  usefulness and the risk come from the same property.
- **Written rules are not enough.** Rules in a `CLAUDE.md` or a
  `rules.md` are prose. They can fail to capture a case nobody thought of,
  and an agent can pass straight through the gap without ever disobeying
  anything that was actually written.

So the answer is a checkpoint that is not a single gate and not just an
API blocker. A checkpoint that **carries its own rules inside it**, and
that adapts rather than sitting still.

Anthony's own shorthand for it: **two factor authentication for AI.**
That is the clearest handle on the idea and it should be used.

---

## The assistant flow this is building toward

**This is not what the demo does today.** Parts exist, parts do not. When
work starts on the assistant proper, this is the target, and it should be
read back to Anthony before anything is rebuilt.

1. **The person asks in plain language** and points at documents in their
   Drive. No prompt writing.
2. **The assistant searches the company's own data** for the surrounding
   context and the foundational material.
3. **It works out what is still missing**, and then it interviews the
   person for exactly that. This is the replacement for prompt
   engineering. Some people build an "interview me" skill on top of a
   model; here it is built into the product rather than bolted on.
4. **It reads the brief back.** This is what I understood, this is the
   picture in your head, these are the sources I will use. The person
   confirms, adds detail, or corrects.
5. **On approval it writes one detailed prompt** from everything gathered
   and everything analysed.
6. **The prompt is the second guardrail.** This is the part that is easy
   to miss and is the actual point: the written prompt constrains the
   build so that nothing reaches the final document that was not approved
   at step 4. The read back is the first guardrail, the prompt is the
   second.
7. **It builds**, and returns the finished work.

### Where the finished work goes

This is architecture, not a detail, and it is the reason the product can
be trusted with a company's material at all.

**The files do not live in the software.** We do not become another place
a company's data is kept. The system reads from wherever the organization
already keeps its data, and it writes the finished work back to the same
place.

Which place that is depends on the organization. Drive, Dropbox,
SharePoint, a database of their own. It is one of the first requirements
questions asked at the start of an engagement, and never assumed. Public
copy therefore says "your own storage", not "your Drive".

**Two deliveries at the same moment.** A download link in the chat, and
the file saved as a draft into their own storage. The person can take it
now or find it where their work already lives.

### Memory, instead of keeping the file

Once the document has left the chat, the assistant still has to know what
happened. So the work is converted into notes it keeps: what was asked,
what was decided, which sources were used. The next conversation starts
knowing that, rather than starting cold.

Two things about this are not optional.

**The memory is per person.** Each staff member has their own. The
assistant must never surface one person's memory to another, for the same
reason it must never surface one company's documents to another. It is the
same isolation rule applied one layer deeper, and it is a security
boundary, not a convenience.

**It is bigger than two files.** `sessions.md` and `current.md` are the
shorthand for the idea, not the design. Treat those names as a way of
describing what is kept, and design the actual store when the work starts.

### What this buys, in the order a buyer cares

- **Iteration collapses.** The retry loop is the most painful part of
  using AI and it is what makes staff give up on it. The back and forth
  happens in cheap conversation, before anything is generated.
- **Fewer tokens burned**, because the expensive model runs once against
  a brief that is already right.
- **Time saved**, for the same reason.
- **Hallucination risk drops**, because the output is constrained by an
  approved brief rather than by hope.
- **Data exposure drops to the minimum**, because only approved sources
  are ever read.

### The objection, and the answer

Someone will say: you are still using somebody else's model. Yes. The
answer is that it runs inside a boundary the company controls, on material
the company approved, and nothing is trained on. That is what **private
repository** means here, and it is the honest framing rather than a claim
that no model is involved.

---

## When two things the company gave it disagree

Added 2026-09-09, out of a real wrong answer on Amara's WhatsApp. Anthony's
rule, and the whole value of it is that it is short.

**Newest wins. Do not overcomplicate it.**

Not "weigh the sources". Not "ask the model to reason about which is more
authoritative". Newest. The person who uploaded the newer file did it on
purpose and more recently, and any cleverness beyond that is a guess dressed
up as a policy.

It holds in both directions, whether the two files are near identical or
whether they merely disagree about a number:

> "When the contents are slightly different and numbers are slightly
> different, but they are saying the same thing, newest wins. There's no need
> trying to overcomplicate this thing."

**One exception, and it is a different axis, not a special case.** A file a
staff member attaches inside a conversation beats the admin's knowledge base
for that conversation. Anthony:

> "Between what assistant uploaded and what admin uploaded, the assistant's
> file should override, because that's what the assistant gave it."

That is right, and it is not really an exception to newest wins, it is newest
wins at a finer grain. An attachment is the most recent and most specific
thing anybody has said, handed over for this task, by somebody who is looking
at it. The knowledge base is standing instruction. The attachment is the
instruction for right now.

It gets logged the same way an admin contradiction does, so nobody has to
wonder later why one draft used a different number from every other one.

**And the load stays where it belongs.** "Much of the work still lies on the
business to actually upload what is correct." No amount of resolution logic
makes wrong material right. All we owe them is that the newest thing they
told us is the thing that gets used, and that they can see when their own
material fought itself.

## How everyone else builds this, and why ours is not behind

Checked 2026-09-09, because Anthony asked whether uploading files and links
is what people actually do or whether there is a better way.

There are two methods in the industry and the split is about size.

**Retrieval, usually called RAG.** Chop documents into pieces, turn each into
numbers, store them in a vector database, and at question time fetch only the
handful that look relevant. This is the default for large corpora. Fifty
thousand documents and a hundred thousand questions a day cannot go in a
prompt.

**Long context with caching.** Put the whole knowledge base in the prompt
every time and let the cache pay for it. The current data says this wins on
quality when the corpus is under roughly 200,000 tokens, reasonably stable,
and the question needs the whole picture rather than one fact.

**Support does the second one, and that is the correct call at this size.**
Amara's entire published knowledge base is about 20,000 tokens, a tenth of
where the method stops paying.

It also happens to serve the thing this product is actually for. Retrieval
can miss the file that held the answer, and a model handed nothing fills the
gap itself. Sending everything cannot miss. So the method that is cheaper to
build here is also the one that fails less often in the way we care about.

**Where it stops.** A company with thousands of documents needs retrieval,
and the plumbing is half there: `knowledge_chunks` already carries an
`embedding` column and `match_knowledge` exists for the staff side.

**The real ceiling today is ours, not the model's.** `MAX_SOURCE_CHARS` in
support-ask is 40,000 characters. One 60,000 character landing page already
loses a third of itself to it, silently. That number is the binding
constraint long before 200,000 tokens is.

## Which model runs which part

Decided 2026-09-10. Not built, and deliberately so.

**Today one model does everything, and that is correct.** Sonnet runs the
offer, the interview, the read back, the prompt and the writing. Anthony:

> "Sonnet is capable of sorting data, writing, doing all interview, and
> everything."

There used to be routing here: a cheap model for the conversation, a capable
one for the work. It was removed because a model chosen for you is a way for
the product to be quietly worse on a turn you cannot see the reason for. That
still holds. Nothing about the section below reopens it.

### The one place a bigger model gets handed the work

For a deployment whose work genuinely needs more than Sonnet, there is exactly
one handover point, and it is not where you would first guess.

1. The read back happens, on Sonnet.
2. The person says go ahead.
3. **The switch happens here.** Sonnet to Opus, or higher.
4. The bigger model writes the prompt.
5. **Generation starts on its own the moment the prompt is finished.** Nobody
   presses anything a second time.

### Why the bigger model writes the prompt rather than only the document

This is the part that looks like a detail and is not. Two reasons, and the
second is the real one.

**It is more creative**, and the prompt is where creative decisions about the
shape of the work actually get made.

**Writing the prompt is when something genuinely missing shows up.** Anthony:

> "The fact that the read back has happened and yes means that if it wants to
> write the prompt, it can still ask another question if it discovered that
> something is missing. Something that genuinely needed."

So the model that writes the prompt has to be able to ask. Handing a bigger
model a finished prompt and telling it to type would waste the one thing it is
better at.

### The prompt is the last part, not the place the work gets done

> "Prompt is usually the last part of it. Everything should be gotten from the
> read back."

**The read back is where the back and forth lives.** It is not one message
somebody approves. It is a conversation: the model says what it understood,
the person adds something, removes something, corrects a number, research
happens if research is allowed, and it goes round again until the thing is
right. Anthony: "just more like an interview kind of back and forth until the
system gets what it needs to produce what it needs to produce."

A question after the prompt is written is allowed, and it should be rare. If
it happens often, the read back is not doing its job and that is the thing to
fix, not the prompt stage.

### It always reaches, and Sonnet is the floor it lands on

Anthony, 2026-09-10. The prompt stage always **behaves** as though it is
escalating, whether or not anything higher exists in that deployment.

1. **It judges the job first.** Exactly the way a model is picked by hand:
   this one Sonnet can do, that one needs more. If Sonnet is enough it goes
   straight on and nothing is said.
2. **If it wants more, it reaches.** Opus, or Fable for something bigger.
3. **If that tier is not enabled here, it lands on Sonnet.** Anthony: "Opus is
   not enabled in this environment, then it falls back to Sonnet." Sonnet is
   the ground. It always gets there.
4. **If the higher tier IS enabled, it asks.** An on screen notice saying it
   wants to go higher and why. The person can accept, or carry on as they are.
   Anthony: "they are also okay with working with Sonnet if the person would
   probably love to continue with Sonnet."

So the reach never fails and never silently costs more. Where nothing higher
exists it is invisible. Where something higher exists it is a choice.

### No model name reaches a screen, and the reason is not house style

Settled 2026-09-10. Anthony:

> "The name should not be shown because tomorrow we might be installing the
> same thing for a company using OpenAI. So I want to keep the same
> architecture, the same design, but just changing the model brain."

That is a stronger reason than the plain words rule, and it changes what has to
be built rather than only what gets written. **The brain is swappable. Nothing
above it may assume which brain it is.**

**The person doing the work sees a capability, never a name.** A higher setting
is available for this job. They approve or they deny. On deny it drops to the
default and says so, plainly, without sulking about it.

**The admin is the only one who sees capability at all**, and they see it as
levels rather than as products. Anthony: "the admin decides, okay, this person
needs better outputs, they can have access to this." That is the
`model_ceiling` column, which already exists and is currently unread.

**Even the admin does not see a vendor's name.** Same reason. A screen that
says Opus is a screen that has to be redesigned the day a customer runs on
something else.

### The copy

Fixed frame, one line written by the model.

    Want me to put more into this one?

    [the model writes one line here saying why this job is heavier
     than usual, in its own words]

    It takes a little longer and uses up more outputs.

    [ Yes, put more in ]
    [ No, carry on ]

On deny, one line in the conversation and nothing more:

    Carrying on as normal.

No numbers, no product name, no vendor, no apology. Denying is not a downgrade
and must not read like one.

### What this costs in code, and it is not nothing

**The ladder is model IDs today, and that is the leak.** In the function
`LADDER` is `["haiku-4-5", "sonnet-5", "opus-5", "fable-5"]`. Worse,
`src/shared/config.js` carries the same names plus `claude-sonnet-5` and
friends and display labels like "Opus 5", **and that file ships in the browser
bundle**. So the vendor is currently baked into the client, not only the
server.

Swapping the brain, as it stands, means editing every one of those places and
every screen that reads them. That is a rewrite, which is precisely what
Anthony said he wants to avoid.

**The fix, when this is built: the ladder becomes levels, not products.**
Something like `standard`, `deeper`, `deepest`. Levels are what the code, the
database column, and any screen ever speak. The map from a level to a real
model ID lives in deployment config on the server and appears nowhere else. A
new customer on a different provider is then a config file, not a change to the
product.

Nothing about this is urgent while one model runs everything. It stops being a
config file and starts being a rewrite the moment a second tier is wired, so it
goes in at the same time as the escalation, not after it.

### What this means for the build, now, before any routing exists

The prompt has to be **its own stage**, with its own boundary, even while one
model runs both sides of that boundary. Get that wrong and adding routing
later is a rewrite instead of a line.

The machinery is already there and unused: the `LADDER`, the `PRICE` table,
`MODEL_ID`, and the `model_ceiling` column on both `staff` and `companies`.
Only the automatic selection was taken out. So when a deployment needs this,
it is a small change at one boundary, not a rebuild.

## Browsing, when it comes

The assistant cannot browse today, and that is stated plainly in
`HOW-IT-WORKS.md`. It is not a rule it follows, it is a capability it does
not have.

When browsing is added it does **not** become free reign. The sequence is:

1. It picks the platforms it wants to look at.
2. **It asks for approval before it looks.**
3. It finds the specific details it needs.
4. **It shows the person those details and asks again**, before any of it
   enters the work.

The reason is the same one behind everything else here: nobody should open
their finished document and discover data in it they never approved.

---

## Still to build

- **Insights authoring.** Anthony writes his own research. He needs to
  write a piece, upload images, place an image at a chosen point in the
  text, and sign the piece. Every research insight carries his signature.
- **Shareable links with previews.** Open Graph and Twitter card metadata
  per piece, because these get posted to LinkedIn and Facebook and a link
  without a preview card looks like nothing.
