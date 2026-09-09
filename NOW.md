# NOW

The running order. One thing at a time, finished before the next starts.

Written 2026-09-09 because the pace had gone wrong: too many things open at
once, none of them closed. `CURRENT.md` is the full state of what is built.
This file is only what is next, in order.

---

## 1. Sign in is broken, and it is two settings, not code

**The app is correct.** `Auth.jsx` calls `signInWithOtp` and then
`verifyOtp` with a `token`, so the app is waiting for a **six digit code**.
Nothing in the code needs changing.

**Two things are wrong, both in the Supabase dashboard.**

### 1a. It is sending a link instead of a code

Supabase's default email template for this is the magic link one, which
carries `{{ .ConfirmationURL }}`. The app never asked for a link. Clicking
it lands on the site root, which is why it went to the landing page and not
the workspace.

Fix: Authentication → Emails → Magic Link template. Put `{{ .Token }}` in
it. That is the six digit code.

### 1b. It is slow because it is on Supabase's own mail service

The built in sender is rate limited and slow on purpose. `CURRENT.md`
already flagged this: point Auth at Resend, and check the minimum interval
between emails, which is 60 seconds by default and is **per project, not
per person**.

Fix: Authentication → SMTP settings, point at Resend.

### 1c. The address is `/demo`, not `/admin`

`/admin` and `/:slug/admin` both redirect to `/demo`. `/demo` renders the
admin panel or the chat depending on who signed in. Nothing is broken here,
the address simply changed and was not said out loud.

---

## 2. Email, all of it, in one pass

Not one at a time. Everything that sends mail, once.

- The sign in email: branded, with the code.
- The three that go through Resend: `send-contact`, `invite-staff`,
  `support-ask`. Only `send-contact` has any HTML at all.
- **`support-ask` sends from a different domain to the other two.**
  `support@stellaxafe.com` against `noreply@mail.stellaxafe.com`, and its
  address is hardcoded rather than read from settings.
- One shared template so all of them look like the same company.

---

## 3. The staff flow, rebuilt

This is the big one, and it is not new. `DIRECTION.md` has recorded the
target flow since before the demo was built, and says plainly that the demo
does not do it.

### What is wrong, in one sentence

**The interviewer is blind.** Haiku runs the interview and cannot read the
knowledge base, so every question it asks is a guess. That is why it asks
"who is this for" and why it feels like it is inventing questions and
interrupting. It is inventing them, because it has nothing to look at.

### What it should do instead

One capable model from the first message. In order:

1. The person says what they need, in plain language.
2. **It reads the company's own material first**, before saying anything.
3. It works out what it already has and what is genuinely missing.
4. **It asks only for the gaps**, and never for anything the material
   already answers. Where something is missing it says where to get it:
   ask the admin, upload the file, point at a past piece of work.
5. **Read back.** This is what I understood, this is what I will use.
6. On confirmation, it writes.

Fewer turns, and every turn earns its place. The questions stop being
guesses because the model asking them can see.

### What this costs

More per turn, fewer turns. The base prompt is already cached, so the
material is read cheaply after the first time. Measure it before assuming
it is more expensive.

---

## 4. The video

Everything above is in service of this. Record once 1 and 3 are done.
