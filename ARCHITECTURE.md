# ARCHITECTURE

How the thing actually works, in Anthony's own description, written down
2026-09-06 because most of it is not what the demo currently does.

`CURRENT.md` says what is built. **This file says what is designed.** Where
they disagree, this file is the target and `CURRENT.md` is the truth.

---

## What it is, and what it is not

It does **not** train anything on your data. Nothing is fine tuned and there
is no model of yours anywhere.

It is an **orchestration layer over a closed source model**, Claude or
OpenAI class, reached with an API key. Closed source deliberately, not open
weights: the frontier models are the ones good enough that a non technical
person gets an above average result on their first afternoon, and that is
the whole product promise.

So the value is not the model. Everyone has the model. The value is the
process wrapped around it.

---

## Where files live, and where they do not

**Documents are never stored in the platform.** This is the part most
"company AI" products get differently: they index everything into a vector
database that they own. This does not.

- The **admin** connects the company's own sources. Drive, SharePoint,
  Slack, email, whatever the company already runs on.
- **Staff** connect their own tools on top of that, their own mail, their
  own storage.
- Work is produced, handed back as a download **and** written into the
  person's own storage, and then it is gone from us.
- What is kept is small and per person: a session file and a current file,
  enough for the assistant to recall what that one staff member is working
  on. Per staff, never pooled.

---

## The loop, which is the actual invention

A staff member asks for something. **The system does not start building.**

1. **Search the company's own material first.** Everything the admin
   connected, plus whatever that staff member connected.
2. **Compare that against what they asked for, and find the gaps.**
3. **Interview them about the gaps.** Not a form. Questions, because the
   person knows things the documents do not.
4. **Offer to go and get what is still missing.** It can search the public
   web. It can be pointed at a link. It can pull the data itself.
5. **Show them what it found and make them confirm it.** Nothing fetched enters
   the work until a human has looked at it and said yes.
6. **Read the whole plan back.** "This is what I am about to do." They say
   go ahead, or they correct it, and a correction re enters the loop.
7. **Only then write the prompt.** A long, specific one, which becomes the
   single instruction the generation runs against.
8. **Then use the tools.** Word, Excel, Canva, Slack, email. Real files, not
   a description of a file.

**Step 4 is a deliberate concession and it is worth understanding why.**
Refusing to fetch anything would be safer on paper and would fail in
practice: staff are already used to a public chatbot doing it for them, so a
tool that makes them go and do the research by hand is a tool they will quit
and go back to pasting company documents into ChatGPT. That is the exact
behaviour this product exists to stop. So it fetches, and step 5 is the
price of it.

**This is the anti hallucination mechanism**, and it is a process, not a
model setting. The common failure is not the model inventing a fact in a
sentence. It is somebody typing a vague request into a chatbot that knows
nothing about their company and accepting whatever comes back. Interviewing,
confirming and planning before generating removes that, and it is why the
output already sounds like the company.

**It stays on the company's subject.** Ask it something unrelated and it
comes back to the business. That is scope control and it also reduces the
chance of somebody wandering into a conversation where they paste something
they should not.

---

## Who signs in, and how

**The demo and a real deployment are deliberately different, and the demo is
the one that is cut down.**

### The demo, which is what is built

One address, `/demo`. It renders the panel if you run the place and the
assistant if you use it, and an admin can cross to the assistant view. There
is no slug in the URL: the workspace comes from the session, because that is
the only source a person cannot edit in the address bar.

- **Admin:** access code, nothing else. No email, no password. The code
  builds the workspace the first time and opens the same one every time
  after.
- **Staff:** an invitation link, then a code to their email.

**The admin path is short on purpose and only for the demo.** Somebody
trying this has not bought anything yet. Asking them for an email before
they have seen a single screen is where they close the tab, and every field
between them and the thing they came to look at costs some of them. So the
demo trades a factor away to get them moving.

### A real deployment, which is not built yet

The same shape, with the factor put back:

- **Admin: access code, then a code to their email.** The access code says
  which workspace and that this person is an admin of it. The emailed code
  proves they are them. Two factors, and the access code stays valid rather
  than being spent, because it is now an identifier rather than a ticket.
- **Staff: an emailed code**, or the invitation link the first time.

An access code on its own is not enough for a real company. It is a string
that can be forwarded, screenshotted, or left in a chat thread, and an admin
can change what the company's AI knows and who may read it. The demo can
live with that because there is nothing real behind it. A deployment cannot.

Passwords appear in neither, unless a customer's own policy demands them.
See the No passwords section in `CLAUDE.md`.

---

## The privacy story, said correctly

**This section replaced an earlier one that had it wrong.** That version led
with the customer's API key and retention arrangements. That is a detail.
The actual story is the perimeter.

### It is deployed inside their perimeter

A deployment is **built into the customer's own infrastructure**: their VPC,
their on premise, their cloud account. Supabase sells this on AWS and it is
in the low hundreds of dollars a month, which is affordable for the size of
company being sold to. Where exactly it lands depends on the business and
what they can carry.

So the database, the documents, the sessions, the connectors and the
application are all theirs, on their side, under their control. Nothing sits
in a multi tenant system belonging to us.

### The one hop that leaves, and why it is not the same thing

The model is still a frontier model reached over an API, so text does leave
the perimeter for the length of one call. **The claim is not that this never
happens. The claim is that it is governed.**

Here is the distinction, and it is the whole argument:

**A staff member pasting a document into Claude.ai or ChatGPT** is an
individual acting on their own account, under consumer terms, with the
conversation kept in that account's history. The company cannot see it,
did not approve it, has no contract covering it and cannot get it back.
That is shadow IT, and it is the actual thing being replaced.

**An API call from inside the company's own deployment** is the company
acting as the data controller, with the provider as a processor under a
commercial agreement. No training on the content. A data processing
agreement behind it. Defined, contractual retention rather than whatever a
consumer product does by default, and zero retention available on request.
Auditable, because the company owns the system making the call.

**Same model. Completely different accountability.** One is a person making
a decision nobody knows about. The other is a company making a decision it
signed for.

That is the sentence to sell: it is not about whether a model reads the
text, it is about who is accountable for it and whether anyone can see that
it happened.

### What the demo is, and what it is not

**The demo is not built in anyone's VPC and does not need to be.** It runs
on our infrastructure and our API key, and that is fine, because the demo is
not a smaller version of what a client gets. It is a demonstration that we
know how to build the thing.

Never imply otherwise. What a client gets is built for them, in their
perimeter, sized to their business. `DIRECTION.md` already says the demo is
a sample and not the specification. This is the same rule applied to the
privacy claim.

---

## What is actually being bought

**Privacy is the reason they will let it in the building. It is not the
reason they buy.** The reason they buy is further down and it is worth
leading with when the room is commercial rather than technical.

**Time.** A staff member who would spend a day on a report spends an hour.

**Range.** People who could not produce that report at all now can. An
average person gets an above average result, on their first afternoon,
without a prompting course. That is a change in what the organisation is
capable of, not a change in how fast one person types.

**Iteration cost, which is the one people underrate.** Every round of "that
is not what I meant" costs tokens and costs salary, and the salary is the
expensive half. The interview and the read back move that cost to before
the work is done, where a correction is one sentence instead of a rewrite.
The orchestration is automated: the system writes the prompt, so nobody has
to learn to.

**No surprises.** Grounded in the company's own material, with a human
confirming anything fetched, so what comes out is not a plausible invention.

---

## Two environments, and WhatsApp is the customer one

**Corrected. An earlier version assumed WhatsApp was for staff. It is not.
It is for customers, and that changes what it is allowed to do.**

The assistant has two environments. Same knowledge underneath, different
permissions, different room.

### The staff environment

Signed in, on the web. Everything in the loop above: interview, gap
analysis, confirmation, plan, tools, real files out. Staff can **add** to
what the system knows, connecting their own mail and storage on top of what
the admin connected.

### The customer environment

**On WhatsApp, and read only.**

A customer of the business messages the number and talks to the company's
AI. It answers **only** from what the admin put in, and only about that
business. It does not do work, it does not take uploads, and there is no
"build me a deck". A customer cannot add anything to what the system knows,
because a customer is not part of the company.

That constraint is the design, not a limitation. The staff environment is a
workshop. The customer environment is a front desk, and a front desk that
accepts files from the street is a security hole.

**The customer always writes first**, which is what keeps this simple.
WhatsApp only permits free form replies inside 24 hours of the person's last
message, and a conversation the customer started is always inside it. No
message templates, no template approval, nothing to submit to Meta.

### Handing over to a human

The half that makes it sellable rather than a toy.

1. The customer asks for a person, or asks something the AI should not
   answer alone.
2. **The AI says so in the same thread.** One line, in the conversation the
   customer is already in. Not silence, not a form.
3. **The company is notified**, and the human answers from the same place
   they already answer from, so nobody learns a new tool.
4. **The AI is suspended for that conversation while the human is in it.**
   Two voices replying to one person is worse than a slow reply.
5. **After a quiet period, about five minutes, the AI resumes**, so a human
   who wanders off does not leave the conversation dead.

Amara already proves the two hard parts: a message arrives by webhook, and a
reply typed in an admin dashboard reaches the phone. The new part is the AI
sitting in the middle and knowing when to get out of the way.

### How it connects, given Amara already owns the number

**Amara keeps the number, the WABA and the webhook. StellaXafe becomes a
brain it calls.** No new phone number, no second Meta approval, no webhook
secret copied anywhere.

Meta points a WhatsApp app at **one** webhook URL. Aiming it at StellaXafe
would take it off Amara and break a system a business already runs on. So
the direction is the other way round.

Amara already has both halves of the transport, confirmed by reading the
repo rather than assuming:

- `receive-whatsapp-webhook` takes messages in.
- `admin-send-whatsapp` sends them out. This is what already makes a reply
  typed in the Amara dashboard reach a guest's phone.

```
customer's WhatsApp
  -> Meta
  -> Amara receive-whatsapp-webhook        (already approved, unchanged)
  -> POST to StellaXafe, with a shared secret
  -> the customer environment answers, from admin material only
  -> reply comes back
  -> Amara admin-send-whatsapp             (already built)
  -> customer's WhatsApp
```

The two are **separate Supabase projects**, `xdvvidenbpsyzxgkofjj` for Amara
and `cbunsqzkhidwjtxdsmxd` for StellaXafe, so the middle step is an
authenticated HTTP hop. That is the normal shape and keeps them
independently deployable.

### What has to be built

1. **A customer environment in the assistant.** A mode that reads only admin
   material, never staff material, refuses uploads and refuses work
   requests. This does not exist yet and it is the real work, not the
   plumbing.
2. **StellaXafe: a `whatsapp-ask` function.** Sender, message, which
   workspace answers, behind a shared secret. Returns text, or returns
   "hand this to a person".
3. **Amara: a branch in `receive-whatsapp-webhook`.** Route to the above and
   send the reply with the existing sender. Everything else untouched.
4. **The handover state.** Per conversation: who is answering, when the
   human last spoke, and the five minute timer that gives it back.
5. **One shared secret**, and a number to workspace mapping.

### One thing that will bite

**The interview loop reads badly on a phone**, and it does not belong in the
customer environment anyway. A customer asking about opening hours must not
be interviewed. The loop stays in the staff environment, where somebody
asked for work to be done. The customer side answers, or hands over.

---

## What this means for the copy, and one problem with it

The reviewer Anthony was sent got one thing right that matters more than
everything else they wrote:

> Because it still calls closed-source models, "nothing ever leaves" is only
> partially true. The documents may not be stored on their servers, but the
> content of the prompts, the interview answers, and any data the LLM sees
> still goes to Anthropic/OpenAI.

**That is correct and the landing page currently says "Nothing ever
leaves."** As written that is a claim a technical reviewer can falsify in
one question, on the page whose entire job is being trusted.

What is actually true, and is still a strong claim:

- Nothing is **trained on**. Anthropic and OpenAI do not train on API
  traffic.
- Nothing is **retained by us**. No document sits in our database.
- Nothing is **pooled**. One company's material never reaches another's, and
  one staff member's memory never reaches another's.
- With a **zero data retention** arrangement or an enterprise endpoint, the
  model provider does not keep it either, and that is a real thing that can
  be bought and named.

The honest version of the headline is about the **boundary**, not about
physics. "Nothing is trained on, nothing is retained, nothing is pooled" is
harder to attack and is still the thing a buyer cares about.

See `DIRECTION.md` for the standing rule: never put a claim on a public page
that a reviewer can falsify.

---

## The rest of the reviewer's points, and which are worth planning for

**Worth planning for:**

- **Confirm and publish the data handling.** Zero data retention on the API
  account, or an enterprise endpoint. This is the single remaining trust
  question and it is answerable with a fact rather than an argument.
- **The interview loop against messy reality.** Incomplete metadata,
  contradictory sources, and the lazy user who types "go ahead" without
  reading. That last one is the real risk: a confirmation step nobody reads
  is not a confirmation step. Worth testing deliberately with bad data.
- **Connector reliability.** The loop is only as good as what it can see.
- **Who owns the orchestration after handover**, and what happens when a
  model API changes under it.

**Not worth acting on:**

- The reviewer's "almost zero hallucination is overstated" is right, and
  `DIRECTION.md` already forbids the numeric claim. Nothing to change.

---

## What the demo does not do yet

Recorded so nobody reads the section above and assumes it is built.

- Connectors are not live. Canva and Drive are registered and unwired.
- Delivery into the person's own storage is not built. Work downloads.
- The web fetch, the confirm step and the source suggestions are not built.
- **The customer environment does not exist.** There is one assistant and it
  is the staff one. The WhatsApp side needs the read only customer mode and
  the human handover before any of the transport above is worth wiring.
- The interview and read back **are** built, and are the part of this that
  already runs.
