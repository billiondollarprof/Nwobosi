/* Stands in for src/shared/assistantApi.js in the harness.

   sendTurn does not call anything. It reads the next scripted reply for
   the stage it was asked for off window.__SCRIPT, streams it, and ends the
   turn. That makes the chat's state machine testable on its own: the exact
   text a model would return, without a model, a key, or a network.

   window.__TURNS records every stage that ran, in order, so a test can
   assert that the work actually moved forward rather than going in a
   circle. Harness only. */

export { toApiMessages } from "../../src/shared/assistantApi.js";

export function sendTurn({ stage = "orient", onMeta, onText, onDone }) {
  window.__TURNS = window.__TURNS || [];
  window.__TURNS.push(stage);

  const queue = (window.__SCRIPT && window.__SCRIPT[stage]) || [];
  const reply = queue.length > 1 ? queue.shift() : (queue[0] ?? "(nothing scripted)");
  const stopReason = window.__STOP_REASON || "end_turn";

  /* window.__HANG holds the turn open so the thinking line can be looked
     at. Without it the stub answers in 30ms and the state nobody can see
     is the state nobody can screenshot. */
  const wait = window.__HANG ? 60000 : 30;

  setTimeout(() => {
    onMeta?.({ tier: "standard", stage });
    onText?.(reply);
    onDone?.({ stopReason });
  }, wait);

  return () => {};
}
