/* Stands in for src/shared/convert/converterApi.js in the harness.
   window.__CONVERTER says how the exact converter answers:
     unset      "not_set_up", so the browser converts it itself
     "exact"    answers with the file the real converter service made from
                the same fixture (scripts/__harness/fixtures), so the word
                check runs against real LibreOffice and pdf2docx output
     "down"     "unreachable"
   Harness only. */

export async function askConverter(file, to) {
  const mode = window.__CONVERTER;
  if (mode === "down") return { ok: false, state: "unreachable", reason: "" };
  if (mode !== "exact") return { ok: false, state: "not_set_up", reason: "The exact converter is not set up." };
  const made = to === "pdf" ? "/fixtures/engagement.pdf" : "/fixtures/engagement-exact.docx";
  const response = await fetch(made);
  const type = to === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return { ok: true, blob: new Blob([await response.arrayBuffer()], { type }) };
}
