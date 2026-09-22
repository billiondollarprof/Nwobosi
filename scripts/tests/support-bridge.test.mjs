/* ANSWERING ON THE DOOR THEY KNOCKED ON.

   Anthony, 2026-09-22: "only email when in escalation no direct back to
   Whatsapp."

   A customer asks on WhatsApp, waits, and the answer used to arrive in an
   email inbox they may never have given us. Worse: when there was no email
   at all, support-reply refused outright, so a member of staff wrote a real
   answer and the box threw it away.

   WHY THIS IS WORTH A TEST. The two halves live in two different Supabase
   projects and cannot be run together here. Nothing else in this repo would
   notice if the order flipped back to email first, if the fallback quietly
   disappeared, or if the shared secret stopped being sent. All three are the
   kind of fault that looks like nothing until a customer is ignored.

   So this reads the shipped function and holds it to the shape. */

import { readFileSync } from "node:fs";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const reply = readFileSync("supabase/functions/support-reply/index.ts", "utf8");
const amara = readFileSync("supabase/amara-functions/support-whatsapp-send.ts", "utf8");

/* --------------------------------------------------------------------------
   1. WHATSAPP IS TRIED FIRST, EMAIL IS THE FALLBACK
   -------------------------------------------------------------------------- */

const waAt = reply.indexOf("await sendWhatsApp(");
const mailAt = reply.indexOf("await sendEmail(");

check("support-reply can send on WhatsApp at all", waAt > 0);
check("it still knows how to send an email", mailAt > 0);
check("WHATSAPP IS TRIED BEFORE EMAIL", waAt > 0 && mailAt > 0 && waAt < mailAt);
check("and only for a thread that came in on WhatsApp",
  /thread\.channel === "whatsapp" && thread\.customer_ref/.test(reply));

/* The phone number has to be read out of the row, or there is nothing to
   send to. It was not in the select before today. */
check("the thread's phone number is actually selected",
  /\.select\("id, company_id, customer_email, customer_name, channel, customer_ref"\)/.test(reply));

/* --------------------------------------------------------------------------
   2. A REPLY IS NEVER SILENTLY THROWN AWAY

   The old code refused a WhatsApp thread outright. The new one has to end
   in exactly one of: sent on WhatsApp, sent by email, or a reason the staff
   member can act on.
   -------------------------------------------------------------------------- */

check("a closed 24 hour window is explained in plain words",
  /24 hours of their last message/.test(reply));
check("and it says what to do about it", /reply to reopen it/.test(reply));
check("no email and no WhatsApp still answers with a reason",
  /left no email address, so there is nowhere to send a reply/.test(reply));
check("the screen is told which door it went out of",
  /sentBy: wentBy/.test(reply) && /fellBack:/.test(reply));

/* --------------------------------------------------------------------------
   3. A DEPLOYMENT WITH NO BRIDGE STILL WORKS

   Most companies will never wire WhatsApp up. They must not start seeing
   WhatsApp errors because this was added.
   -------------------------------------------------------------------------- */

check("no bridge configured falls through rather than throwing",
  /reason: "not_configured"/.test(reply));
check("an unreachable bridge is caught, not thrown",
  /reason: "unreachable"/.test(reply));

/* --------------------------------------------------------------------------
   4. THE SECRET IS SENT, AND CHECKED THE SAFE WAY
   -------------------------------------------------------------------------- */

check("StellaXafe sends the shared secret", /"x-support-secret": secret/.test(reply));
check("and reads it from a secret, never a literal",
  /Deno\.env\.get\("SUPPORT_BRIDGE_SECRET"\)/.test(reply));

check("Amara checks the secret before reading the body",
  amara.indexOf("sameSecret(") < amara.indexOf("await req.json()"));
check("the check is constant time, so it cannot be guessed one character at a time",
  /diff \|= given\.charCodeAt\(i\) \^ expected\.charCodeAt\(i\)/.test(amara) &&
  !/given === expected/.test(amara));
check("Amara refuses when no secret is configured, rather than letting anyone in",
  /bridge_not_configured/.test(amara));

/* --------------------------------------------------------------------------
   5. META'S 24 HOUR RULE IS NAMED, NOT GUESSED AT

   131047 is Meta saying the window has closed. Without recognising it, a
   normal, expected refusal reads as a broken system.
   -------------------------------------------------------------------------- */

check("Amara recognises Meta's closed window code", /131047/.test(amara));
check("and hands back window_closed rather than a raw error", /'window_closed'/.test(amara));

/* The phone shape has to match what Amara sends to, or the message goes to
   a number nobody is holding and the send still succeeds. */
check("the phone is normalised the same way Amara does it everywhere else",
  /if \(d\.startsWith\('234'\)\) return d/.test(amara));

/* Amara must not write the message into its own tables. The conversation
   lives in StellaXafe, and two homes means no record. */
check("Amara writes no copy of the reply", !/\.from\('admin_messages'\)\.insert/.test(amara));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
