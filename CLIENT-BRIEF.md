# StellaXafe: what it does for your company

Written for a first client. Plain words on purpose. Written to the Humanizer
rules in Anthony's Drive (no em dashes, no staged run-ups, no invented facts).

Everything between the two lines below is the client text. The notes after
the second line are for Anthony only and must not go to the client.

---

## In one paragraph

StellaXafe is a private AI assistant built for your company. Your staff ask
for a document in normal language. The assistant already knows your files,
asks a few short questions, confirms what it understood, and produces the
finished work in your format. Every fact points back to its source so a
person can check it. Your data stays inside your boundary, and nothing is
used to train a model.

## The problem you already have

Your best people are already using AI. The good ones got there first.

To get useful work out of a public chatbot, they paste in what makes the
work good: a client file, a contract, a price list, last year's report. A
tool that does not know your company gives weak work, and the deadline is
today. So they paste it in. Nobody was careless. The job needed the context.

Once that happens, you cannot see it, you cannot take it back, and no
contract covers it. A policy does not survive a deadline.

The second cost is quieter. Staff write a prompt, get something close, and
rewrite it. Then again. Each round costs time, and the result still does not
sound like your firm.

StellaXafe gives your staff the quality they were chasing, without the
paste.

## What your staff experience

1. They ask for what they need, the way they would ask a colleague.
2. The assistant asks three to five questions. Only the ones it cannot
   answer from your own files.
3. It reads the request back: what it will make, who it is for, which of
   your documents it will use. The staff member fixes anything wrong.
4. Only then does it write.
5. The finished file is saved to your own storage, and a download link
   appears in the chat.

Nobody learns prompt writing. The questions do that job, and because the
assistant already knows your company, there are few of them.

## It knows your company

Your admin approves the files the assistant may read: templates, past
projects, price lists, standards, policies. When it writes, it uses your
formats, your numbers and your wording. Staff do not paste any of it in.

Nothing is trained on your data. The assistant reads an approved file when
it needs it. It does not absorb the file into a shared model, so nothing you
upload can turn up in anyone else's answer.

## You can check every answer

The assistant does not fetch information and dump it on you.

1. It gathers the information.
2. It checks it, and marks anything it could not confirm.
3. It shows you the source of each fact, as a file or a link, so you can
   open it and verify it in seconds.

If something is missing, it says so and tells you who in your company to ask
or where to look. It does not guess to fill the gap. Nothing unconfirmed
enters a document until a person approves it.

This matters where a wrong figure costs money or credibility: a load
calculation, a contract clause, a regulatory filing.

## Your data stays protected

- **Each company is separate.** Your workspace is yours. Database rules stop
  one company from ever seeing another's records.
- **Each staff member is separate.** One person's chats and notes are never
  shown to another.
- **Files are encrypted** in storage and while they travel.
- **Nothing you do trains a model.** Your chats and files stay yours.
- **The link to the AI model is private.** On AWS, the assistant reaches the
  model over a private link inside your own cloud network (a VPC, a network
  space only your company uses). That traffic does not cross the public
  internet.
- **Your admin controls what it can read.** A file that is not approved does
  not exist as far as the assistant is concerned.

## Your files stay with you

The software does not become another place your data lives. It reads from
where you already keep files, and it saves finished work back to the same
place.

Each company gets a private cloud storage account on AWS, locked to that
company. Storage on AWS costs a few cents per 10 GB. Staff can also save a
finished file straight to their own Google Drive.

## It fits the tools you already use

The assistant connects to the systems your team works in, so nobody has to
move. Examples are Google Drive, Gmail, Google Workspace, Slack and Notion.
We agree the exact list with you at the start, based on what you use.

## Research from the internet, when you want it

If a task needs outside information, the assistant can research it online.
You stay in charge.

1. It names the sites it wants to look at and asks first.
2. It finds the details it needs.
3. It shows you those details with the link to each, and asks again before
   any of it goes into your document.

You never open a finished document and find data you did not approve.

## You are not locked to one AI model

The assistant is provider agnostic. It can run on the model that suits you,
and you can change models later without rebuilding. Your files, your rules
and your workflow stay as they are.

## What you get back

- **Fewer retries.** The back and forth happens in a short chat before the
  document exists.
- **Less time per document.** Staff start from a request, not a blank page.
- **The same standard from everyone.** Your templates and your wording, no
  matter who asks.
- **An answer for your own clients.** When a client or auditor asks where
  your data goes, you can tell them.

## Where it fits

**Engineering firms.** Progress reports, tender responses, method
statements, inspection reports. Figures come from your own project files and
each one points to its source.

**Law firms.** First drafts of letters, memos and agreements in your house
style, built from your precedents. Client files stay inside your boundary,
and every reference can be checked.

**Any firm whose files cannot go into a public chatbot.**

## Next step

A short call. We create one real document together, from your kind of files,
so you see the questions, the read back and the sources for yourself. Then
we agree which systems to connect and where your files will be stored.

Anthony Nwobosi
anthony@stellaxafe.com

---

## Notes for Anthony only. Do not send.

Checked against the repo. Four claims need your decision before this goes out.

1. **AWS PrivateLink and VPC.** The repo says a deployment is built inside
   the customer's own cloud, and Bedrock is listed as a planned route
   (SUPPORT.md). Bedrock is not wired yet. The private link sentence is true
   of the deployment you would build for this client, so present it as part
   of their build. If they ask "is that live today?", the answer is "it is
   part of your deployment."
2. **The free 20 GB cloud account.** I found nothing about this in the repo,
   so I left out "free" and "20 GB". I kept "a few cents per 10 GB". Tell me
   the exact offer and I will add it. A number in a client document becomes
   a promise.
3. **Gmail, Slack, Notion.** HOW-IT-WORKS.md calls them examples. Google
   Drive and Canva were registered but not fully wired when that file was
   written. The text says "examples" and "agreed at the start", which is
   true. Do not tell the client any of them is connected today unless you
   have checked.
4. **Internet research.** The ask first, show, then ask again flow is the
   rule in DIRECTION.md. Search exists in the code now, but test it before
   the call. You said search is next week's job.

Wording choices you may want to change.

- **"Nothing is trained on your data."** I did not write "nothing ever leaves
  your system". ARCHITECTURE.md says plainly that text goes to the model for
  the length of one call, and a technical reviewer would catch the stronger
  claim. This version you can defend.
- **"Encrypted".** Cloud storage encrypts by default, so this is safe. Only
  promise a specific key arrangement if the contract includes one.
- **No price, setup time or start date.** Add them only if you want to be
  held to them.

Changes in this version: a one paragraph summary at the top that can go
straight onto a one-pager, an opening that shows the leak as it really
happens (a good employee doing their job), and the invented project name
removed.
