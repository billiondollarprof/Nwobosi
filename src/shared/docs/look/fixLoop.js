/* ==========================================================================
   THE FIX LOOP: WHAT IS WRONG, WHAT TO SEND BACK, WHAT WAS FIXED

   What this is: the pure logic behind "look, fix, look again". No screen, no
   network, so it can be tested on its own (scripts/tests/fix-loop.test.mjs).

   Why. Anthony, 2026-11-22: "it just show the error with red line, but it
   will not go back to adjust it and correct the problem." Before this, the
   look agent (stages/look.ts) listed problems and stopped. Now:

     1. Code measures what has one right answer: text spilling out of a box,
        text under 11 point, a PDF longer than the pages they asked for.
     2. The look agent adds what only an eye can see, each line marked
        MAJOR or MINOR, the way PPTAgent's reviewer grades its findings.
     3. Every measured fault and every MAJOR one goes back to the writer
        (stages/revise.ts) with the exact fault. MINOR lines are never sent
        back and never shown: that is where the false alarms lived.
     4. The writer sends back only the sections it changed. They are put in
        place here, by heading, and the file is drawn and measured again.
     5. At most two rounds. Then the card says what was fixed, in green,
        and only what is still wrong, in amber.

   What it must never do:
     - Lose the document. Anything it cannot read leaves the draft as it was.
     - Report a fault code did not measure or the eye did not see.
   ========================================================================== */

/* At most this many rounds of fixing, the same ceiling Anthropic's slide
   skill keeps ("fix those, re-render only the slides you changed, and
   stop"). */
export const MAX_ROUNDS = 2;

/* The loop never runs past this, so the building stage stays under two
   minutes (Anthony, 2026-11-22). A round that would start after it does not
   start, and what is left is reported. */
export const LOOP_BUDGET_MS = 75000;

/* --------------------------------------------------------------------------
   1. Reading what the look agent said

   One line per problem: "MAJOR | Slide 3 | what is wrong | how to fix it".
   A line without the bars, from an older reply, counts as MAJOR with the
   whole line as the problem, so nothing it says is lost.
   -------------------------------------------------------------------------- */

export function parseLook(text) {
  const said = String(text ?? "").trim();
  if (!said || /^ALL CLEAR\b/i.test(said)) return { clear: Boolean(said), unseen: false, issues: [] };
  if (/^UNSEEN\b/i.test(said)) return { clear: false, unseen: true, issues: [] };
  const issues = [];
  for (const raw of said.split("\n")) {
    const line = raw.replace(/^[-*•\s]+/, "").trim();
    if (!line || /^ALL CLEAR\b/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 3 && /^(MAJOR|MINOR|BLOCKER)$/i.test(parts[0])) {
      const severity = /^MINOR$/i.test(parts[0]) ? "minor" : "major";
      issues.push({ severity, where: parts[1], problem: parts[2], fix: parts[3] ?? "", from: "look" });
    } else {
      const where = /^((?:slide|page)\s+\d+)\s*[:,-]\s*/i.exec(line);
      issues.push({
        severity: "major",
        where: where ? where[1] : "",
        problem: where ? line.slice(where[0].length) : line,
        fix: "",
        from: "look",
      });
    }
  }
  return { clear: issues.length === 0, unseen: false, issues };
}

/* --------------------------------------------------------------------------
   2. What code measured, as faults
   -------------------------------------------------------------------------- */

/* "Slide 3: the text ... runs past the bottom of its box." */
export function measuredFaults(problems = []) {
  return problems.map((line) => {
    const m = /^((?:slide|page)\s+\d+)\s*:\s*(.+)$/i.exec(String(line));
    return { severity: "major", where: m ? m[1] : "", problem: m ? m[2] : String(line), fix: "", from: "measure" };
  });
}

export function wordCount(markdown) {
  return String(markdown ?? "")
    .split("\n")
    .filter((l) => !/^\s*:::\s*(style|image)\b/i.test(l) && !/^\s*\|?\s*-{3,}/.test(l))
    .join(" ")
    .replace(/:::\s*[a-z]+/gi, " ")
    .replace(/[#*_`|>:[\]]/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/* A PDF longer than the pages they asked for. The file has already been
   rebuilt once with tighter spacing (pdf.js), so this is the words. */
export function pageFault(pages, ceiling, markdown) {
  if (!Number.isFinite(ceiling) || ceiling < 1 || !(pages > ceiling)) return null;
  const words = wordCount(markdown);
  const target = Math.max(60, Math.floor((words * ceiling) / pages * 0.9));
  return {
    severity: "major",
    where: "Whole document",
    problem: `it runs to ${pages} pages and must fit on ${ceiling === 1 ? "one page" : `${ceiling} pages`}`,
    fix: `cut it from about ${words} words to about ${target}, keeping every agreed point and the close; a list or table can become one line, a design block can go`,
    from: "measure",
    target,
  };
}

/* Only faults worth a round trip: everything measured, and what the eye
   marked MAJOR. */
export function faultsToFix(faults = []) {
  return faults.filter((f) => f.from === "measure" || f.severity === "major");
}

/* --------------------------------------------------------------------------
   3. What goes back to the writer
   -------------------------------------------------------------------------- */

export function reviseRequest(markdown, faults, { format = "pdf", round = 1 } = {}) {
  const lines = faults.map((f, i) =>
    `${i + 1}. ${f.where ? `${f.where}: ` : ""}${f.problem}${f.fix ? `. Fix: ${f.fix}` : ""}`);
  return [
    `This is round ${round} of fixing the ${format === "pptx" ? "slide deck" : "document"} below. It was drawn and checked, and these are the faults:`,
    "",
    ...lines,
    "",
    "THE DRAFT",
    "",
    String(markdown ?? ""),
  ].join("\n");
}

/* --------------------------------------------------------------------------
   4. Putting the changed sections in place

   The writer answers with the sections it changed, each starting with its
   own "## " heading, exactly as in the draft. A reply that starts with
   "# " is the whole document again and replaces the draft. A heading that
   is not in the draft is ignored, so nothing new can be slipped in.
   -------------------------------------------------------------------------- */

function splitSections(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const head = [];
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m && !/^###/.test(line)) {
      current = { key: keyOf(m[1]), lines: [line] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      head.push(line);
    }
  }
  return { head, sections };
}

function keyOf(heading) {
  return String(heading).replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function trimEnd(lines) {
  const out = [...lines];
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

export function applyRevision(draft, reply) {
  const text = String(reply ?? "").replace(/^```(?:markdown)?\s*\n?|\n?```\s*$/g, "").trim();
  if (!text) return { markdown: draft, changed: [] };
  if (/^#\s+\S/.test(text)) {
    /* The whole document again. Kept only if it still has a title and at
       least one section, so a reply that went wrong cannot wipe the draft. */
    const whole = splitSections(text);
    if (!whole.sections.length && splitSections(draft).sections.length) return { markdown: draft, changed: [] };
    return { markdown: text, changed: ["whole"] };
  }
  const base = splitSections(draft);
  const incoming = splitSections(text).sections;
  const changed = [];
  for (const section of incoming) {
    const at = base.sections.findIndex((s) => s.key === section.key);
    if (at < 0) continue;
    const gap = base.sections[at].lines.length - trimEnd(base.sections[at].lines).length;
    base.sections[at] = { key: section.key, lines: [...trimEnd(section.lines), ...Array(Math.max(gap, 1)).fill("")] };
    changed.push(section.lines[0].replace(/^##\s+/, "").replace(/[*_`]/g, "").trim());
  }
  if (!changed.length) return { markdown: draft, changed: [] };
  const markdown = trimEnd([...base.head, ...base.sections.flatMap((s) => s.lines)]).join("\n");
  return { markdown, changed };
}

/* --------------------------------------------------------------------------
   5. What was fixed

   A fault counts as fixed when, after the round, nothing is wrong in the
   same place. Faults with no place (a whole document fault) are fixed when
   the same kind of fault is gone.
   -------------------------------------------------------------------------- */

function placeOf(fault) {
  return String(fault.where ?? "").trim().toLowerCase();
}

export function fixedSince(before = [], after = []) {
  const stillWrong = new Set(after.map(placeOf));
  const pageStill = after.some((f) => /must fit on/.test(f.problem));
  return before.filter((f) => {
    if (/must fit on/.test(f.problem)) return !pageStill;
    const place = placeOf(f);
    if (!place) return !after.some((a) => a.problem === f.problem);
    return !stillWrong.has(place);
  });
}

/* The green line for a fault that was put right. */
export function fixedLine(fault) {
  if (/must fit on/.test(fault.problem)) {
    return `Fixed: it ran over the pages you asked for, so it was tightened to fit.`;
  }
  const where = fault.where ? `${fault.where}, ` : "";
  return `Fixed: ${where}${lowerFirst(fault.problem).replace(/\.$/, "")}.`;
}

/* The amber line for a fault still there after the last round. */
export function stillLine(fault) {
  const problem = String(fault.problem ?? "").replace(/\.$/, "");
  return fault.where ? `${fault.where}: ${problem}.` : `${upperFirst(problem)}.`;
}

function lowerFirst(s) {
  const t = String(s ?? "");
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
}

function upperFirst(s) {
  const t = String(s ?? "");
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
