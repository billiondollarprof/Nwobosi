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
import { saveBlob } from "./download.js";
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

/* `charts` is the Map from docs/charts/chartPictures.js. A table that is
   a chart's numbers gets the chart's picture beside it. Excel has no way
   to be handed a native chart from here, so the picture shows the chart
   and the cells stay live numbers anybody can sum or re-chart. */
export async function sheetBlob(title, markdown, theme = THEME, charts = null) {
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
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${theme.accent}` } };
      cell.alignment = { vertical: "middle" };
    });

    const firstDataRow = headerAt + 1;
    table.rows.forEach((row, r) => {
      const read = row.map(readCell);
      const added = sheet.addRow(read.map((c) => c.value));
      /* A TOTAL ROW IS A FORMULA, NOT A TYPED NUMBER, 2026-09-23. A row
         whose first cell says "Total" gets a real SUM over the rows above
         it in every number column. So when somebody changes a figure the
         total changes with it, which is what a spreadsheet is for. The
         value the model wrote is kept as the formula's cached result, so
         the file shows the right number even before it is recalculated. */
      const isTotal = /^total/i.test(String(row[0] ?? "").trim()) && r > 0;
      added.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = isTotal ? { ...font, bold: true } : font;
        const fill = isTotal ? theme.accentTint : r % 2 === 1 ? THEME.zebra : null;
        if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fill}` } };
        cell.border = isTotal
          ? { top: { style: "thin", color: { argb: `FF${theme.accent}` } }, bottom: { style: "double", color: { argb: `FF${theme.accent}` } } }
          : { bottom: { style: "thin", color: { argb: `FF${THEME.rule}` } } };
        const c = read[col - 1];
        if (c?.format) cell.numFmt = c.format;
        if (isTotal && col > 1 && typeof c?.value === "number") {
          const letter = sheet.getColumn(col).letter;
          cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${added.number - 1})`, result: c.value };
        }
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
      /* The header gets room for the filter arrow Excel draws beside it. */
      const longest = Math.max(
        String(head ?? "").length + 4,
        ...table.rows.map((r) => String(r[i] ?? "")).map((text) => text.length + (text.includes(".") ? 0 : 3)),
      );
      sheet.getColumn(i + 1).width = Math.min(Math.max(longest + 4, 12), 60);
    });

    sheet.autoFilter = { from: { row: headerAt, column: 1 }, to: { row: headerAt, column: table.header.length } };

    const picture = table.chartIndex !== undefined ? charts?.get(table.chartIndex) : null;
    if (picture) {
      const id = book.addImage({ base64: picture.png, extension: "png" });
      /* One empty column after the table, then the chart, at the header's
         row. 520 pixels wide keeps it readable without swamping the sheet. */
      sheet.addImage(id, {
        tl: { col: table.header.length + 1, row: headerAt - 1 },
        ext: { width: 520, height: Math.round((picture.height / picture.width) * 520) },
      });
    }

    /* PRINTS PROPERLY WITHOUT ANYBODY SETTING IT UP. Fits the width of one
       page, turns sideways when the table is wide, and repeats the header
       row at the top of every printed page. */
    sheet.pageSetup = {
      orientation: table.header.length > 5 ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      printTitlesRow: `${headerAt}:${headerAt}`,
    };
    sheet.headerFooter = { oddFooter: `&L${title}&RPage &P of &N` };
    sheet.views = [{ state: "frozen", ySplit: headerAt, showGridLines: false }];
  });

  const buffer = await book.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* The blob is built by sheetBlob so Google Drive can be sent the identical
   file. This only saves it. */
export async function downloadXlsx(title, markdown, company) {
  const { buildFile } = await import("./download.js");
  const { blob, filename } = await buildFile("xlsx", title, markdown, company);
  saveBlob(blob, filename);
}
