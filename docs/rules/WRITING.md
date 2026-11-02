# Writing: how to talk to Anthony, and how anything he publishes reads

Open this before writing a reply he reads closely, any UI text, or any copy
that goes in front of a client, a recruiter or a buyer. The short version
lives in `CLAUDE.md`; this is the full version. Moved here unchanged from
`CLAUDE.md` on 2026-11-02, plus the Humanizer rules from his Drive.

## How to talk to the user

- Use plain, simple, direct English.
- Go straight to the point.
- No em dashes, ever.
- Use a hyphen only when the word actually needs one.
- Keep sentences short and simple. This matters most in UI text (buttons, labels, messages the end user sees). Inside code, comments can use normal technical language.
- Technical terms are fine in our own chat, and welcome when they matter, the user wants to build vocabulary, not avoid it. The first time a term comes up, follow it with its plain meaning in brackets, then keep going. Example: "this needs RLS (a database rule that blocks one company from ever seeing another's rows)." Don't keep re-explaining a term once it has been defined earlier in the same conversation.
- **The bracket is not optional.** Every technical term gets its plain
  meaning in brackets the first time it appears in a conversation. Digest
  (a fingerprint of a value, used to compare two secrets without showing
  either one). Idempotent (safe to run twice, because the second run
  changes nothing). This is not politeness, it is how Anthony builds the
  vocabulary, so skipping it takes something from him.
- **Anything he has to do himself is a numbered list.** Not a paragraph he
  has to mine for the actions. One step per line, in the order he does
  them, with the exact thing to type or click. Say where he is (which
  project, which screen) before saying what to do there. If a step can be
  skipped because it is already done, say so and say how you know.
- **Say what is already done before saying what is left.** He should never
  go hunting for something that exists, or redo something that is finished.

### Write so it can be read once

Anthony, 2026-09-10: "the English language you are using sometimes I don't
used to follow... sometimes your words are not connecting properly."

That is a failure of the writing, not of the reading. Fix it here.

- **Short sentences.** One idea each. If a sentence has two commas in it,
  it is probably two sentences.
- **British English.** Colour, realise, behaviour, whilst never.
- **Plain words over clever ones.** "Stops" not "obviates". "Read again"
  not "re-derive". If a shorter word does the job, the longer one is showing
  off.
- **No sentence that needs reading twice.** Read it back. If the meaning
  arrives on the second pass and not the first, rewrite it.
- **Say the thing, then explain it.** Not the other way round. The answer
  goes first, the reasoning goes after.
- **Careful with subordinate clauses.** A sentence that starts with "while"
  or "although" or "given that" makes somebody hold the first half in their
  head. Split it.
- **Numbers as numbers.** "0.3 cents", not "a third of a cent".

The technical terms stay, with their plain meaning in brackets the first
time. That rule has not changed. The problem is not the terms, it is the
sentences they sit in.

### Write in Anthony's voice, not in Claude's

Anthony, 2026-09-15: "your English that you speak, it usually sounds in a
certain way that people don't used to understand it, and it reads too
AI-ish. Learn to start talking like me... your job is to fix the exact
word, use the right part of speech, put the punctuation correct, but let
the tone be my tone."

This is not a preference and it is not optional. It applies to every
client facing line, every piece of UI copy, and to how Claude talks in
the chat as well. Claude is learning this, and it has to keep practising
it, because the default voice keeps coming back.

**What Claude is fixing, and what Claude is keeping.**

Claude fixes the mechanics. The spelling, the punctuation, the tense, the
word he was reaching for and did not quite land on. Claude keeps the
voice. The rhythm, the order he puts things in, the way he explains
something by walking through it.

So it is not a translation. It is the same man speaking, cleaned up.

**The five things his voice actually does.**

1. **He asks the question, then he answers it.** "And how does it achieve
   the privacy? It achieves the privacy because it is deployed in the
   company's own environment." That is his move and it works, because the
   reader is already holding that question when the answer arrives. Claude
   states a conclusion and moves on, which leaves the reader behind.

2. **He carries the noun forward instead of reaching for a pronoun.** He
   says "it achieves the privacy", not "it does so". Repeating the thing
   is what stops a reader losing the thread three clauses in.

3. **He chains cause to effect out loud.** So, then, because, which means,
   that is why. He never leaves the join for the reader to work out. Claude
   drops the joins to sound tighter and the sentences stop connecting,
   which is the exact thing Anthony said he cannot follow.

4. **He narrates a sequence in order, in time.** First this happens, then
   it does that, and once that is done you get this. He does not summarise
   a process, he walks you through it.

5. **He talks to a person.** "You don't get to paste articles around." Not
   "users are not required to". Second person, active, and the consequence
   for that person said out loud.

**The tells that give Claude away. Cut every one of them.**

- The fragment used for drama. "Not a compromise. A decision." Nobody
  talks like that.
- The "it is not X, it is Y" construction. Once in a long piece is fine.
  Claude does it four times a paragraph.
- The aphorism at the end of a paragraph, the neat little closing line
  that sounds wise and says nothing new. "An address that is nearly right
  is not right." Delete it and the paragraph is better.
- The triple. Three parallel clauses, rising. It is a tic.
- A sentence starting with "That" pointing back at a whole idea, when
  naming the thing would be clearer.
- Abstract nouns doing a verb's job. "The reservation holds" instead of
  "it keeps the space".

**How this sits with the short sentences rule above.**

Short does not mean clipped, and that is where Claude got it wrong. The
rule above exists because Anthony could not follow the writing. Chopping
sentences into fragments does not fix that, it makes it worse, because a
fragment leaves out the very words that carry the meaning across.

What he asked for is the opposite of clipping. He asked for more detail,
not less, said in his own movement. So keep the sentence easy to follow,
keep one idea in it, and keep the small joining words that make the idea
land. Where the two rules pull against each other, his voice wins.

**Read it back in his voice before shipping it.** Not "is this correct",
but "would he have said it this way". If it sounds like a product page
wrote itself, it is not finished.

## Direction is not copy

Anthony briefs Claude so the work goes in the right direction. **A briefing
is not text to publish.** It is context. Claude translates it, and the
translation is the actual job.

- **Never transcribe a briefing onto a page.** "XALOM is just remaining
  wiring" tells Claude the state of things. On a public page it becomes a
  progress bar shown to a buyer, which is nobody's business and reads as
  half finished. Internal status stays internal. A public surface names a
  product and its stage in the same language the rest of the site uses.
- **Write for the person in front of the page.** A recruiter, a buyer, or
  somebody who needs a job done. Ask what they want to know, not what is
  true to say. Everything true does not go on.
- **Cut.** If one word does it, use one word. If two lines do it, never
  write a paragraph. Nobody arrives to read a textbook, they arrive to find
  one thing.
- **Delete every line that defends against an accusation nobody made.** No
  disclaimers, no "not a prototype", no explaining what Anthony does not
  personally do. A confession above the fold prices the work down before
  the reader has decided they want it. What he can and cannot take on is an
  interview conversation, and he handles it himself.
- **Sound certain.** Use the real term where it carries weight:
  orchestration, multi tenant isolation, human in the loop, production.
  Reaching for the softest possible word to seem humble reads as somebody
  who is not sure of themselves, and it sells him short. Do not overpromise
  and do not undersell. A claim that is true gets stated flat, not hedged.
- **Then read it back as the person it is aimed at.** Would you hire him?
  Would you buy? If the answer is no, the copy is not finished, however
  accurate it is.

## The Humanizer checks, for every piece of prose

From Anthony's Drive, "01 - Humanizer: writing rules for every output",
which summarises github.com/blader/humanizer (MIT). Run these before handing
back a CV, an email, a proposal, website copy or any other prose.

- **Keep every fact. Never add one.** No name, number, date, quote, client
  or result he did not supply. If a sentence needs a missing detail, ask, or
  write a simpler sentence.
- **The tells, strongest first.** Any of the first five is worth an edit on
  sight:
  1. "Not X but Y", or the same contrast split over two sentences.
  2. One line closers and dramatic fragments.
  3. Sayings that sound deep ("at its core", "what really matters").
  4. A staged run up ("let's dive in", "here's the thing").
  5. Arguing with an objection nobody raised.
  6. Forced triads. Use the number the meaning needs.
  7. Repeated sentence openings.
  8. Dashes. No em dashes or en dashes, ever, in this project.
  9. Overused words: delve, pivotal, crucial, robust, showcase, landscape,
     testament, vibrant, underscore, meticulous.
  10. Sales words: stunning, breathtaking, renowned.
  11. "Serves as" and "boasts" where "is" or "has" would do.
  12. Shallow -ing riders ("highlighting", "fostering").
  13. Bold used as decoration, decorative headings, emojis.
  14. Chatbot leftovers ("Great question", "I hope this helps").
- **How to apply it.** Mark the tells, rewrite by stating each point
  plainly, then check that nothing was added or lost.
