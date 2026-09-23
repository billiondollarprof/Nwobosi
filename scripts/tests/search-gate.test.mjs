/* THE SEARCH GATE IS HARD WIRED.

   Anthony, 2026-09-23: "the check points are hard wired, must take
   permission before searching the Internet."

   The server refuses the research stage unless the person's last message
   is exactly the words the "Yes, go and look" button sends. If the chat
   and the server ever disagree on those words, searching breaks without
   anybody noticing, so this checks they are the same, and that the tools
   are only ever attached on that one stage. */

import { readFileSync } from "node:fs";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const server = readFileSync("supabase/functions/assistant/index.ts", "utf8");
const chat = readFileSync("src/pages/Chat.jsx", "utf8");

const serverWords = server.match(/last\.content\.trim\(\) === "([^"]+)"/)?.[1];
check(`the server checks for the person's yes (${serverWords})`, Boolean(serverWords));
check("THE CHAT SENDS EXACTLY THOSE WORDS when they press yes",
  chat.includes(`content: "${serverWords}" }`) && chat.includes(`{ role: "user", content: "${serverWords}" }`));
check("a research request without them is refused, not quietly allowed",
  /if \(!saidYes\) \{[\s\S]{0,200}return json\(\{ ok: false/.test(server));
check("the web tools are attached on the research stage only",
  /const searchTools = stage === "research"\s*\?/.test(server) && (server.match(/tools: searchTools/g) ?? []).length === 1);
check("the gate runs before any tool is attached",
  server.indexOf("if (!saidYes)") > 0 && server.indexOf("if (!saidYes)") < server.indexOf("const searchTools"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
