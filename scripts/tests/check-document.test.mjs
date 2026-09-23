/* THE CHECKER (src/shared/docs/checkDocument.js, DOCUMENT-HARNESS.md 5).
   Totals are added up by code, skip means skip, and a number found in
   none of the allowed material is listed, while numbers that are there,
   written another way, are not. */

import { fixTotals, stripPictures, briefSaysNoPictures, numbersNotInSources } from "../../src/shared/docs/checkDocument.js";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name}`); }
}

const table = (rows) => ["| Item | Cost |", "| --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

/* TOTALS */
const wrong = fixTotals(table([["Rooms", "₦120,000"], ["Food", "₦45,500"], ["Total", "₦170,000"]]));
check("a wrong total is replaced by the real one", wrong.markdown.includes("| Total | ₦165,500 |"));
check("and the staff is told", wrong.findings.length === 1 && /₦170,000/.test(wrong.findings[0]));
const right = fixTotals(table([["Rooms", "120,000"], ["Food", "45,500"], ["Total", "165,500"]]));
check("a right total is left exactly as it was", right.findings.length === 0 && right.markdown.includes("| Total | 165,500 |"));
const rounded = fixTotals(table([["A", "1.25"], ["B", "2.26"], ["Total", "3.5"]]));
check("a total rounded to how it was written is not 'wrong'", rounded.findings.length === 0);
const bold = fixTotals(table([["A", "10"], ["B", "20"], ["**Total**", "**40**"]]));
check("a bold total stays bold when it is corrected", bold.markdown.includes("| **Total** | **30** |"));
const pct = fixTotals(table([["A", "40%"], ["B", "50%"], ["Total", "100%"]]));
check("a column of percentages is not added up", pct.findings.length === 0);
const scaled = fixTotals(table([["Q1", "₦12.4m"], ["Q2", "₦13.0m"], ["Total", "₦26.4m"]]));
check("₦12.4m + ₦13.0m is put right as ₦25.4m", scaled.markdown.includes("₦25.4m"));
const words = fixTotals(table([["A", "about ten"], ["B", "20"], ["Total", "30"]]));
check("a column with words in it is left alone", words.findings.length === 0);

/* SKIP MEANS SKIP */
check("the brief's 'Pictures: none' is seen", briefSaysNoPictures("Sections...\nPictures: none\n"));
check("and a brief with pictures is not", !briefSaysNoPictures("Pictures: lobby.jpg on the cover"));
const stripped = stripPictures("## A\n:::image lobby.jpg | The lobby\nText.");
check("picture blocks are taken out, the text stays", stripped.removed === 1 && stripped.markdown === "## A\nText.");

/* NUMBERS */
const doc = "A room is ₦85,000. Occupancy rose 12% and hit 74.1%. Revenue ₦12.4m. It opened on 2026-09-23 in Q3 with 3 floors.";
const allowed = "Rate card ₦85,000. Occupancy 74.1 per cent is 0.741? no: 74.1%. Revenue 12,400,000 naira.";
const found = numbersNotInSources(doc, allowed);
const listed = found.unfound.map((u) => u.number);
check("an invented number is listed", listed.includes("12%"));
check("a number in the sources is not", !listed.includes("₦85,000"));
check("a number written another way in the sources is not (₦12.4m = 12,400,000)", !listed.includes("₦12.4m"));
check("a date is not a claim", !listed.some((n) => /2026|09|23/.test(n)));
check("Q3 and '3 floors' are not listed", !listed.some((n) => n === "3"));
check("each is given with the words around it", found.unfound.every((u) => u.near.includes(u.number)));
const totals = numbersNotInSources(table([["A", "10"], ["Total", "999"]]), "10");
check("a Total row is not listed (the totals check covers it)", !totals.unfound.some((u) => u.number === "999"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
