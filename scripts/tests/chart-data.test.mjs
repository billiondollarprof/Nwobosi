/* CHARTS ARE READ AND CHECKED BY CODE, NEVER GUESSED.

   DOCUMENT-HARNESS.md, section 4. What the model writes as a table becomes
   numbers here. These checks hold the promises the header of
   src/shared/docs/charts/chartData.js makes: a cell that is not a number is
   never read as zero, histogram buckets are counted by code and add up to
   the values given, bars start at zero, and a bad chart says why.
*/

import { readNumber, chartData, histogramBins, niceTicks, formatNumber } from "../../src/shared/docs/charts/chartData.js";
import { chartSvg } from "../../src/shared/docs/charts/chartSvg.js";
import { readDocument } from "../../src/shared/docs/documentModel.js";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name}`); }
}

/* 1. NUMBERS */
check("₦85,000 is 85000 in naira", readNumber("₦85,000").value === 85000 && readNumber("₦85,000").currency === "₦");
check("12.5% is 12.5 per cent", readNumber("12.5%").value === 12.5 && readNumber("12.5%").percent);
check("(1,200) is minus 1200", readNumber("(1,200)").value === -1200);
check("₦12.4m is 12,400,000", readNumber("₦12.4m").value === 12400000);
check("3.5bn is 3,500,000,000", readNumber("3.5bn").value === 3500000000);
check("a word is NOT a number, and is never read as zero", Number.isNaN(readNumber("about ten").value));
check("an empty cell is not zero either", Number.isNaN(readNumber("").value));

/* 2. A CHART THAT IS SOUND */
const col = chartData("column", ["Quarter", "2025", "2026"], [["Q1", "12.4", "14.1"], ["Q2", "13", "15.6"]]);
check("columns: names, and one series per column", col.categories.join() === "Q1,Q2" && col.series.length === 2 && col.series[1].values.join() === "14.1,15.6");
check("columns: no problem", col.problem === "");
check("a word the model might use is understood (donut)", chartData("donut", ["a", "b"], [["x", "1"]]).kind === "doughnut");

/* 3. A CHART THAT IS NOT */
check("a word in a number cell stops the chart, and says which",
  /"lots"/.test(chartData("column", ["a", "b"], [["x", "lots"]]).problem));
check("a pie below zero is refused", /below zero/.test(chartData("pie", ["a", "b"], [["x", "3"], ["y", "-1"]]).problem));
check("a pie of several series is refused", /one set of numbers/.test(chartData("pie", ["a", "b", "c"], [["x", "1", "2"]]).problem));
check("an unknown kind is refused", /not a kind of chart/.test(chartData("radar-3d", ["a", "b"], [["x", "1"]]).problem));
check("a chart with a problem is not drawn", chartSvg(chartData("pie", ["a", "b"], [["x", "-1"]]), undefined) === "");

/* 4. HISTOGRAM BUCKETS, COUNTED BY CODE */
const values = Array.from({ length: 60 }, (_, i) => 18 + ((i * 37) % 47));
const bins = histogramBins(values);
check("histogram: every value lands in exactly one bucket", bins.reduce((sum, b) => sum + b.count, 0) === values.length);
check("histogram: buckets are on round edges", bins.every((b) => Number.isInteger(b.from) && (b.to - b.from) % 5 === 0));
check("histogram: between 5 and 12 buckets for 60 values", bins.length >= 5 && bins.length <= 12);
check("histogram: the biggest value is counted, not dropped", bins[bins.length - 1].to >= Math.max(...values));
const hist = chartData("histogram", ["Age"], values.map((v) => [String(v)]));
check("histogram chart: counts add up to the rows given", hist.series[0].values.reduce((a, b) => a + b, 0) === 60);

/* 5. AXES */
check("bars start at zero", niceTicks(40, 97)[0] === 0);
check("ticks cover the top value", niceTicks(0, 97).slice(-1)[0] >= 97);
check("big numbers are short on an axis", formatNumber(20000000, { currency: "₦" }, { short: true }) === "₦20M");

/* 6. THROUGH THE DOCUMENT */
const doc = readDocument("## A\n\n:::chart bar #rooms | Nights sold | Source: bookings\n| Room | Nights |\n| --- | --- |\n| Standard | 1,240 |\n| Suite | 410 |\n:::", "x");
const chart = doc.blocks.find((b) => b.type === "chart");
check("the document reads the chart with its caption, source and tag", chart && chart.caption === "Nights sold" && chart.source === "Source: bookings" && chart.tag === "rooms");
check("and keeps its table, for when it cannot be drawn", chart.table && chart.table.rows.length === 2);
check("and it draws", chartSvg(chart.data, undefined).startsWith("<svg"));
check("text in the drawing is escaped",
  chartSvg(chartData("column", ["a", "b"], [["<b>x</b>", "1"]]), undefined).includes("&lt;b&gt;"));
check("a phone sized drawing is its own size", chartSvg(chart.data, undefined, { width: 330, height: 270 }).includes('viewBox="0 0 330 270"'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
