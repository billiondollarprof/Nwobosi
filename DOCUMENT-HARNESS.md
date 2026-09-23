# THE DOCUMENT HARNESS: CHARTS, FIGURES, PICTURE SOURCES, AND A CHECKER

Spec, 2026-09-23. **Status: PLANNED, waiting for Anthony's go ahead.
Nothing below is built yet.** His words are in `CURRENT.md`, at the top.

He asked for four things and one idea behind them:

1. When the assistant suggests a picture and the staff says skip it, the
   work carries on without pictures and still comes out at its best.
2. A picture carries its source as well as its name, when the staff gives
   one.
3. Figure numbers when there are several pictures or charts, and charts of
   any kind: bar, line, histogram, and whatever else the work needs.
4. All staff can read and use what is in the knowledge base.
5. The idea: "the most dependable workflow product. So staffs are confident
   they can rely on the assistant." A harness around the assistant that
   lets it work at its best.

Item 4 is already true, and it was checked on the live database on
2026-09-23: `knowledge_sources_read` and `knowledge_chunks_read` let every
staff member of the company read, and only an admin can change them. The
SQL that ran that day touched saved work and chats only, never the
knowledge base.

---

## The idea behind the harness

How does a staff member come to rely on the assistant? They rely on it
when the parts that must be exact are always exact. So the harness splits
the work in two:

- **The model decides what goes in.** What the document says, which chart
  shows the point best, which picture goes where, the words of a caption.
  That is judgement, and judgement is what the model is good at.
- **Code does everything that has one right answer, and code checks the
  model.** Drawing a bar at the right height, numbering the figures,
  sorting values into histogram buckets, adding up a total, making sure a
  figure the text mentions actually exists. The model can get these wrong
  on a bad day. Code gets them right every day.

So the model never draws, never counts and never numbers. It writes a
small, plain description, and code turns that into the finished thing.
This is the same split the file writers already use for cards, stats and
tables, carried through to charts and figures.

---

## 1. Skip means skip

1. The interview already asks about pictures once. If the staff says skip,
   the brief writes `Pictures: none`.
2. The writing step is told plainly: no picture blocks, no empty boxes, and
   the layout makes up for it (a stat, cards, a chart where there are
   numbers, a cleaner cover).
3. The checker (section 5) removes any picture block that slipped through
   when the brief said none. So a skipped picture can never turn up as a
   "Picture to add here" box in a file that goes to a client.
4. "Picture to add here" only appears when the staff said they will add
   the picture themselves later.

## 2. Pictures with their source

1. When the staff hands over a picture, the interview asks, in the same
   question, where it is from if that is not obvious. For stock photos the
   source is always kept, because stock sites ask for credit.
2. The block gets a third part:
   `:::image lobby.jpg | The front desk | Photo: Chidi Okafor`
3. Every format prints the source small, under the caption.

## 3. Figure numbers

1. Pictures and charts can carry a short tag: `:::image lobby.jpg #lobby`
   and `:::chart bar #revenue`.
2. The text refers to them as `[[fig:revenue]]`.
3. **Code** numbers every figure in the order it appears (Figure 1,
   Figure 2...) and swaps each `[[fig:...]]` for its number. So "see
   Figure 3" always points at the right figure, even after the staff asks
   for a section to move.
4. Documents (PDF, Word) show "Figure 2. Room revenue by quarter." under
   the figure. Slides show the caption and source without the number,
   because a deck does not usually number its figures.
5. A reference to a tag that does not exist becomes a note in "Worth
   checking" and the text reads "the figure below" instead of a broken tag.

## 4. Charts

### 4.1 What the model writes

A chart is a chart type, a caption, a source, and a plain table of the
numbers. The table is what makes this dependable: the model is good at
tables, and a table still reads correctly anywhere a chart cannot be drawn.

```
:::chart bar #revenue | Room revenue by quarter, ₦ millions | Source: Q3 finance report
| Quarter | 2025 | 2026 |
| --- | --- | --- |
| Q1 | 12.4 | 14.1 |
| Q2 | 13.0 | 15.6 |
:::
```

Types: `bar` (across), `column` (up), `stacked`, `line`, `area`, `pie`,
`doughnut`, `scatter`, `histogram`. A histogram gets the raw values, one
per row, and **code** sorts them into buckets. The model never picks
bucket edges or counts what falls in them.

### 4.2 How each file draws it

These were checked against the libraries the app already ships, so none
of this needs a new library:

| Format | How the chart is made | What the staff gets |
| --- | --- | --- |
| Slides | pptxgenjs native charts | A real PowerPoint chart. Click it and edit the numbers in PowerPoint. |
| PDF | the chart drawn as SVG (a drawing made of lines and shapes, not pixels), which pdfmake prints directly | Sharp at any zoom, and it prints clean. |
| Word | the same SVG, with a picture copy for old versions of Word (docx supports this) | Sharp in current Word, still shows in old ones. |
| Excel | the numbers on their own sheet, and the chart placed beside them as a picture | exceljs cannot make a native Excel chart, so the chart is a picture and the numbers are live cells. |
| Chat preview | the same SVG | What they see is what they download. |

**One drawing code for every format**, written in the app, so a chart
looks the same in the preview, the PDF and the Word file. Its colours come
from the company's brand colour, through `themeFor`, the same way the
headings and table heads do. Every chart gets its axis labels, its unit,
and its source line under it.

### 4.3 Where charts come from

1. The brief's design plan says where a chart would carry the point, which
   type, and where its numbers come from.
2. **The read back lists every chart and the source of its numbers**, so
   the staff sees "Revenue by quarter, from the Q3 finance report" and can
   correct it before anything is built. Same checkpoint as everything else.
3. A chart is never made from numbers that are not in the sources or in
   what the staff said.

## 5. The checker: code reads every file before the staff does

This is the part that makes it dependable. It runs after the writing
step, every time, and costs nothing, because it is code and not a model
call. What it finds goes in the "Worth checking before it goes out" card
the chat already shows.

It checks:

1. **Charts.** Every value is a number. Every row has the same number of
   cells. A pie adds up to a whole and has no negatives. A chart that
   cannot be drawn is shown as its table instead, with a note saying so.
   The file never breaks.
2. **Totals.** Code adds up any table with a Total row. If the model's
   total is wrong, code puts in the right one and says it did.
3. **Figures.** Every `[[fig:...]]` points at a real figure (section 3).
4. **Pictures.** Every picture named was actually handed over. If the
   staff said skip, no picture block survives (section 1).
5. **Numbers against the sources.** Every figure in the document (money,
   percentages, dates, counts) is looked for in the sources the model was
   given and in what the staff said. A number found nowhere goes in
   "Worth checking", with where it appears. This runs in the `assistant`
   function, because the sources are already there and the browser does
   not hold them. It is the check that stops an invented number reaching
   a client.

## 6. What it touches

- **`assistant` (REDEPLOY, v27, prompt lines plus the number check).**
  Interview: picture source, skip. Read back: charts and where their
  numbers come from. Brief: the chart plan, `Pictures: none`. Writing:
  the chart block, figure tags, the skip rule. Plus the number check in
  section 5.5. Every new rule sits in the cached part of the prompt, so
  after the first turn it is read at a tenth of the price.
- **The app (site push only):**
  - `src/shared/docs/documentModel.js`: the chart block, picture source,
    figure tags and numbering.
  - `src/shared/docs/charts/` (new): reading and checking the chart table,
    histogram buckets, and the one SVG drawing code.
  - `src/shared/docs/checkDocument.js` (new): the checker in section 5.
  - The four writers (`pdf.js`, `word.js`, `deck.js`, `downloadSheet.js`)
    and `DocumentView.jsx`.
- **No SQL. No new library.**

## 7. Order

1. Skip, picture source, figure numbers. Small, and they share one block.
2. Charts in every format, drawn, opened, and looked at in all four files.
3. The checker.
4. Then v27 is handed over once, with all of it, and Anthony redeploys.

Each step is built, used by hand, and looked at in all four file formats
before the next one starts.
