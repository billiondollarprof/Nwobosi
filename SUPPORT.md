# SUPPORT

The second environment. Everything decided about it so far, written down in
one place, split into what is being built now and what is being deferred.

`ARCHITECTURE.md` has the older version of this, written when it was still
being called the customer environment and before the model and knowledge
decisions were made. Where the two disagree, this file is the current one.

---

## The name

**Support.** Not customer support.

A church answering members, a school answering parents and a clinic
answering patients are the same mechanism. "Customer" narrows it to one kind
of organization and the product is not narrow. Every table, function, prompt
and screen uses the word support.

The one exception is `customer_knowledge()` and the `customer_visible`
column, which shipped before this was settled. They are the right shape and
renaming live database objects for tidiness is not worth a migration. Read
"customer" there as "the person on the outside".

---

## What support is

**One sentence: a customer asks, and if the answer is in what the company
published, it answers, and if it is not, it escalates.**

That is the whole product. It is not a smaller assistant. It is a different
job.

| | Staff assistant | Support |
| --- | --- | --- |
| Who | Signed in, works for the company | Anybody, from outside |
| Where | The web app | WhatsApp today, web and email later |
| Does | Real work, files out | Answers questions |
| Reads | Everything the company holds | Only what the admin published |
| Adds | Staff can connect their own sources | Nothing, ever |
| Connectors | Yes | No |
| Model | Sonnet | Haiku |
| When stuck | Asks the person | Escalates to a human |

---

## Decisions

### 1. One model, and it is Haiku

No ladder, no routing, no ceiling arithmetic on the support side.

Three reasons, in order of weight:

- **Cost.** This inbox is open to the street. Volume is not controlled by
  the company, it is controlled by whoever decides to message the number.
  A per message cost that is fine at fifty messages is not fine at five
  thousand.
- **Latency.** Somebody is holding a phone waiting for a reply. A fast
  answer is part of the answer.
- **It is enough.** Reading published material and answering from it is
  retrieval, not reasoning. The hard judgement, "is this beyond me", is
  one decision, not a chain of them.

Haiku also reads images, which matters more here than anywhere else. A
customer photographs a receipt or an error screen rather than typing it out,
and support has to be able to look.

### 2. No connectors

Connectors belong to admin and to staff. Support gets none.

A connector is a live reach into a company's own systems. Handing that to an
endpoint that answers strangers is the single worst thing that could be
built here, and no amount of prompt wording makes it safe. Support reads
stored text. Nothing else.

### 3. Support does not upload

A customer can attach an image to a message and support can read it in that
conversation. That image is part of the conversation and never becomes
company knowledge.

The front desk does not accept files from the street and file them.

### 4. Two knowledge bases, one toggle

Every source has a switch in the admin screen. Default off.

- **Staff read both.** Everything the company holds, published or not.
- **Support reads only the published ones.**

The toggle is the entire interface. No second upload flow, no separate
library to keep in step, no chance of the same document existing twice in
two states. One file, one switch.

Wording in the screen stays plain: **Customers can see this** against each
source, and **Staff only** when it is off. No mention of scope, visibility
levels, or anything that reads as configuration.

Enforced by `public.customer_knowledge(company_id)`, a security definer
function, because the support endpoint runs as the service role and the
service role bypasses row level security. An RLS policy here would be
comfort, not enforcement. The filter is inside the function and is not a
parameter, so no call site can widen it and no future edge function can
forget it.

This is already built and applied. `PaymentReceipt26-08-2026` sitting ready
in the live Amara workspace is why it defaults to off.

### 5. Escalate the question, not the conversation

Already built. Restating it because everything else leans on it.

- An escalation is one question, not the thread. A customer whose billing
  question went to a human can still ask about opening hours and get an
  answer.
- There is no mode column and no "who is answering" flag anywhere. Support
  presence is derived: did a support person speak in the last five minutes.
  It expires by itself, so nobody has to remember to hand the conversation
  back.
- `author_role` is stamped by the door the message came through, never
  guessed from the text.

### 6. Escalations are routed by topic

New, and the one addition to the schema this build needs.

A billing question should reach billing. A company sets up named routes,
each one a label and an address. The assistant picks the label that fits, or
the default if none does.

Kept deliberately small: a label, an email address, and one of them marked
default. Not a ticketing system, not queues, not assignment, not SLAs. Those
are somebody else's product.

### 7. Light rules, on purpose

The system prompt tells support who it is, which company it speaks for, what
it can see, and what to do when the answer is not there. It does not carry a
list of forbidden phrases or a policy document.

Piling rules onto a model makes it worse at the job, not safer. The
guardrail here is what support can reach, which is one read only function
over published text with no connectors and no write path. That is a real
boundary. A paragraph of instructions is not.

### 8. The staff assistant moves to Sonnet, with no routing

Today `assistant/index.ts` carries a four rung ladder and picks a rung per
stage. That comes out. Sonnet answers everything on the staff side.

Reason: a routing decision that nobody asked for is a way for the product to
be quietly worse than the person expected, and there is no screen where they
would find out why. One good model everywhere is predictable.

The ladder, the pricing table and the budget metering stay in the code. It
is the automatic selection that stops.

### 9. Links get read and understood when they are added

`add-link` already fetches a page once, strips it to text and stores it as a
source. What it does not do is understand it: the admin still types the name
and the line saying what it holds.

That flips. After the fetch, a capable model reads the page and writes the
name and the description itself. The admin pastes an address and gets a
finished source back.

The rule that matters does not change. **The assistant still cannot
browse.** The fetch happens once, on a server, at the moment a person adds
the link, and what gets stored is what the page said then. A link pasted
into a chat is still just text.

Same for the support side: support never fetches anything. It reads what was
fetched at ingestion.

---

## What is being built now

1. **`support_routes`**, plus a route on `escalations`. Small migration.
2. **`support-ask`**, an edge function. Shared secret, service role, Haiku,
   `customer_knowledge()` only. Takes a company, a sender and a message.
   Returns an answer, or returns that this one is going to a person.
3. **The admin toggle.** Customers can see this, per source.
4. **The escalation email**, through Resend, to the route's address.
5. **Sonnet default in `assistant/index.ts`**, routing removed.
6. **Understanding in `add-link`.**
7. **The Amara branch**, last. About twenty lines in
   `receive-whatsapp-webhook`, guarded so that if StellaXafe is slow or down
   the existing Amara behaviour is exactly what it is today.

## What is not being built now

Recorded so none of it gets half started.

- **Model routing with approval.** The enterprise version of decision 8. The
  assistant notices a step needs more than Sonnet, says so in one line, and
  the person allows it or does not. Never silent, never automatic. This is
  the shape to build when a customer is paying for it, not before.
- **A support console inside StellaXafe.** For now the human answers where
  they already answer, which for Amara is the Amara dashboard. Building a
  second inbox before anyone has asked for one is building the thing nobody
  uses.
- **Web and email channels.** The enum carries them so the column does not
  have to change later. Only WhatsApp gets an adapter.
- **Per organization subdomains**, and the wildcard DNS and worker that
  tenant resolution needs.
- **Deployment inside a customer's own cloud.** Bedrock or Azure OpenAI,
  which is the only arrangement where "nothing leaves" is literally true.
- **Ticketing.** Assignment, queues, statuses, SLAs. Not this product.

---

## The ceiling this build has, found 2026-09-09

Everything above works because Amara owns a WhatsApp number and a send
function of its own. Take that away and it stops working, so the limit is
worth stating plainly rather than discovering it with a paying customer.

### StellaXafe cannot send a customer anything

There is no outbound path. `support-ask` makes exactly two calls to the
outside world and both are Resend, both to the colleague. The customer's
answer travels in one place only: the `reply` field of the HTTP response,
going back to whoever posted the question, in the same request.

Synchronous, or nothing.

So a colleague who replies to the escalation email is replying to
`support@stellaxafe.com`, which nobody reads. The reply is gone. It only
works for Amara because Amara delivers the answer itself.

**A business subscribing to support alone would get escalation emails it
can read and cannot answer.** That is a hole in the product.

### What has to exist first

One primitive, symmetric with how a question arrives. The company registers
a delivery address and a secret; StellaXafe posts an answer to it; the
company's own system puts it in front of the person. The same arrangement as
the inbound secret, pointing the other way.

Only once that exists do either of these become possible:

- **A support console.** They sign in, see what is waiting, type. For a
  business whose staff will use a screen.
- **Reply by email.** The escalation carries a per conversation reply
  address, support hits Reply in their normal inbox, StellaXafe delivers it
  back on the channel the person came in on. Support never signs into
  anything. This is the one for a small business.

### The email address is a preference, not a route

Worth stating because it is easy to get backwards. The address a customer
gives is for when the **answer** is too sensitive for WhatsApp. It is never
how the reply is delivered. Somebody who declines to give one is answered on
the channel they arrived on, exactly like everybody else.

---

## A business whose customers are businesses

Amara sells to hotels. A hotel writes in and asks something about its own
account. The assistant has no idea who that hotel is, because a knowledge
base holds what a company says, not what it knows.

### Their details must never be uploaded

The obvious fix is for Amara to upload every hotel's details as published
material. It must not, for three reasons, and the third is the one that
decides it.

1. It is stale the moment it is uploaded. Plans and numbers move; documents
   do not.
2. It is read on every message, because it lands inside the cached block. A
   thousand hotels' details would be re-read to answer "what time is check
   in".
3. **It leaks between the customers of the customer.** Publish every hotel's
   details and the assistant can tell hotel A about hotel B. Tenant
   isolation would hold at the top level and break one level down, which is
   the exact failure this product exists to prevent, reintroduced through an
   upload form.

### What it should be instead

A narrow lookup, not connectors and not uploads. The company registers one
address. The assistant may ask it exactly one question: the person I am
speaking to is this identifier, who are they and what is their standing. It
cannot ask about anyone else and it cannot reach anything else.

That keeps the founding rule nearly intact. Support still reaches nothing of
its own choosing. It reaches one door the company built, about one person,
the one already in front of it. Hotel A cannot be told about hotel B because
the assistant can only ever ask about the number that just wrote in.

With no lookup configured, today's behaviour is already the right fallback:
say it does not have that, and hand it to a person.

---

## The flow, end to end

```
customer's WhatsApp
  -> Meta
  -> Amara receive-whatsapp-webhook          (already live, unchanged)
  -> POST to StellaXafe support-ask          (shared secret)

       support_thread_upsert                 find or start the thread
       record the customer's message         author_role = 'customer'
       support_state                         is a human in this thread?
         yes -> stop. say nothing.
         no  -> customer_knowledge           published sources only
                Haiku answers, or says it cannot
                  answered   -> record it, author_role = 'ai'
                  cannot     -> open an escalation, pick a route,
                                email the route, tell the customer

  -> reply returns to Amara
  -> Amara admin-send-whatsapp               (already live)
  -> customer's WhatsApp
```

A support person replying from the Amara dashboard is written back with
`author_role = 'support'`, which is what starts the five minute quiet
window. Nothing else has to happen for the assistant to step aside, and
nothing has to happen for it to come back.
