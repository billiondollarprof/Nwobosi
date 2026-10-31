# StellaXafe: what it does for your company

Written for a first client. Plain words on purpose. Written to the Humanizer
rules in Anthony's Drive (no em dashes, no staged run-ups, no invented facts).

Everything between the two lines below is the client text. The notes after
the second line are for Anthony only and must not go to the client.

---

## The problem you already have

Your staff use AI tools every day. To get a good answer they paste in client
files, contracts, drawings and internal numbers. Nobody tells them to. They do
it because a tool that does not know your company gives weak work, and the
deadline is today.

That leaves you with two problems.

**Your data is leaving the building.** Once it sits in a public chatbot
account, you cannot see it, cannot get it back, and have no contract
covering it.

**Getting a good result takes too many tries.** Staff write a prompt, get
something close, rewrite it, and repeat. Each round costs time, and the
result still does not sound like your firm.

StellaXafe fixes both.

## What it is

A private AI assistant built for your company. Your staff say what they need
in normal language. The assistant already knows your company, so it asks a
few short questions, checks its understanding with them, and then produces
the finished document.

It is built to order. It is set up around your systems, your files and the
way your firm works. You do not get a generic tool with your logo on it.

## What your staff experience

1. They ask for what they need, the way they would ask a colleague. For
   example: "I need the progress report for the Lekki substation."
2. The assistant asks three to five questions. Only the ones it cannot
   answer from your own files.
3. It reads the request back: what it will make, who it is for, and which of
   your documents it will use. The staff member corrects anything that is
   wrong.
4. Only then does it write the document.
5. The finished file is saved to your own storage. A download link also
   appears in the chat.

Nobody needs to learn prompt writing. The questions do that job.

## It knows your company

The assistant works from the files your admin approves: templates, past
projects, price lists, standards, policies. When it writes, it uses your
formats, your numbers and your wording. Staff do not have to paste any of it
in.

Nothing is trained on your data. The assistant reads your approved files when
it needs them. It does not absorb them into a shared model, so nothing you
upload can show up in anyone else's answer.

## You can check every answer

The assistant does not fetch information and hand it over. It follows three
steps.

1. It gathers the information.
2. It checks it, and marks anything it could not confirm.
3. It shows you where each fact came from, with the source file or the link,
   so you can open it and verify it in seconds.

If something is missing, it says so and tells you who in your company to ask
or where to look. It does not fill the gap with a guess. Nothing unverified
goes into a document until a person confirms it.

This matters most where a wrong figure costs money or credibility: an
electrical load calculation, a contract clause, a regulatory filing.

## Your data stays protected

- **Your company is separated from every other company.** Each company has
  its own workspace. Database rules block one company from ever seeing
  another company's records.
- **Each staff member is separated too.** One person's conversations and
  notes are never shown to another person.
- **Files are encrypted.** They are encrypted in storage and while they
  travel.
- **Nothing you do is used to train a model.** Your chats and your files
  stay yours.
- **The connection to the AI model is private.** On AWS, the assistant talks
  to the model over a private link inside your own cloud network (a VPC, a
  private network space only your company uses). That traffic does not cross
  the public internet.
- **Admins decide what the assistant can read.** If a file is not approved,
  it does not exist as far as the assistant is concerned.

## Your files stay with you

The software does not become another place your data lives. The assistant
reads from the places you already keep files, and it saves finished work back
to the same place.

Each company gets a private cloud storage account on AWS. Storage on AWS
costs only a few cents per 10 GB, and the account is locked to your company.
Staff can also save a finished file straight to their own Google Drive.

## It works with the tools you already use

The assistant connects to the systems your team already works in, so nobody
has to move house. Examples are Google Drive, Gmail, Google Workspace, Slack
and Notion. We agree the exact list with you at the start, based on what you
actually use.

## Research from the internet, when you want it

If a task needs outside information, the assistant can research it online.
You control this.

1. It tells you which sites it wants to look at, and asks first.
2. It finds the details it needs.
3. It shows you those details, with the link to each one, and asks again
   before any of it goes into your document.

You never open a finished document and find data you did not approve.

## You are not tied to one AI model

The assistant is provider agnostic. That means it can run on the model that
suits you, and you can switch later without rebuilding anything. Your files,
your rules and your workflow stay the same.

## Why it pays for itself

- **Less rework.** The back and forth happens in a short chat before the
  document exists, so you stop paying for retries.
- **Less time per document.** Staff start from a request, not from a blank
  page.
- **Consistent output.** Every document follows your templates and your
  standards, whoever on the team asks.
- **Lower risk.** Staff get the quality they were chasing in public tools,
  and your data stays inside your boundary.
- **A safer answer to a hard question.** When a client or auditor asks where
  your data goes, you can answer.

## Who it suits

**Engineering firms (electrical, civil, mechanical).** Progress reports,
tender responses, method statements, bills of quantities, inspection reports.
Figures come from your own project files, and each one points to its source.

**Law firms.** First drafts of letters, memos and agreements in the house
style, built from your precedents. Client files stay inside your boundary,
and every clause reference can be checked.

**Anyone with files that matter.** If your work depends on documents you
cannot put in a public chatbot, this is built for you.

## Next step

A short call. We walk through creating one real document from your own kind
of files, so you see the questions, the read back and the sources for
yourself. Then we agree which systems to connect and where your files will
be stored.

Anthony Nwobosi
anthony@stellaxafe.com

---

## Notes for Anthony only. Do not send.

Checked against the repo. Four claims need your decision before this goes out.

1. **AWS PrivateLink and VPC.** The repo says a deployment is built inside
   the customer's own cloud, and Bedrock is listed as a planned route
   (SUPPORT.md). Bedrock is not wired yet. The private link sentence is true
   of the deployment you would build for this client, so say it as part of
   the build, and be ready to answer "is that live today?" with "it is part
   of your deployment."
2. **The free 20 GB cloud account.** I did not find this anywhere in the
   repo, so I left the word "free" and the 20 GB out. I kept "a few cents per
   10 GB". Tell me the exact offer and I will put it in. A number in a client
   document turns into a promise.
3. **Gmail, Slack, Notion.** HOW-IT-WORKS.md calls them examples. Google
   Drive and Canva are registered but were not fully wired when that file was
   written. The text says "examples" and "agreed at the start", which is
   true. Do not tell the client any of them is connected today unless you
   have checked.
4. **Internet research.** The ask-first, show-then-ask-again flow is the rule
   in DIRECTION.md. Search now exists in the code, but check it works the
   way the text says before the call. You said search is next week's job.

Two wording choices you may want to change.

- **"Nothing is trained on your data."** I did not write "nothing ever leaves
  your system". ARCHITECTURE.md says plainly that text goes to the model for
  the length of one call, and a technical reviewer would catch the stronger
  claim. The version here is the one you can defend.
- **"Encrypted".** Cloud storage encrypts by default, so this is safe. Say
  "encrypted in storage and in transit" if asked, and only promise a specific
  key arrangement if the contract includes one.

I also did not name a price, a setup time or a start date. Add those only if
you want to be held to them.
