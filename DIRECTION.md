# Direction

Why this exists, what it is actually for, and where it is going. Read this
before working on product copy or on the assistant flow.

`CURRENT.md` says what is built. This file says what it is meant to be.
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
- **Near zero hallucination.** Output is constrained by a brief that was
  read back and confirmed, not by hope.
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
