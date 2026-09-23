/* ==========================================================================
   THE SPREADSHEET

   Turns the tables inside the finished work into a real Excel file, in the
   browser, with nothing uploaded anywhere.

   WHAT A SPREADSHEET IS FOR, AND WHAT IT IS NOT
   ---------------------------------------------
   It is for the numbers. A report's prose does not belong in a spreadsheet
   and putting it there produces a column of sentences nobody can sort,
   filter or add up. So this writes the TABLES and nothing else.

   THE CONSEQUENCE, SAID OUT LOUD: a document with no table in it produces
   no spreadsheet. That is correct, and the button that calls this has to
   say so rather than handing somebody an empty file. An empty spreadsheet
   looks like a bug and sends people hunting for the failure.

   NUMBERS ARE WRITTEN AS NUMBERS
   ------------------------------
   A cell holding the text "74.1%" cannot be summed, averaged or charted,
   which is the entire reason somebody wanted a spreadsheet rather than the
   PDF they already have. Anything that reads as a number is written as
   one, with the formatting kept as a display format, so the cell still
   LOOKS like 74.1% and still BEHAVES like 0.741.

   Anything ambiguous stays text. A wrong number is worse than a number
   somebody has to convert.

   READ TOP TO BOTTOM
     1. Reading one cell
     2. Writing the file
   ========================================================================== */

import { toTables } from "./structure.js";
import { slugForFile } from "./download.js";
import { THEME } from "./docs/documentTheme.js";

/* --------------------------------------------------------------------------
   SECTION 1: Reading one cell

   Returns what to write and how it should look. Deliberately conservative:
   it only claims a cell is a number when it is unmistakably one.
   -------------------------------------------------------------------------- */

export function readCell(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { value: "", format: null };

  /* A percentage. Stored as the fraction, shown with the sign, so it adds
     up correctly and still reads the way it was written. */
  const percent = text.match(/^([+-]?[\d,]*\.?\d+)\s*%$/);
  if (percent) {
    const n = Number(percent[1].replace(/,/g, ""));
    /* Rounded, because 69.2 / 100 is 0.6920000000000001 in binary floating
       point. It DISPLAYS as 69.2% either way, so this is not about the
       screen. It is about the person who clicks the cell to check the
       number and finds fourteen digits of noise in the formula bar, in a
       product whose whole argument is that its numbers are exact. */
    if (Number.isFinite(n)) return { value: Math.round(n * 1e10) / 1e12, format: "0.0%" };
  }

  /* Money. The symbol becomes a display format so the cell is still a
     number. Only the symbols somebody in this product actually types. */
  const money = text.match(/^([£$€₦])\s*([+-]?[\d,]*\.?\d+)$/);
  if (money) {
    const n = Number(money[2].replace(/,/g, ""));
    /* Decimals only when they were written. "₦124,200" shown as
       "₦124,200.00" is wider than the column was measured for, which is
       exactly how a cell came out as ##### on 2026-09-23. */
    if (Number.isFinite(n)) {
      return { value: n, format: money[2].includes(".") ? `"${money[1]}"#,##0.00` : `"${money[1]}"#,##0` };
    }
  }

  /* A plain number, with or without thousands separators. */
  const plain = text.match(/^[+-]?[\d,]*\.?\d+$/);
  if (plain) {
    const n = Number(text.replace(/,/g, ""));
    /* The separator check matters: "2026" is a number, and so is "1,240".
       But a row of digits with dashes in it is a reference, not a number,
       and Number() would have said NaN anyway. */
    if (!Number.isFinite(n)) return { value: text, format: null };
    /* Only give it a separator format if it arrived with separators, and
       only give it decimals if it arrived with a decimal point. "1,240"
       shown as "1,240.00" is two digits nobody asked for. */
    if (!text.includes(",")) return { value: n, format: null };
    return { value: n, format: text.includes(".") ? "#,##0.00" : "#,##0" };
  }

  return { value: text, format: null };
}

/* --------------------------------------------------------------------------
   SECTION 2: Writing the file
   -------------------------------------------------------------------------- */

/* Excel refuses these in a tab name, and it refuses a name over 31
   characters. A file that will not open is the worst possible outcome
   here, so the name is scrubbed rather than trusted. */
function tabName(name, index) {
  const cleaned = String(name || "")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || `Table ${index + 1}`;
}

export async function downloadXlsx(title, markdown) {
  const tables = toTables(markdown);
  if (!tables.length) {
    /* Named so the caller can tell this apart from a real failure and say
       something useful, rather than showing "could not build that file"
       for a document that simply had no table in it. */
    const err = new Error("no tables in this document");
    err.code = "no_tables";
    throw err;
  }

  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const book = new ExcelJS.Workbook();
  book.created = new Date();

  const used = new Set();

  tables.forEach((table, index) => {
    /* Two sections called "The numbers" would collide, and Excel rejects
       the whole file rather than the one sheet. */
    let name = tabName(table.name, index);
    let suffix = 2;
    while (used.has(name.toLowerCase())) {
      name = `${tabName(table.name, index).slice(0, 28)} ${suffix}`;
      suffix += 1;
    }
    used.add(name.toLowerCase());

    const sheet = book.addWorksheet(name, { properties: { defaultRowHeight: 18 } });
    const font = { name: THEME.officeFont, size: 11, color: { argb: `FF${THEME.body}` } };

    /* THE SAME LOOK AS THE OTHER FILES, 2026-09-23. A title row with the
       document's name and the table's name, a gap, then the table with an
       accent header, a filter on it, and a soft stripe on every other row.
       The table itself stays one clean block, so sorting and filtering it
       work exactly as anybody expects. */
    const titleRow = sheet.addRow([title]);
    titleRow.font = { ...font, size: 15, bold: true, color: { argb: `FF${THEME.ink}` } };
    titleRow.height = 24;
    if (table.name && table.name !== title) {
      const sub = sheet.addRow([table.name]);
      sub.font = { ...font, color: { argb: `FF${THEME.muted}` } };
    }
    sheet.addRow([]);

    const header = sheet.addRow(table.header);
    const headerAt = header.number;
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { ...font, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${THEME.accent}` } };
      cell.alignment = { vertical: "middle" };
    });

    table.rows.forEach((row, r) => {
      const read = row.map(readCell);
      const added = sheet.addRow(read.map((c) => c.value));
      added.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = font;
        if (r % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${THEME.zebra}` } };
        cell.border = { bottom: { style: "thin", color: { argb: `FF${THEME.rule}` } } };
        const c = read[col - 1];
        if (c?.format) cell.numFmt = c.format;
      });
    });

    /* Numbers line up on the right, so their header does too. */
    table.header.forEach((_, i) => {
      const allNumbers = table.rows.length > 0 && table.rows.every((row) => typeof readCell(row[i]).value === "number");
      if (allNumbers) sheet.getCell(headerAt, i + 1).alignment = { vertical: "middle", horizontal: "right" };
    });

    /* Columns sized to what the cell SHOWS, which is wider than what was
       typed once a number format adds separators. A sheet that opens
       showing ##### is a sheet somebody has to fix before they can read it. */
    table.header.forEach((head, i) => {
      const longest = [head ?? "", ...table.rows.map((r) => r[i] ?? "")]
        .reduce((most, text) => Math.max(most, String(text).length + (String(text).includes(".") ? 0 : 3)), 0);
      sheet.getColumn(i + 1).width = Math.min(Math.max(longest + 4, 12), 60);
    });

    sheet.autoFilter = { from: { row: headerAt, column: 1 }, to: { row: headerAt, column: table.header.length } };
    sheet.views = [{ state: "frozen", ySplit: headerAt, showGridLines: false }];
  });

  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugForFile(title)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
