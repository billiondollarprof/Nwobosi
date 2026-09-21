# THE FLOW

What actually happens when somebody asks this assistant to do a piece of
work. Anthony described it in full on 2026-09-21 and called it "the actual
product", so it lives in its own file rather than in a session note.

Read this before changing anything in `src/pages/Chat.jsx` or the stage
prompts in `supabase/functions/assistant/index.ts`.

---

## THE ONE SENTENCE

You say what you want. It works with you until you are happy. Then, and
only then, it produces a **file**.

---

## THE RULE THAT CHANGES THE MOST CODE

**The deliverable is a file, not a chat message.**

Anthony: "naturally, anytime you ask for a document, or anytime you are
doing work, it doesn't just paste it on the chat. Writing it on the chat
shouldn't be the first thing the agent should do. The first thing the
agent should do is to produce it in a file."

So the finished work arrives as something you can download. Text in the
chat is the exception, not the default, and it happens only when you ask
for it.

**Why it matters and is not a preference.** A chat message is not a
deliverable. You cannot email it, you cannot put it in a folder, and it
is gone when the tab closes. Somebody who asked for a document and got
text has to do the last and most annoying step themselves, which is the
step they came here to avoid.

**Pasting it is still available, on request.** After the file exists, you
can say "paste it in the chat" and it does, so you can copy it as text.
Anthony's reason: "maybe because you can't open the file, or something."

---

## THE LOOP, WHICH IS THE HEART OF IT

Anthony: "from the interview stage to the read-back stage to the recap
stage can go on and on until I'm satisfied... Even if I have to go over it
ten times until the final recap."

There is no limit on this and there must never be one. The loop is:

1. **It asks.** One question at a time, like a colleague.
2. **It reads back** what it understood.
3. **You judge it.**
   - Happy → you say so → it goes to build.
   - Not happy → you say what is wrong → **back to 1**.

Anything can happen inside that loop, any number of times:

- You upload a file for more context, at any point, and it reads it.
- You ask it to go and look something up. It asks permission, you approve,
  it searches, it shows you what it found, you keep or drop each finding.
- It tells you something is still missing.
- It suggests something you had not thought of.
- It asks another question.

**Nothing is built until you say yes with nothing outstanding.** Not "yes
but", not silence. A plain yes.

---

## "SOMETHING IS MISSING" IS A CONVERSATION, NOT A DEAD END

Anthony: "if I say something is missing, it should paste that something is
missing, and it should ask me what is missing, where and where is missing."

So pressing **Something is missing** does not just hand you back a blank
cursor. It says what it thinks might be missing and asks you **what** and
**where**. You tell it, it fixes that, and it gives you the recap again.

---

## WHAT HAPPENS WHEN YOU SAY YES

Two things run back to back with you pressing nothing else:

1. **The prompt is written** from everything agreed. This is the fence.
   Nothing reaches the document that was not agreed in the conversation.
2. **The document is written inside that fence**, and turned into a file.

Anthony: "then it will now go and build prompt, and then build the file."

---

## THE FORMAT IS DECIDED BEFORE THE BUILD, NEVER AFTER

Anthony: "it should produce it in a file that the agent thinks is the best
for that kind of work. Except it interviewed you and asks you what type of
file output would you want... it might just list the options that are
available."

So one of two things, and both happen before a word is written:

- **It asks during the interview**, listing what is available for that kind
  of work. A report: Word or PDF. A deck: slides. Numbers: a spreadsheet.
- **Or it chooses** the one that fits the work, and says which it chose.

Either way the file that appears is the right kind, first time. Changing
your mind afterwards still works and always will, because converting a
finished document invents nothing. See `src/shared/formatAsked.js`.

---

## AFTER THE FILE EXISTS

The file is there to download. Underneath it, the assistant keeps asking,
with buttons rather than a wall of text:

- **Put it in your drive?** Yes and it goes there. Yes with no drive
  connected, and it says so plainly: there is no access to your storage
  here. Not a silent failure and not a pretend success.
- **Paste it in the chat?** For when you cannot open the file.
- **Change something?** Back into the loop above.

---

## WHAT THIS IS, SAID ONCE

Anthony: "Let all the interactions and back and forth happen. Let the
assistant actually feel like a real assistant, a real junior colleague."

Everything above is in service of that sentence. The interview is not a
form. The read back is not a formality. The loop is not a limitation. They
are what a good colleague does before spending your afternoon on the wrong
document.

---

## WHERE THE BUILD ACTUALLY IS, 2026-09-21

Honest state, so nobody reading this thinks it is all done.

**Already true:**

- The interview, the read back, and the loop back into the interview when
  something is missing.
- The search gate: it asks, you approve, you keep or drop each finding.
- Uploading a file during the conversation.
- The prompt being written before the document, as a fence.
- The document being turned into Word, PDF, slides or a spreadsheet.
- Saying "make it a word document" after the fact, with no model call.
- The read back can no longer write the document itself, which was the bug
  that made all of this visible.

**Not true yet, in the order that matters:**

1. **The file is not the first thing.** The finished work is rendered as
   text in the chat with download buttons under it. It should be a file
   first, with the text available on request.
2. **The format is never decided beforehand.** Nothing asks, and nothing
   chooses. Four buttons appear afterwards.
3. **"Something is missing" does not ask what or where.** It clears the
   card and hands back the cursor.
4. **There is no drive question**, because no drive is connected yet.
   The honest refusal needs building alongside it.
