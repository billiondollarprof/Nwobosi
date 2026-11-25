/* The time estimate (src/shared/stageTimes.js). Anthony, 2026-11-22 and
   2026-11-25: show how long each stage takes, and say so plainly when it
   runs long. */
import assert from "node:assert/strict";
import {
  DEFAULT_MS, recordStageTime, estimateMs, buildEstimateMs, isOverdue, formatDuration, timeHint, OVERDUE_LINE,
} from "../../src/shared/stageTimes.js";

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

let n = 0;
const t = (name, fn) => { fn(); n += 1; };

t("starting guesses until three runs", () => {
  const s = memory();
  assert.equal(estimateMs("research", s), DEFAULT_MS.research);
  recordStageTime("research", 40000, s);
  recordStageTime("research", 50000, s);
  assert.equal(estimateMs("research", s), DEFAULT_MS.research);
  recordStageTime("research", 60000, s);
  assert.equal(estimateMs("research", s), 50000);
});
t("the middle of the last ten, so one odd run does not swing it", () => {
  const s = memory();
  for (const ms of [10000, 11000, 12000, 300000]) recordStageTime("brief", ms, s);
  assert.equal(estimateMs("brief", s), 11500);
});
t("only the last ten are kept", () => {
  const s = memory();
  for (let i = 1; i <= 15; i += 1) recordStageTime("generate", i * 1000, s);
  assert.equal(estimateMs("generate", s), 10500);
});
t("nonsense times are ignored", () => {
  const s = memory();
  for (const ms of [100, NaN, 25 * 60 * 1000]) recordStageTime("orient", ms, s);
  assert.equal(estimateMs("orient", s), DEFAULT_MS.orient);
});
t("broken storage never breaks a turn", () => {
  const bad = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
  recordStageTime("orient", 5000, bad);
  assert.equal(estimateMs("orient", bad), DEFAULT_MS.orient);
  assert.equal(estimateMs("orient", null), DEFAULT_MS.orient);
  const junk = { getItem: () => "{not json", setItem: () => {} };
  assert.equal(estimateMs("orient", junk), DEFAULT_MS.orient);
});
t("a build adds the look only for PDF and slides", () => {
  const s = memory();
  const base = DEFAULT_MS.brief + DEFAULT_MS.generate;
  assert.equal(buildEstimateMs("docx", s), base);
  assert.equal(buildEstimateMs("pdf", s), base + DEFAULT_MS.look);
  assert.equal(buildEstimateMs("pptx", s), base + DEFAULT_MS.look);
});
t("overdue means well past, not just past", () => {
  assert.equal(isOverdue(41000, 40000), false);
  assert.equal(isOverdue(59000, 40000), false);
  assert.equal(isOverdue(61000, 40000), true);
  assert.equal(isOverdue(20000, 10000), false, "at least fifteen seconds over");
  assert.equal(isOverdue(26000, 10000), true);
});
t("durations read like a person would say them", () => {
  assert.equal(formatDuration(15000), "15s");
  assert.equal(formatDuration(42000), "40s");
  assert.equal(formatDuration(1000), "5s");
  assert.equal(formatDuration(90000), "1½ min");
  assert.equal(formatDuration(125000), "2 min");
  assert.equal(formatDuration(185000), "3 min");
  assert.equal(formatDuration(30000 * 3), "1½ min");
});
t("the hint: estimate first, then progress, then just the time", () => {
  assert.equal(timeHint(1000, 40000), "about 40s");
  assert.equal(timeHint(12000, 40000), "12s of about 40s");
  assert.equal(timeHint(75000, 40000), "75s");
});
t("the overdue line asks for patience, with no dash", () => {
  assert.match(OVERDUE_LINE, /taking longer than usual/);
  assert.match(OVERDUE_LINE, /bear with me/);
  assert.ok(!/[–—]/.test(OVERDUE_LINE));
});

console.log(`stage times: ${n} passed`);
