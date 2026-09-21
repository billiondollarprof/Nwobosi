/* ==========================================================================
   A FEW AT A TIME

   Runs a list of jobs with a fixed number in flight, and never more.

   WHY NOT Promise.all
   Ten pictures fired at a model together is how a rate limit and a bill
   arrive at the same moment. Three at a time is quick enough that nobody
   is waiting and slow enough to behave under load.

   WHY NOT ONE AT A TIME
   Anthony, 2026-09-21: "it takes multiple but analyzes one at a time." The
   tenth file used to start its life after nine round trips nobody was
   watching.

   WHAT IT PROMISES
     - never more than `atOnce` running at the same moment
     - every job is started exactly once
     - one job throwing never stops the others, and never rejects this
     - `onDone` fires once per finished job, for a counter on screen

   It resolves when every job has settled. It is deliberately tiny and has
   its own test, because a scheduler that looks right and is not is the
   kind of bug that only shows up on somebody else's slow connection.
   ========================================================================== */

export async function inBatches(jobs, atOnce, onDone) {
  const running = Math.max(1, Math.min(atOnce, jobs.length));
  let next = 0;

  async function worker() {
    while (next < jobs.length) {
      const mine = next;
      next += 1;
      try {
        await jobs[mine]();
      } catch {
        /* A job that throws is the job's problem. Swallowed here so one
           unreadable file in a batch of ten never stops the other nine. */
      }
      onDone?.(mine);
    }
  }

  await Promise.all(Array.from({ length: running }, () => worker()));
}
