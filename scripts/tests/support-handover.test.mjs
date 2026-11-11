/* THE HANDOVER IS SAID ONCE, NOT TWICE.

   THE BUG, on WhatsApp 2026-09-22. A customer asked Amara about company
   finances. It handed over, and this is what landed on their phone:

     I don't have access to Amara's financial information. That's something
     you'd need to speak to someone in the business about.

     Let me get someone to answer that properly. They will reply right here.

     Let me get someone to answer that properly. They will reply right here.
     Anything else I can help with in the meantime? If it is something
     private they may send it to your email instead, so keep an eye on your
     inbox as well.

   WHY IT HAPPENED, and it is a loop rather than a typo. The whole reply,
   including the handover the function appends, is written into the thread.
   That thread is the history handed to the model next time. So the model
   reads the company's promise sitting in what looks like its own voice,
   learns the pattern, and writes it itself. Then the function appends it
   again.

   The prompt now names the sentence and tells it not to. That is the real
   fix, and it is a request. This is the guard underneath it, because a
   model drifts back and nobody would notice until a customer saw it again.

   The first check below is the exact text from that screenshot. */

import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BRAIN_IMPORT_RE, BRAIN_STUB } from "./_brain-stub.mjs";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const SOURCE = "supabase/functions/support-ask/index.ts";

/* The real function, with Deno.serve handing the handler over instead of
   listening and the remote imports cut out, so withoutOurLines below is the
   one that actually ships. */
const dir = mkdtempSync(join(tmpdir(), "handover-"));
await build({
  entryPoints: [SOURCE], outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});
let code = readFileSync(join(dir, "fn.mjs"), "utf8")
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = () => ({});")
  .replace(/import Anthropic from "[^"]+";/, "class Anthropic {}")
  .replace(/import "[^"]*edge-runtime[^"]*";/, "");
/* Exported for the test only. It is a pure string function, so exporting it
   changes nothing about how the function behaves. */
if (!/export function withoutOurLines/.test(code)) {
  code = code.replace("function withoutOurLines", "export function withoutOurLines");
}
code = code.replace(BRAIN_IMPORT_RE, BRAIN_STUB);
/* The support map comes from _shared/knowledgeMap.ts since 2026-11-11. It
   cannot resolve from the temp folder, and these checks are about the
   handover, so it is stubbed to an empty map. Its own test is
   knowledge-map.test.mjs. */
code = code.replace(/import \{ knowledgeMap \} from "[^"]+";/, 'const knowledgeMap = () => "";');
writeFileSync(join(dir, "fn2.mjs"), code);
globalThis.Deno = { serve: () => {}, env: { get: () => "" } };

const { withoutOurLines } = await import(join(dir, "fn2.mjs"));

/* --------------------------------------------------------------------------
   1. THE EXACT REPLY FROM THE SCREENSHOT
   -------------------------------------------------------------------------- */

const asSeen = `I don't have access to Amara's financial information. That's something you'd need to speak to someone in the business about.

Let me get someone to answer that properly. They will reply right here.`;

const cleaned = withoutOurLines(asSeen);

check("the real answer survives untouched",
  cleaned.includes("I don't have access to Amara's financial information"));
check("THE COPIED HANDOVER IS GONE",
  !cleaned.includes("Let me get someone to answer that properly"));
check("and so is the promise of a reply here",
  !cleaned.includes("They will reply right here"));
check("no blank paragraph left where it was", !/\n\n\n/.test(cleaned));
check("it does not end on a dangling blank line", cleaned === cleaned.trim());

/* --------------------------------------------------------------------------
   2. THE OTHER LINES THIS FILE WRITES

   The prompt asks the model to end every reply with an offer of more help,
   and the handover asks that too. On an escalation turn that is two in
   three lines.
   -------------------------------------------------------------------------- */

check("the closing question is taken out too",
  !withoutOurLines("Here is the answer. Anything else I can help with in the meantime?")
    .includes("Anything else I can help with"));
check("the live inbox sentence is taken out",
  !withoutOurLines("Fine. If it is something private they may send it to your inbox instead, so keep an eye there as well.")
    .includes("keep an eye there"));
check("the new email ask is taken out",
  !withoutOurLines("Sure. You can drop your email as well, just in case they need to reach you directly.")
    .includes("drop your email"));
check("and so is the new handover opening",
  !withoutOurLines("Let me get someone from the team to look at this properly. They will reply right here.").trim());
check("case does not matter",
  !withoutOurLines("LET ME GET SOMEONE TO ANSWER THAT PROPERLY. THEY WILL REPLY RIGHT HERE.")
    .includes("ANSWER THAT PROPERLY"));

/* --------------------------------------------------------------------------
   3. IT NEVER CUTS INTO A REAL ANSWER

   A support answer with a hole in it is worse than one that repeats itself,
   so this only ever removes sentences the function itself wrote.
   -------------------------------------------------------------------------- */

const real = "Our office is open 9 to 5, Monday to Friday. Delivery takes 3 working days.";
check("an ordinary answer is returned exactly as it was", withoutOurLines(real) === real);

const similar = "Someone will look at your order today.";
check("a sentence that merely sounds similar is left alone", withoutOurLines(similar) === similar);

check("nothing at all comes back as an empty string",
  withoutOurLines("") === "" && withoutOurLines(null) === "" && withoutOurLines(undefined) === "");
check("a reply that was ONLY our line comes back empty, so the caller adds one clean copy",
  withoutOurLines("Let me get someone to answer that properly. They will reply right here.") === "");

/* --------------------------------------------------------------------------
   4. THE PROMPT NAMES THE SENTENCE

   Stripping is the guard. The prompt is the fix, and it has to name the
   exact words: "do not promise a colleague" is advice, and this is a fact
   about who writes what.
   -------------------------------------------------------------------------- */

const src = readFileSync(SOURCE, "utf8");
check("the prompt names the sentence the model must not write",
  /NEVER write\s+\\?"Let me get someone to answer that properly/.test(src));

/* --------------------------------------------------------------------------
   5. THE EMAIL IS ASKED FOR AT THE HANDOVER, NOT ON ARRIVAL

   Anthony, 2026-09-22: "somebody is just coming for the first time to
   message. You're asking them for their email."

   Nobody should have to hand over an address to ask a question. The ask
   moved to the first moment it is actually true that somebody might need to
   reach them, which is when a person is coming.
   -------------------------------------------------------------------------- */

check("the first message no longer appends the old invitation",
  !/reply = `\$\{reply\}\\n\\n\$\{EMAIL_INVITE\}`/.test(src));
check("but the old invitation is still recognised, for threads that carry it",
  /EMAIL_INVITE,/.test(src));
check("the handover asks for the email instead",
  /const HANDOVER_ASK_EMAIL =/.test(src));
check("and only when there is not one already",
  /customerEmail \? HANDOVER_INBOX_LINE : HANDOVER_ASK_EMAIL/.test(src));

/* --------------------------------------------------------------------------
   6. THE CLOSING QUESTION IS THE LAST PARAGRAPH, ON ITS OWN

   Anthony: "Anything else I can help with in the meantime is supposed to be
   the last paragraph in that message." It used to be glued onto the end of
   the handover sentence, so a promise, an ask and a question ran together
   as one block. Three short paragraphs are read. One long one is skimmed.
   -------------------------------------------------------------------------- */

check("the handover is built as three paragraphs",
  /\$\{HANDOVER_OPEN\}\\n\\n\$\{middle\}\\n\\n\$\{HANDOVER_CLOSE\}/.test(src));
check("the closing question is its own constant, not glued to the promise",
  /const HANDOVER_CLOSE = "Anything else I can help with in the meantime\?";/.test(src));
check("the promise does not carry the question with it",
  !/HANDOVER_OPEN[\s\S]{0,200}Anything else I can help/.test(src));

/* Every retired wording stays recognisable, or the duplicate comes straight
   back on any thread that existed before the wording changed. */
check("the retired handover is still stripped",
  !withoutOurLines("Let me get someone to answer that properly. They will reply right here.").trim());
check("the retired inbox line is still stripped",
  !withoutOurLines("If it is something private they may send it to your email instead, so keep an eye on your inbox as well.").trim());
check("the retired invitation is still stripped",
  !withoutOurLines("You may share your email address here, as we may prefer to send any sensitive information directly to your inbox.").trim());
check("and says the app adds it instead", /The app adds that promise itself/.test(src));
check("the strip runs BEFORE the handover is appended",
  src.indexOf("const answerOnly = withoutOurLines(reply)") < src.indexOf("`${answerOnly}"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
