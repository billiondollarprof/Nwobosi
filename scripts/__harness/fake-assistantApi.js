/* Stands in for src/shared/assistantApi.js in the harness.

   sendTurn does not call anything. It reads the next scripted reply for
   the stage it was asked for off window.__SCRIPT, streams it, and ends the
   turn. That makes the chat's state machine testable on its own: the exact
   text a model would return, without a model, a key, or a network.

   window.__TURNS records every stage that ran, in order, so a test can
   assert that the work actually moved forward rather than going in a
   circle. Harness only. */

export { toApiMessages } from "../../src/shared/assistantApi.js";

export function sendTurn({ stage = "orient", messages = [], onMeta, onText, onDone, onError, onRetry }) {
  window.__TURNS = window.__TURNS || [];
  window.__TURNS.push(stage);
  /* What each stage was actually sent, so a walk can check the model was
     told something, not just that the screen shows it. */
  window.__SENT = window.__SENT || [];
  window.__SENT.push({ stage, messages });

  /* A TURN THAT FAILS, WHICH THIS STUB COULD NOT DO BEFORE.

     Added 2026-09-23. Every route in here ended in onDone, so a walk could
     only ever see turns that finished. The failure that took Anthony's
     search away was a turn that threw, and the screen's answer to a thrown
     turn was the one thing nobody could walk. That is why the missing
     permission card went unnoticed.

     window.__ERRORS sets it per stage:

       window.__ERRORS = { research: { reason: "stream", message: "..." } }

     Same shape the real onError receives, so the page cannot tell the
     difference. */
  const failure = window.__ERRORS && window.__ERRORS[stage];
  if (failure) {
    setTimeout(() => {
      onMeta?.({ tier: "standard", stage });
      onError?.(failure);
    }, 30);
    return () => {};
  }

  const queue = (window.__SCRIPT && window.__SCRIPT[stage]) || [];
  const reply = queue.length > 1 ? queue.shift() : (queue[0] ?? "(nothing scripted)");
  /* window.__STOP_REASONS sets how ONE stage ends, so a walk can cut off
     the document without cutting off everything before it. */
  const stopReason =
    (window.__STOP_REASONS && window.__STOP_REASONS[stage]) || window.__STOP_REASON || "end_turn";

  /* window.__HANG holds the turn open so the thinking line can be looked
     at. Without it the stub answers in 30ms and the state nobody can see
     is the state nobody can screenshot. */
  const wait = window.__HANG ? 60000 : 30;

  /* window.__RETRY_SHOWN shows the "trying again" line, as the real
     sendTurn does when its first try fails before any words. */
  if (window.__RETRY_SHOWN) setTimeout(() => onRetry?.(), 10);

  setTimeout(() => {
    onMeta?.({ tier: "standard", stage });
    onText?.(reply);
    onDone?.({ stopReason });
  }, wait);

  return () => {};
}
