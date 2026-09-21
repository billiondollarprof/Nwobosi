/* The scheduler behind uploading several files at once.

   A scheduler that looks right and is not is the kind of bug that only
   turns up on somebody else's slow connection, so every promise it makes
   is checked here: the ceiling really is a ceiling, every job runs once,
   and one job throwing never takes the others with it. */

import { inBatches } from "../../src/shared/inBatches.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 1. Never more than three at a time, and all ten run. */
let live = 0, peak = 0;
const ran = [];
await inBatches(
  Array.from({ length: 10 }, (_, i) => async () => {
    live += 1;
    peak = Math.max(peak, live);
    await wait(5 + (i % 3) * 4);
    ran.push(i);
    live -= 1;
  }),
  3,
);
check("never more than three run at the same time", peak === 3);
check("and it really did run three at a time, not one", peak > 1);
check("every job ran", ran.length === 10);
check("each one exactly once", new Set(ran).size === 10);

/* 2. A job that throws does not take the batch with it. */
const survived = [];
let threw = false;
try {
  await inBatches(
    [
      async () => { survived.push(0); },
      async () => { throw new Error("unreadable file"); },
      async () => { survived.push(2); },
      async () => { survived.push(3); },
    ],
    2,
  );
} catch { threw = true; }
check("one job throwing does not reject the whole batch", !threw);
check("and the other three still ran", survived.join(",") === "0,2,3");

/* 3. The counter fires once per finished job. */
let done = 0;
await inBatches(Array.from({ length: 5 }, () => async () => {}), 2, () => { done += 1; });
check("the counter fires once per job", done === 5);

/* 4. Edges. */
let over = 0, overPeak = 0;
await inBatches(
  Array.from({ length: 2 }, () => async () => { over += 1; overPeak = Math.max(overPeak, over); await wait(3); over -= 1; }),
  10,
);
check("asking for more slots than jobs is fine", overPeak === 2);

await inBatches([], 3);
check("an empty list finishes rather than hanging", true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
