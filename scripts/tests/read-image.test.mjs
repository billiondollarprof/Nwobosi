/* Proves the base64 helper read-image actually ships, not a copy of it.

   The trap it exists for is real and this checks that too: the obvious
   one line version throws on a picture sized array, so if somebody ever
   "simplifies" this back, the first assertion below is the one that
   catches them. */

import { build } from "esbuild";
import { readFileSync, unlinkSync } from "node:fs";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const out = "/tmp/base64.built.mjs";
await build({
  entryPoints: ["supabase/functions/_shared/base64.ts"],
  outfile: out,
  bundle: true,
  format: "esm",
  platform: "neutral",
});

const { toBase64 } = await import(out + "?t=" + Date.now());
unlinkSync(out);

const big = new Uint8Array(2 * 1024 * 1024);
for (let i = 0; i < big.length; i += 1) big[i] = i % 256;

let naiveThrew = false;
try { btoa(String.fromCharCode(...big)); } catch { naiveThrew = true; }
check("the one line version really does throw on a 2MB picture", naiveThrew);

const mine = toBase64(big);
check("the shipped one survives 2MB", mine.length > 0);
check("and matches Node's own base64 byte for byte", mine === Buffer.from(big).toString("base64"));

check("an empty array is an empty string", toBase64(new Uint8Array(0)) === "");
const small = new Uint8Array([72, 105]);
check("and a tiny one is still right", toBase64(small) === Buffer.from(small).toString("base64"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
