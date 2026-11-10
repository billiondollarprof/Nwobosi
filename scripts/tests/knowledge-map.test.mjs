/* THE KNOWLEDGE MAP SAYS ONLY WHAT IS THERE.

   supabase/functions/_shared/knowledgeMap.ts builds the short page that the
   assistant reads first and the admin sees on the Knowledge screen. These
   checks hold it to its header: real headings only, plain words, and the
   brand colour's origin said plainly, with our blue when nothing was found.

   Built with esbuild so it runs on any Node, with or without type stripping. */

import { build } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

const dir = mkdtempSync(join(tmpdir(), "kmap-"));
await build({ entryPoints: ["supabase/functions/_shared/knowledgeMap.ts"], outfile: join(dir, "m.mjs"), format: "esm", platform: "neutral" });
const { knowledgeMap, sectionsOf, brandLine, wordsIn } = await import(join(dir, "m.mjs"));

const pricing = "# Amara pricing\nSome words here.\n## Partner rates\nMore words.\nPAYMENT TERMS\nNet 30.\nContact:\nhello@example.com\n## Partner rates\nRepeated.";
const sections = sectionsOf(pricing);
check("Markdown headings are sections", sections.includes("Amara pricing") && sections.includes("Partner rates"));
check("a short line in capitals is a section", sections.includes("PAYMENT TERMS"));
check("a short line ending in a colon is a section", sections.includes("Contact"));
check("a heading is listed once", sections.filter((s) => s === "Partner rates").length === 1);
check("an ordinary sentence is not a section", !sections.some((s) => s.startsWith("Some words")));
check("no more than eight sections", sectionsOf(Array.from({ length: 20 }, (_, i) => `# Part ${i}`).join("\n")).length === 8);

check("words are counted", wordsIn("one two  three\nfour") === 4);
check("no colour means our blue", /StellaXafe blue/.test(brandLine({ colour: "" })));
check("a colour with its origin", brandLine({ colour: "#20b255", from: "Amara brand guide" }) === "Brand colour: #20B255, found in Amara brand guide.");
check("a colour with no recorded origin still says uploads", /found in their uploads/.test(brandLine({ colour: "#20B255" })));

const map = knowledgeMap([
  { name: "Amara pricing", description: "Partner prices", kind: "file", text: pricing },
  { name: "Logo", description: "The logo", kind: "image", text: "" },
  { name: "Website", description: "Home page", kind: "link", location: "https://example.com", text: "word ".repeat(1240) },
], { colour: "#20B255", from: "Logo" });
check("the map counts the sources", map.includes("3 sources"));
check("each source has a line with its kind", map.includes("- Amara pricing (file,") && map.includes("- Logo (picture,") && map.includes("- Website (web page,"));
check("a size is rounded, never a raw count", map.includes("about 1,200 words"));
check("a web page says where it lives", map.includes("from https://example.com"));
check("what it holds is said", map.includes("Holds: Partner prices"));
check("sections are listed", map.includes("Sections: Amara pricing; Partner rates"));
check("the brand line is in the map", map.includes("Brand colour: #20B255, found in Logo."));
check("no technical words", !/token|chunk|embedding|vector|character/i.test(map));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
