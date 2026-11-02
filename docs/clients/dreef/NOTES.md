# Notes behind the client brief (Anthony only, never send)

What this is: the reasoning, research and cautions behind `BRIEF.md`.
They used to sit at the bottom of the brief. They live here now so the brief
can be downloaded and sent as it is, with nothing to cut.

Position, as you set it: this is the demo and the blueprint. The client gets
the full build under contract, in their own private AWS account and VPC, with
WhatsApp for their customers. The text is written that way, as a description
of the deployment they will receive. The repo's own rule says the same
(docs/product/DIRECTION.md: describe what a deployment does, not what the demo wires).

Two things to keep straight on the call.

1. **The demo is not the deployment.** If the client drives the demo, they
   are seeing the shape of it. Say so before they ask. Drive and Canva were
   registered but not fully wired, and Gmail, Slack and Notion are
   connectors we agree at the start, so describe them as part of the build.
2. **Costs, checked on 2026-10-31.** Full figures and sources are below,
   under "The AWS numbers". Recheck them before the contract, AWS changes
   prices and plans.

**The build plan.** Everything for Dreef's build, week by week, is in
`PLAN.md`: setup fee tiers, the two week plan, AWS, GitHub, MCP.

**Connections use one MCP layer.** One StellaXafe app per vendor (Slack,
Notion, Canva), registered once, approved by each client's admin. Google is
an Internal app inside each client's Workspace for now. Each client gets its
own running copy and keeps its own keys. The client text needs no change:
"connects to the tools you already use, agreed at the start" is still true.

Wording choices you may want to change.

- **"Nothing is trained on your data."** I did not write "nothing ever leaves
  your system". ARCHITECTURE.md says plainly that text goes to the model for
  the length of one call, and a technical reviewer would catch the stronger
  claim. This version you can defend.
- **"Encrypted".** Cloud storage encrypts by default, so this is safe. Only
  promise a specific key arrangement if the contract includes one.
- **WhatsApp.** The customer side is read only by design (ARCHITECTURE.md).
  If this client wants customers to do more than ask questions, that is a
  scope conversation, not a promise to make in the brief.
- **Setup fee and time.** The brief gives a range ($15,000 to $35,000) and
  "about three weeks". The tiers behind the range are in `PLAN.md`.
  Our own plan is two weeks; three weeks in the brief is the margin. If
  Dreef turns out to be in a market where that range is high, scale it
  before sending, the range is in one paragraph under "Investment".

## The AWS numbers (for Anthony)

Researched 2026-10-31. Sources at the end.

**The free offer is 6 months now, not 12.** AWS changed it on 15 July 2025.
A new account gets $100 in credits at sign up, and up to $100 more for
trying certain services. Up to $200 in total.

**Do not leave the client on the Free plan.** A new account picks a Free
plan or a Paid plan. Both get the credits. But the Free plan ends after 6
months or when the credits run out, and then AWS suspends the account. If it
is not upgraded within 90 days, AWS erases the account and everything in it.
The Free plan also blocks some services. So: open the client's account on the
Paid plan from day one. The credits still apply to the bills. AWS's own FAQ
says in one place the credits expire 6 months after the account opens, and in
another 12 months. Check the date in the account's billing console.

**Storage (S3 Standard).** $0.023 per GB per month for the first 50 TB.
10 GB is about 23 cents a month, not a few cents per 10 GB. Still small.
100 GB is about $2.30 a month. Requests and data going out of AWS are
charged separately, and are small at this size.

**The model (Bedrock).** Paid per use, on the AWS bill, every month. There
is no package of prepaid credits to buy on Bedrock itself. The AWS credits
above can cover it. If a client ever uses a provider directly instead
(Anthropic or DeepSeek), that is where prepaid credit packs exist. Example
rate from a third party guide, not AWS: Claude Sonnet at $3 per million
tokens in and $15 per million tokens out (a token is a piece of a word,
roughly three quarters of one). At that rate a long document that reads 50
pages of company files and writes 10 pages costs roughly 20 to 50 US cents,
more if it goes through several rounds. That is why the client text says
"follows usage" and names no per document figure. Check the Bedrock pricing
page for the exact model before quoting anything.

**PrivateLink (the private network link).** About $0.01 per hour for each
availability zone (a separate data centre inside one AWS region) the
endpoint runs in, plus $0.01 per GB that passes through. Two zones, which is
the normal setup for reliability, is about $14.60 a month before data. This
is the one fixed monthly cost, so it is in the client text.

**Maintenance.** Three months included, then a retainer. You asked which is
better, three or six. Three: the setup bugs show up in the first weeks, and
at three months the client has seen the value, so the retainer talk happens
while they are happy. Six months of free monitoring teaches them it is free.
If you need a closing lever, offer six only in exchange for signing now.
It is one word to change in the client text.

**Management fee vs retainer.** Kept separate in the text. The 20%
management fee only applies when the AWS bill runs on your card. The
retainer is for looking after the system, whoever pays AWS.

**The cost table.** Assumes the design without the NAT gateway (the door
that lets private servers reach the internet): the functions that only talk
to WhatsApp, search and Google run outside the private network. With a NAT
gateway, add about $33 a month. Costs exclude the 20% fee, which is shown
under billing instead, so a client on their own card reads the right total.
Setup fee is not in the document, by design.

Sources:
- AWS Free Tier FAQs: https://aws.amazon.com/free/free-tier-faqs/
- AWS announcement, July 2025: https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/
- AWS Billing, choosing a plan: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html
- S3 pricing: https://aws.amazon.com/s3/pricing/
- PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- Bedrock pricing guide (third party): https://cloudchipr.com/blog/amazon-bedrock-pricing
