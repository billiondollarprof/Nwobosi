/* The fix loop's logic (src/shared/docs/look/fixLoop.js): reading the look
   agent, the page fault, putting changed sections in place, what counts as
   fixed. Anthony, 2026-11-22: the look found problems and never fixed them. */
import assert from "node:assert/strict";
import {
  parseLook, measuredFaults, pageFault, faultsToFix, applyRevision, fixedSince, fixedLine, stillLine, reviseRequest, wordCount,
} from "../../src/shared/docs/look/fixLoop.js";

let n = 0;
const t = (name, fn) => { fn(); n += 1; };

t("all clear is clear", () => {
  assert.deepEqual(parseLook("ALL CLEAR"), { clear: true, unseen: false, issues: [] });
});
t("unseen is not a pass", () => {
  const r = parseLook("UNSEEN");
  assert.equal(r.unseen, true);
  assert.equal(r.clear, false);
});
t("graded lines", () => {
  const r = parseLook("MAJOR | Slide 3 | the card text runs past the card | cut to two lines\nMINOR | Slide 4 | a little tight | none");
  assert.equal(r.issues.length, 2);
  assert.equal(r.issues[0].severity, "major");
  assert.equal(r.issues[0].where, "Slide 3");
  assert.equal(r.issues[1].severity, "minor");
  assert.equal(faultsToFix(r.issues).length, 1, "minor lines are never sent back");
});
t("an old style line still counts", () => {
  const r = parseLook("Slide 2: the third card is cut off.");
  assert.equal(r.issues[0].where, "Slide 2");
  assert.equal(r.issues[0].severity, "major");
  assert.equal(stillLine(r.issues[0]), "Slide 2: the third card is cut off.");
});
t("measured faults keep their place", () => {
  const f = measuredFaults(['Slide 3: the text "abc…" runs past the bottom of its box.']);
  assert.equal(f[0].where, "Slide 3");
  assert.equal(f[0].from, "measure");
});
t("page fault only when over", () => {
  const md = "# T\n\n" + "word ".repeat(400);
  assert.equal(pageFault(1, 1, md), null);
  assert.equal(pageFault(2, 0, md), null);
  const f = pageFault(2, 1, md);
  assert.ok(f.target < 200 && f.target > 100, `target ${f.target}`);
  assert.match(f.problem, /must fit on one page/);
});
t("word count ignores markup", () => {
  assert.equal(wordCount("# Title\n\n:::cards\n### A | b\nOne two.\n:::"), 5);
});

const DRAFT = "# Plan\n\nWhat this is.\n\n## Pricing\nOld long text.\n\n## Next step\nBook a call.";
t("a changed section is swapped in by heading", () => {
  const r = applyRevision(DRAFT, "## Pricing\nShort text.");
  assert.deepEqual(r.changed, ["Pricing"]);
  assert.match(r.markdown, /## Pricing\nShort text\.\n\n## Next step\nBook a call\./);
  assert.match(r.markdown, /^# Plan\n\nWhat this is\./);
});
t("a heading not in the draft is ignored", () => {
  const r = applyRevision(DRAFT, "## Something new\nA new fact.");
  assert.equal(r.markdown, DRAFT);
  assert.equal(r.changed.length, 0);
});
t("a whole document replaces the draft", () => {
  const r = applyRevision(DRAFT, "# Plan\n\n## Pricing\nX.\n\n## Next step\nY.");
  assert.deepEqual(r.changed, ["whole"]);
});
t("a broken reply never wipes the draft", () => {
  assert.equal(applyRevision(DRAFT, "").markdown, DRAFT);
  assert.equal(applyRevision(DRAFT, null).markdown, DRAFT);
  assert.equal(applyRevision(DRAFT, "(nothing scripted)").markdown, DRAFT);
  assert.equal(applyRevision(DRAFT, "# Plan only").markdown, DRAFT);
});
t("code fences are taken off", () => {
  const r = applyRevision(DRAFT, "```markdown\n## Pricing\nShort.\n```");
  assert.deepEqual(r.changed, ["Pricing"]);
});
t("fixed means nothing wrong in that place now", () => {
  const before = [{ where: "Slide 3", problem: "cut off", from: "look", severity: "major" },
    { where: "Slide 5", problem: "overlap", from: "look", severity: "major" }];
  const after = [{ where: "Slide 5", problem: "still overlap", from: "look", severity: "major" }];
  const fixed = fixedSince(before, after);
  assert.equal(fixed.length, 1);
  assert.equal(fixedLine(fixed[0]), "Fixed: Slide 3, cut off.");
});
t("page fault fixed when the pages fit", () => {
  const pf = pageFault(2, 1, "# T\n\nabc");
  assert.equal(fixedSince([pf], []).length, 1);
  assert.equal(fixedSince([pf], [pf]).length, 0);
  assert.match(fixedLine(pf), /tightened to fit/);
});
t("the request carries the faults and the draft", () => {
  const r = reviseRequest(DRAFT, [{ where: "Page 1", problem: "too long", fix: "cut" }], { round: 1 });
  assert.match(r, /1\. Page 1: too long\. Fix: cut/);
  assert.match(r, /THE DRAFT\n\n# Plan/);
});

console.log(`fix loop: ${n} passed`);
