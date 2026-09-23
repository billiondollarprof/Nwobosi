/* A REFUSAL THAT RETRYING CANNOT FIX MUST NOT SAY "TRY AGAIN".

   Anthony, 2026-09-23. The Anthropic balance ran dry. Every call came back
   400, and the screen said "The assistant could not finish that. Try
   again." So he tried again, four times, and pasted three log lines that
   were all the same 44 seconds. The message was the fault: it asked him to
   do the one thing that could not possibly help, and it hid the one fact he
   needed, which was that somebody had to pay a bill.

   What this pins down:

     1. The pattern matches the REAL error text, copied out of his log
        rather than invented here. If Anthropic rewords it, this fails
        loudly instead of going quiet, which is the whole point.
     2. The refusal is only for the two that never fix themselves. A rate
        limit or a busy provider keeps the old "try again" line, because
        there it is true.
     3. No vendor name reaches the person. Which company runs the model is
        plumbing, and plumbing does not appear on a screen a staff member
        reads. The operator gets it in the log line above. */

import { readFileSync } from "node:fs";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const server = readFileSync("supabase/functions/assistant/index.ts", "utf8");

/* The real line, exactly as his log had it. */
const REAL = '400 {"type":"error","error":{"type":"invalid_request_error",' +
  '"message":"Your credit balance is too low to access the Anthropic API. ' +
  'Please go to Plans & Billing to upgrade or purchase credits."}}';

const pattern = server.match(/if \(status === 400 && (\/[^/]+\/[a-z]*)\.test\(said\)\)/)?.[1];
check(`the out of credit pattern is found in the source (${pattern})`, Boolean(pattern));
check("IT MATCHES THE REAL ERROR TEXT from the log",
  Boolean(pattern) && new RegExp(pattern.slice(1, pattern.lastIndexOf("/")), pattern.slice(pattern.lastIndexOf("/") + 1)).test(REAL));

check("a wrong or revoked key is named too, and is not a retry either",
  /if \(status === 401 \|\| status === 403\)/.test(server));

const fn = server.slice(server.indexOf("function providerRefusal"));
const body = fn.slice(0, fn.indexOf("\n}") + 2);
check("the refusal never names the vendor", !/Anthropic|anthropic/.test(body.replace(/credit balance is too low/, "")));
check("it tells the person it was not their doing", /not something you did/.test(body));
check("it tells them nothing they wrote was lost", /Nothing you wrote has been lost/.test(body));

check("a rate limit or a busy provider still gets the old line, which is true there",
  /return null;/.test(body) && /The assistant could not finish that\. Try again\./.test(server));
check("the catch asks the refusal FIRST and only falls back to the generic line",
  /reason: providerRefusal\(err\) \?\? "The assistant could not finish that\. Try again\.",/.test(server));
check("the real reason is still written to the log for the operator",
  /console\.error\("anthropic call failed", err\);/.test(server));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
