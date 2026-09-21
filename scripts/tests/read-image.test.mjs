/* Proves the base64 helper that read-image ACTUALLY SHIPS, by importing it
   out of the function's own file rather than testing a copy of it.

   The trap it exists for is real, and the first assertion checks that too:
   the obvious one line version throws on a picture sized array. If anybody
   ever simplifies it back, this is what stops them. */

import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const dir = mkdtempSync(join(tmpdir(), "read-image-"));
await build({
  entryPoints: ["supabase/functions/read-image/index.ts"],
  outfile: join(dir, "fn.mjs"),
  format: "esm", platform: "neutral", bundle: false,
});

/* Deno.serve hands the handler over instead of listening, and the two
   remote imports are cut out. Same shape as the canva tests. */
let code = readFileSync(join(dir, "fn.mjs"), "utf8");
code = code
  .replace(/import \{ createClient \} from "[^"]+";/, "const createClient = () => ({});")
  .replace(/import Anthropic from "[^"]+";/, "class Anthropic {}")
  .replace(/import "[^"]*edge-runtime[^"]*";/, "");
writeFileSync(join(dir, "fn2.mjs"), code);

globalThis.Deno = { serve: () => {}, env: { get: () => "" } };

const { toBase64 } = await import(join(dir, "fn2.mjs"));

const big = new Uint8Array(2 * 1024 * 1024);
for (let i = 0; i < big.length; i += 1) big[i] = i % 256;

let naiveThrew = false;
try { btoa(String.fromCharCode(...big)); } catch { naiveThrew = true; }
check("the one line version really does throw on a 2MB picture", naiveThrew);

const mine = toBase64(big);
check("the shipped one survives 2MB", mine.length > 0);
check("and matches Node's own base64 byte for byte", mine === Buffer.from(big).toString("base64"));
check("an empty picture is an empty string", toBase64(new Uint8Array(0)) === "");

const small = new Uint8Array([72, 105]);
check("and a tiny one is still right", toBase64(small) === Buffer.from(small).toString("base64"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
