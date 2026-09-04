# What is not built, and how to build it

Written 2026-08-27, the night before submission, so that the next week of
work starts with specs rather than with remembering.

Each item says what it is, why it matters, what it needs, and roughly how
long. Ordered by what buys the most.

---

## 1. Real file formats

**Done:** PDF and Word. `shared/download.js` parses the Markdown the model
returns and lays out a real page, or hands the same blocks to a `.docx`
writer. Both run in the browser, nothing uploaded.

**Still missing:** PowerPoint and Excel. A judge asking for a pitch deck
gets a well written outline of one as a PDF, not a deck.

**Build:** two more writers against the same parsed blocks.

- `.pptx` with `pptxgenjs`. One slide per H2, bullets from the list under
  it, the company's colours from the brand source.
- `.xlsx` with `exceljs`.

The parser and the block shape already exist, so both are small.

The generate stage already returns structured Markdown, so the writers take
that as input. Pick the writer from the skill already detected.

**Effort:** half a day for PowerPoint. Half a day for Excel.

---

## 2. Images the assistant can actually use

**Now:** in the chat, an attached image is shrunk and sent as an image
block, and the model sees it. In the **knowledge base** it cannot, because
company sources reach the model as text inside the system prompt, and an
image cannot go there.

This is also why a **design-exported PDF fails**. Canva and similar tools
convert text to outlines, so the page holds shapes, not words. There is
nothing to extract. Wrapping an image in a PDF does not help for the same
reason.

**Build, in two parts.**

*Describe at upload.* A new edge function `describe-image`. The admin adds
a logo, brand board or design export. The function sends it to the model
once, as an image, with a prompt asking for a written description: the
mark, the colours with hex values, the typefaces, the layout, the tone. It
stores that description as the source text, exactly like any other source.
The knowledge base then holds words about the brand that every later draft
can use.

*Scanned and outlined PDFs.* When `readPdf` returns almost nothing, render
each page to a canvas with pdf.js, send those images to the same function,
and store what comes back. This turns "this PDF has no text" from a refusal
into a fallback.

**Effort:** half a day for the function, half a day for the PDF fallback.

**Note:** this gives the model *words about* an image, not the image file
itself. Putting a real logo into a real document is item 1 plus asset
storage.

---

## 3. Canva

**Now:** the app is registered, the client id and secret are in place, and
no code sends anything to Canva. Shown as **Set up**.

**Build:**

- `oauth-callback` edge function: exchange the code for a token (PKCE,
  SHA-256), store it in `connectors` against the company.
- Create a design from a brand template, fill its data fields, poll the
  export job, return the URL.
- Flip the connector state from `registered` to `connectable`.

**Watch for:** Canva scopes are not cumulative (`asset:write` does not
imply `asset:read`). Private integrations need Canva Enterprise; Draft
state works for a personal account.

**Effort:** one to two days, most of it OAuth and export polling.

---

## 4. Google Drive

**Now:** Google has the client and secret. No `oauth-callback`, so nothing
connects.

**Build:** the same callback function as Canva, plus file listing and file
read for the picker, and write-back for finished work.

**Scope choice matters.** `drive.file` is non-sensitive and needs no
verification, and only sees files the user opens with the app. That is
enough and should be the choice. `drive.readonly` is restricted and needs a
security assessment that takes weeks.

**Effort:** one day on `drive.file`.

---

## 5. Staff invites, properly

**Now:** invites work. `invite-staff` creates the account server side and
shows the admin a one-time password to pass on.

**Missing:** the email. Also `access_requests` has no INSERT policy, so the
request-access path on the sign-in page can never work.

**Build:** send the invitation through Resend with the company's branding,
carrying a set-password link rather than a password read aloud. Add the
INSERT policy if the request path is wanted at all.

**Effort:** half a day.

---

## 6. Email codes instead of passwords

**Now:** password sign in. The OTP screen exists in `Auth.jsx` and is
unreachable.

**Build:** `signInWithOtp`, Supabase auth email templates pointed at Resend
with the StellaXafe branding, domain verified. Wire the existing screen
back in.

**Do it on a branch and only merge once an email actually arrives.**
Password sign in must keep working until then.

**Effort:** half a day, most of it domain verification.

---

## 7. Conversation history beyond three

**Now:** the last three conversations per person are saved and resumable.

**Build:** if more is wanted, paginate rather than raising the limit, and
give a person a way to delete their own. Storing a company's thinking
forever should be a choice somebody makes, not a default.

**Effort:** half a day.

---

## 8. Deployment inside a company's own environment

**Now:** one shared Supabase project, isolated by row level security. That
is genuinely tight, and it is not the same as separate infrastructure.

**Build:** the migration path already claimed on the landing page. A
company's own Supabase project or VPC, the same schema applied, the same
edge functions deployed, their own Anthropic key.

**Effort:** the schema and functions are already portable. Mostly
documentation and a setup script.

---

## Smaller things worth an hour each

- **Usage numbers are not live.** The staff card shows a daily limit and a
  meter, but "used" is always zero. Count from `work_history` per day.
- **Access requests** are still a mockup on the sign-in page.
- **The `conversations` table needs a cleanup job** if the app ever keeps
  more than three.
- **Bundle size.** The landing page carries the auth client and now pdf.js.
  Code split so a first visit does not pay for either.

---

## Two rules learned the hard way this week

**A green build is not evidence a page renders.** Three separate bugs
compiled cleanly and threw in a browser. Drive the app.

**Anything a screen claims must be true.** More than one thing in this
product looked finished and was not: an upload that never sent a byte, a
knowledge base that saved nowhere, a connector marked Connected that
nothing spoke to. Each one cost a testing session to find. Say "not built"
early and it costs nothing.
