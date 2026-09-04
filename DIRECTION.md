# Direction

Why this exists, what it is actually for, and where it is going. Read this
before working on product copy or on the assistant flow.

`CURRENT.md` says what is built. This file says what it is meant to be.
The two disagree in places on purpose, and where they do, `CURRENT.md`
wins for any claim made on a public page.

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
