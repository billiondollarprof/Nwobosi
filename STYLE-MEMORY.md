# STYLE MEMORY

Spec. Nothing in here is built yet.

Anthony, 2026-09-14: "once the company produces a very good work, let's say
Word document, and that particular staff produces and likes it and downloads
it, the system saves that style of work so that when the person is producing
something again that looks like that in that regard, so he doesn't start
afresh to think."

---

## 1. What this is, in one line

The second time somebody asks for a quote, it comes back shaped like the
quote they kept last time.

---

## 2. Why it is worth building

`CLAUDE.md` already states the product's whole argument:

> The advantage does not come from the model. It comes from the output
> already knowing the company's templates, numbers, and standards without
> the staff member supplying any of it.

Today the company's **facts** come from the knowledge base. The company's
**shape** comes from nowhere. Every document is written from a blank page by
somebody who has never seen the last one, so the person has to explain the
same layout preferences every single time, or accept something different
every single time.

This closes that gap, and it closes it without anybody filling in a
template, writing a style guide, or being asked a single extra question.

---

## 3. The signal is the download, and nothing else

**Downloading is the only honest signal in the product.**

Ratings are not. A thumbs up costs nothing and means nothing in particular:
people press it to be polite, or because the reply was pleasant, or not at
all. A download is somebody deciding this piece of work is going out into
the world with their name on it. That is a real judgement and it is free to
observe.

So:

- **Downloaded means kept.** That is the whole rule.
- **Not downloaded means nothing at all.** Not disliked. The person may have
  copied it, or been interrupted, or come back tomorrow. Nothing is recorded
  and nothing is inferred.
- **A thumbs up alone does not count.** It may be recorded for other reasons,
  but it must never feed this.

One consequence worth being clear about: somebody who downloads a bad
document teaches it a bad shape. That is acceptable, because the shape is
always offered rather than applied, and because the alternative is asking
people to rate things, which they will not do.

---

## 4. What gets stored, and what must never be

### Stored: the shape

Worked out from the Markdown at the moment of download. No model call, so it
costs nothing and cannot drift:

| Field | Example | Why it matters |
|---|---|---|
| `opens_with` | summary, straight in, greeting | The single biggest visible difference between two reports |
| `section_count` | 5 | Length of the thing, at a glance |
| `heading_depth` | 2 | Whether it has subsections |
| `section_words` | 120 | Short sections or long ones |
| `bullet_ratio` | 0.4 | How much is bullets against prose |
| `has_table` | true | Numbers in a grid or in sentences |
| `closes_with` | next steps, sign off, nothing | The other end of the same judgement |
| `total_words` | 700 | The overall size somebody expects |

That is eight numbers and three short words. It is not a template and it is
not the document.

### Also stored: what it was for

The `skill` already detected (`report`, `quote`, `deck`), and the `brief`
already written and already on the conversation row. Both exist. Neither
costs anything to keep.

### NEVER stored: the content

Not a number, not a client name, not a price, not a paragraph, not a phrase.

**This is the one rule that cannot bend.** If last quarter's figures live in
the style memory, they will surface in this quarter's document, and that is
precisely the failure this whole product exists to prevent. The style memory
must be incapable of carrying a fact, not merely discouraged from it.

The eight numbers above cannot carry one. That is why the shape is measured
rather than described.

---

## 5. Whose style it is

**Per person to start.** A row per staff member per skill.

Not per company, and the reason is worth stating. A company wide style is
set by whoever downloads most, which is not the same as whoever writes best.
It would quietly make everybody write like the busiest person in the
building, and nobody would ever see the decision being made.

**An admin can promote one to a company standard, later.** That is a
deliberate act by somebody with the authority to make it, which is the only
way a shared standard should ever come about. Not in the first version.

---

## 6. How it is offered, and why it is never applied

This is the part that decides whether the feature is good or sinister.

**It appears in the read back, as one line, with the shape named in plain
words:**

> Laid out like the Q2 partner report you kept: short summary first, five
> sections, numbers in a table, next steps at the end.
>
> Say if you want it different.

**Three things about that line.**

1. **It is in the read back**, which is already the moment the person
   confirms or corrects. No new screen, no new button, no new decision
   point. It joins a conversation that was already happening.
2. **It is stated, not asked.** "Want me to use your usual layout?" is a
   question people learn to click through. Saying what it will do, and
   leaving the door open, respects them more and gets read.
3. **Saying anything at all overrides it.** "Make it shorter", "no table",
   "just get on with it". The correction wins, the way every correction in
   this product already wins.

**It is never applied silently.** A shape that arrives without being
mentioned is the product deciding how their work looks and not telling them.
That is the moment it stops being a junior colleague.

**It never appears on the first document of a kind**, because there is
nothing to have learned yet.

---

## 7. What it does to the prompt

The brief stage gains a few lines. Nothing else in the six stages moves.

    HOW THEY LIKE THIS KIND OF WORK LAID OUT
    They kept a report shaped like this, so start from it unless this
    conversation says otherwise:
      - opens with a short summary
      - about five sections, roughly 120 words each
      - numbers in a table rather than in sentences
      - ends with next steps

    This is a starting point and it loses to anything they actually said.
    If they asked for something different, do what they asked and do not
    mention the old shape again.

The last paragraph is not decoration. Without it, a model handed a remembered
shape and a contradicting instruction will try to satisfy both.

---

## 8. The database

One table. RLS on, scoped by company like everything else.

    create table public.work_styles (
      id           uuid primary key default gen_random_uuid(),
      company_id   uuid not null references public.companies(id) on delete cascade,
      staff_id     uuid not null references public.staff(id) on delete cascade,
      skill        text not null,
      shape        jsonb not null,
      learned_from text,
      created_at   timestamptz not null default now(),
      unique (staff_id, skill)
    );

**`unique (staff_id, skill)`** means the latest kept document replaces the
last one. The freshest signal wins, and the table cannot grow without bound.

**`learned_from`** holds the title of the document it came from, so the line
in the read back can name it ("like the Q2 partner report you kept") rather
than saying "your usual style", which sounds like surveillance.

**`shape` is jsonb** and it holds the eight numbers. A reader of this table
should be able to see at a glance that no content is in it.

---

## 9. What has to be built

Three pieces, in this order, each useful on its own:

1. **Measure and store.** A pure function that turns Markdown into the eight
   numbers, and a write on download. Testable with no model and no network.
2. **Read and offer.** Load the row at the orient stage, put the line in the
   read back, pass the shape to the brief.
3. **Let them see it.** One line in the admin or the profile saying what it
   has learned, and a way to clear it. Nobody should carry a preference they
   cannot find or remove.

Piece three is not optional polish. A memory a person cannot inspect or
delete is a memory they are right not to trust.

---

## 10. How it could go wrong

Stated here so it is checked rather than discovered.

- **It calcifies.** Somebody's style is remembered from six months ago and
  every document since has been a fight against it. Mitigation: the latest
  kept document always replaces the last, so it tracks rather than sticks.
- **It leaks a fact.** Covered by the measurement being numbers. The test
  suite must include a document full of prices and assert that no price
  appears anywhere in the stored shape.
- **It reads as creepy.** Mitigated by naming the document it learned from,
  saying it out loud every time, and being deletable.
- **It fights an explicit instruction.** Mitigated by the prompt line above,
  and worth a test of its own.
