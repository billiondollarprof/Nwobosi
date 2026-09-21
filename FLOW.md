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

## "SOMETHING IS WRONG" OPENS A BOX. IT DOES NOT GUESS.

Anthony, 2026-09-21, correcting a first attempt that had the model suggest
what it might have got wrong: "the system doesn't have to suggest anything
for you. It just asks you where. So you point the system to where
something is wrong... when you click on something is wrong, then a drop
down for you to type in what is wrong... Not the system trying to figure
out what you think is wrong for you. That is not correct."

So pressing it opens a box where the button was. You type what is wrong
and where, press send, and it goes into the conversation as your own
words. The read back you are correcting stays on screen above it.

**No model is asked anything until you have said what is wrong.** The
person pressing that button is the only one who knows. A model guessing at
it spends a turn, spends money, and puts words in your mouth that you then
have to argue with before you can say the thing you already knew.

**"Wrong" rather than "missing", and Anthony asked which was safer.**
Missing is only one kind of wrong. A figure that is there but incorrect is
not missing, and neither is a sentence that misunderstood you. Wrong
covers all three, and it is the natural answer to the question above it,
which is "Did I get that right?".

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

## WHAT IS ACTUALLY DIFFERENT FROM AN ORDINARY CHATBOT

Anthony, 2026-09-21, and this is the clearest statement of the product in
the whole project, so it is written out in full.

**It should feel like using Claude.** Not like operating machinery, not
like filling in a form. Natural. The difference is confidence, not
friction: the company's data is internal, in their own environment, and
anything coming from outside passes a checkpoint.

**Inside the chat, only three things are different.** Everything else
should feel exactly like the thing people already know how to use.

1. **The interview, and the loop.** It asks, it reads back, and it keeps
   going round until the staff member is satisfied. No limit.
2. **It writes a complete prompt before it builds anything.** Anthony:
   "which is the behavior that Claude doesn't have." The prompt is the
   fence. Nothing reaches the document that was not agreed.
3. **Nothing comes from outside without permission, and nothing enters the
   work without approval.** It tells you before it goes, or you send it.
   It shows you what it found. You approve it. Anthony: "that's actually
   literally the difference."

**The privacy is not in the chat and must never be.** It is the
deployment: the environment, the keys, the server side. A staff member
should never read a word about it while doing their job. See the product
principle in CLAUDE.md.

---

## STORAGE IS WHATEVER THEY CONNECTED, NOT "DRIVE"

Anthony: "It doesn't just search for drive, like it searches for any
storage or any storage platform connected. It can be a drive, it can be
Dropbox. It can be any cloud storage that's connected."

So the question under a finished file is never "send to Google Drive". It
is "put this in your storage", and which storage that is was decided when
the company was set up.

**IT KNOWS ITS OWN REACH, AND SAYS SO.** His comparison: "just like you
used to know that Supabase is not within your reach, you are able to know."
Three answers, and all three are said plainly rather than failing quietly:

- **Nothing connected.** "No storage is connected here." Not an error, a
  fact about this deployment.
- **Connected but out of reach.** It could not get there. Something is
  broken or the permission has gone. Say that, do not pretend it worked.
- **Connected and reachable.** It goes there, and it says where it went.

A silent failure here is the worst of the three, because somebody walks
away believing their document is filed.

**AND IT IS THE SAME FOR EVERY TOOL, NOT JUST STORAGE.** Anthony,
2026-09-21: "the same way he knows about the storage connected, that's the
same way he knows about other tools that are connected that he needs, like
if it's Canva, Adobe InDesign, or whatever he needs for his design, or
email, or Slack."

So one rule covers all of them. The assistant knows what this company
connected, and it knows which of those it can actually reach.

- **It can bring it up in the interview.** "Your design platform is
  connected, shall I lay this out in it?" A real question about a real
  tool, asked while it still matters.
- **When something is not connected, it offers what IS available instead.**
  Upload the thing in the chat, or let it go and look online. Not a dead
  end and not an apology, a route.

**And nothing more than that.** Anthony: "the system is just as smart as
it's trained already from Anthropic. It's just being given better
direction now." The intelligence is not the thing being built here. What
is being built is knowing what is in the room, and saying so.

---

## CONVERTING, IN ANY DIRECTION, AS OFTEN AS THEY LIKE

This is office work. Legal firms, banks. Anthony named the real habits:

- It gives you a **Word document**, you want a **PDF**. Done.
- It gives you **slides**, and after looking you say convert it to PDF,
  "because I want to send it out and I don't want them to be able to
  change it". Done.
- It gives you a **spreadsheet**, you want that sent out as a PDF. Done.
- It gives you a **PDF** and you want to edit it, so you ask for Word.

**Word and PDF are what offices use most.** Any direction, any number of
times, and none of it goes near a model, because converting a finished
document cannot invent anything. `src/shared/formatAsked.js`.

---

## DESIGN GOES TO A DESIGN PLATFORM, AND CANVA IS ONLY THE FIRST ONE

Anthony: "Design is in Canva, almost always... Claude is not trained to
design... So that is why it will need either Canva design or another
design platform that is connected to it."

He is right about the model and right about the consequence. A model
writes; it does not lay out a brochure. So design leaves the building and
goes to a tool built for it.

**Canva is the first one wired up, not the only one there will ever be.**
A firm using Adobe InDesign or anything else should have that connected
instead, and the assistant uses whatever is there. Same shape as storage:
the platform is a connector decided at deployment, and the chat never
names a brand it cannot reach.

---

## THE MODEL IS A SETTING, AND THE LADDER IS TWO RUNGS

**Swapping the model changes nothing else.** Deploy for a company that
wants GPT, or DeepSeek, or stays on Claude, and the architecture is
identical. Today that is already almost true: `MODEL_ID` in the assistant
function is the only place in the entire product that names a real model.

**THE LADDER DROPS FROM FOUR TO TWO.** Anthony's decision, 2026-09-21:
"that place that we did deeper and whatever, we don't even need it,
because this is for offices."

- **conversational** — the quick one. The back and forth.
- **standard** — the working model. The one that does the job.

`deeper` and `deepest` go. They were built for a ladder that offices do not
climb.

**Which real model each rung IS gets decided when a company is deployed.**
On Claude, standard is normally Sonnet, because for office work Sonnet is
the right tool. A company that wants Opus at the top gets Opus at the top.
That is a deployment setting, not a product change, and no screen ever
names either one.

This touches: `LADDER`, `MODEL_ID`, `PRICE` and `ADAPTIVE_THINKING` in the
assistant function, the database enum behind `model_ceiling`, and the
admin's level selector. It is a real piece of work and it is not started.

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

1. ~~The file is not the first thing.~~ **DONE 2026-09-21.** The card
   leads with the file, names which kind it is, and keeps the words one
   press away behind "Show it here".
2. ~~The format is never decided beforehand.~~ **DONE 2026-09-21.** The
   read back ends with a FORMAT line, the Build button says which file it
   will make, and the file lands as that. Nothing said means a Word
   document, which is what an office reaches for.
3. ~~"Something is missing" does not ask what or where.~~ **DONE
   2026-09-21.** Pressing it runs a turn. It says which parts of its own
   read back it thinks are thin, asks which bit is wrong and what it
   should say, and reminds you that you can paste it, attach a file, or
   send it looking. Then it waits. Round as many times as it takes.
4. **There is no storage question**, because no storage is connected yet.
   The three honest answers above need building alongside it.
5. **The ladder is still four rungs.** It should be two.
6. **Design is wired to Canva by name**, rather than to whichever design
   platform a deployment connected.
